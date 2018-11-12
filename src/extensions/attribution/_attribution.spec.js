/* eslint-disable max-len */
import {
  initAttribution,
  getAttributedChannel,
  getConfig,
  getTouchpoints,
  handleSearchEngineTypeChannel,
  getQueryParam,
  resetAttribution,
  storageRead,
  storageWrite,
} from './_attribution';

const { jsdom } = global;

// set window.document.referrer
function setDocumentReferrer(referrer) {
  Object.defineProperty(window.document, 'referrer', { value: referrer, configurable: true });
}

// set window.document.location.*
function setDocumentLocation(url) {
  jsdom.reconfigure({ url });
}

describe('ba/lib/attribution', () => {
  let [exampleConfig, currentTime, storageSpy] = [];

  beforeEach(() => {
    // config stub
    exampleConfig = {
      cookieName: 'gktp',
      touchpointLifetime: 60 * 60 * 24 * 30,
      channels: [],
      campaigns: [],
    };

    // mock getTime
    currentTime = 123456789000;
    global.Date = jest.fn(() => ({ getTime: () => currentTime }));

    // create local storage mock
    storageSpy = {
      setItem: jest.spyOn(Storage.prototype, 'setItem'),
      getItem: jest.spyOn(Storage.prototype, 'getItem'),
    };
  });

  afterEach(() => {
    // reset state and mocks
    resetAttribution();
    setDocumentLocation('http://example.com');
    setDocumentReferrer('');
    storageSpy.getItem.mockReturnValue('');
  });

  describe('init:', () => {
    it('should initialize with a given configuration and return the current channel', () => {
      setDocumentLocation('http://example.com?adword=/foo/bar/123&foo=bar&bla=blubb');
      exampleConfig.channels = [{
        name: 'sea', type: 'match', match: 'adword', value: 'adword',
      }];

      const touchpoint = initAttribution(exampleConfig);

      expect(touchpoint.c).toEqual('sea');
      expect(touchpoint.v).toEqual('/foo/bar/123');
    });

    it('should use the default config, if nothing else is provided', () => {
      initAttribution();

      expect(getConfig()).toEqual({
        cookieName: '__mcajs',
        touchpointLifetime: 60 * 60 * 24 * 30, // 30 days
        visitDuration: 60 * 30, // 30min
        channels: [],
      });
    });

    it('should use the overridden parameters, if local config is set', () => {
      initAttribution({ cookieName: 'foo', touchpointLifetime: 120 });

      expect(getConfig()).toEqual({
        cookieName: 'foo',
        touchpointLifetime: 120,
        visitDuration: 60 * 30, // 30min
        channels: [],
      });
    });

    it('should set a "last touch" timestamp in the data whenever init is called', () => {
      initAttribution(exampleConfig);

      expect(storageSpy.setItem).toHaveBeenCalledWith(
        exampleConfig.cookieName,
        expect.stringContaining(`"lt":${currentTime / 1000}`)
      );
    });

    it('should update a touchpoint for the first PI within a session, if "firstView" is set on the assoc. channel', () => {
      setDocumentReferrer('http://example.com/foo');
      exampleConfig.channels = [{
        name: 'foo', type: 'referrer', referrer: /example\.com\/foo/gi, firstView: true,
      }];

      initAttribution(exampleConfig);

      // the storage update should include a changed timestamp for the "foo" channel entry
      expect(storageSpy.setItem).toHaveBeenCalledWith(
        exampleConfig.cookieName,
        expect.stringContaining(`{"e":[{"c":"foo","t":${currentTime / 1000}}],"lt":${currentTime / 1000}}`)
      );
    });

    it('should NOT update an existing touchpoint for a repeat PI within a session, if "firstView" is set on the assoc. channel', () => {
      setDocumentReferrer('http://example.com/foo');
      exampleConfig.channels = [{
        name: 'foo', type: 'referrer', referrer: /example\.com\/foo/gi, firstView: true,
      }];
      // set last page impression for this channel to 30 seconds ago
      storageSpy.getItem.mockReturnValue('{"e":[{"c":"foo","t":123456759}],"lt":123456759}');

      initAttribution(exampleConfig);

      // the storage update should include an unchanged timestamp for the "foo" channel entry
      expect(storageSpy.setItem).toHaveBeenCalledWith(
        exampleConfig.cookieName,
        expect.stringContaining(`{"e":[{"c":"foo","t":123456759}],"lt":${currentTime / 1000}}`)
      );
    });

    it('should update an existing touchpoint for the first PI within a session, if "firstView" is set on the assoc. channel but visitDuration is exceeded', () => {
      setDocumentReferrer('http://example.com/foo');
      exampleConfig.visitDuration = 1800;
      exampleConfig.channels = [
        {
          name: 'foo1', type: 'referrer', referrer: /test\.com\/foo/gi,
        },
        {
          name: 'foo2', type: 'referrer', referrer: /example\.com\/foo/gi, firstView: true,
        },
      ];
      // set last page impression for this channel to 1900 seconds ago
      storageSpy.getItem.mockReturnValue('{"e":[{"c":"foo2","t":123454889}],"lt":123454889}');

      initAttribution(exampleConfig);

      // the storage update should include a changed timestamp for the "foo" channel entry
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        exampleConfig.cookieName,
        expect.stringContaining(`{"e":[{"c":"foo2","t":${currentTime / 1000}}],"lt":${currentTime / 1000}}`)
      );
    });
  });

  describe('channel recognition:', () => {
    describe('match:', () => {
      it('should recognize a "match" touchpoint based on a string match and extract the correct value', () => {
        setDocumentLocation('http://example.com?adword=/foo/bar/123&foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'sea', type: 'match', match: 'adword', value: 'adword',
          }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'sea', v: '/foo/bar/123' })
        );
      });

      it('should recognize a "match" touchpoint based on a string match and URL-decode the extracted value', () => {
        setDocumentLocation('http://example.com?adword=%2Ffoo%2Fbar%2F123&foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'sea', type: 'match', match: 'adword', value: 'adword',
          }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'sea', v: '/foo/bar/123' })
        );
      });

      it('should recognize a "match" touchpoint based on a RegExp match and extract the correct value', () => {
        setDocumentLocation('http://example.com?emsrc=aff1&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'aff1', type: 'match', match: /(^|&|\?)emsrc=aff1($|&)/ig, value: 'refID',
          }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'aff1', v: 'partner/some/campaign/name_123' })
        );
      });

      it('should recognize a "match" touchpoint based on an object literal key/value comparison', () => {
        setDocumentLocation('http://example.com?emsrc=aff2&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'aff2', type: 'match', match: { emsrc: 'aff2' }, value: 'refID',
          }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'aff2', v: 'partner/some/campaign/name_123' })
        );
      });

      it('should recognize a "match" touchpoint based on a key/value comparison for the existence of a value', () => {
        setDocumentLocation('http://example.com?emsrc=aff4&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'aff4', type: 'match', match: { emsrc: true }, value: 'refID',
          }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'aff4', v: 'partner/some/campaign/name_123' })
        );
      });

      it('should recognize a "match" touchpoint based on a key/value comparison for the non-existence of a value', () => {
        setDocumentLocation('http://example.com?refID=partner/some/campaign/name_123&foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'aff5', type: 'match', match: { emsrc: false }, value: 'refID',
          }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'aff5', v: 'partner/some/campaign/name_123' })
        );
      });

      it('should recognize a "match" touchpoint based on an object literal key/value comparison with multiple values', () => {
        setDocumentLocation('http://example.com?emsrc=aff6&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'aff6', type: 'match', match: { emsrc: 'aff6', foo: 'bar', bla: 'blubb' }, value: 'refID',
          }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'aff6', v: 'partner/some/campaign/name_123' })
        );
      });
    });

    describe('referrer:', () => {
      it('should recognize a "referrer" touchpoint based on a RegExp match', () => {
        setDocumentReferrer('https://somedomain.example.com/foo/bar/?foo=bar&bla=blubb');

        initAttribution({
          channels: [{ name: 'internal', type: 'referrer', referrer: /\.example\.com(\/|\?|$)/ig }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'internal' })
        );
      });

      it('should recognize a "referrer" touchpoint based on an array of RegExp matches', () => {
        setDocumentReferrer('https://somedomain.example.com/foo/bar/?foo=bar&bla=blubb');

        initAttribution({
          channels: [{ name: 'internal', type: 'referrer', referrer: [/foo\.bar\.com/ig, /\.example\.com(\/|\?|$)/ig] }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'internal' })
        );
      });

      it('should recognize a "referrer" touchpoint based on a callback function returning true', () => {
        setDocumentReferrer('https://somedomain.example.com/foo/bar/?foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'internal',
            type: 'referrer',
            referrer: str => !!str.match(/^https/ig),
          }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'internal' })
        );
      });

      it('should NOT recognize a "referrer" touchpoint based on a callback function returning false', () => {
        setDocumentReferrer('https://somedomain.example.com/foo/bar/?foo=bar&bla=blubb');

        initAttribution({
          channels: [{
            name: 'internal',
            type: 'referrer',
            referrer: str => !!str.match(/^thiswontmatch/ig),
          }],
        });

        expect(getTouchpoints()).toEqual([]);
      });
    });

    describe('searchEngine:', () => {
      it('should recognize a "searchEngine" touchpoint based on a given referrer', () => {
        setDocumentReferrer('https://fooba.google.com/foo/bar/?foo=bar&bla=blubb');

        initAttribution({
          channels: [{ name: 'seo', type: 'searchEngine' }],
        });

        expect(getTouchpoints()[0]).toEqual(
          expect.objectContaining({ c: 'seo' })
        );
      });

      it('should properly recognize all supported search engines', () => {
        [
          'google.com',
          'googlesyndication.com',
          'googleadservices.com',
          'naver.com',
          'bing.com',
          'yahoo.com',
          'yahoo.co.jp',
          'yandex.ru',
          'daum.net',
          'baidu.com',
          'myway.com',
          'ecosia.org',
          'ask.jp',
          'ask.com',
          'dogpile.com',
          'sogou.com',
          'seznam.cz',
          'aolsvc.de',
          'altavista.co',
          'altavista.de',
          'mywebsearch.com',
          'webcrawler.com',
          'wow.com',
          'infospace.com',
          'blekko.com',
          'docomo.ne.jp',
        ].forEach((url) => {
          setDocumentReferrer(`https://foo.${url}/foo/bar?q=foo`);

          const result = handleSearchEngineTypeChannel({ name: 'seo' });

          expect(result ? result.c : '').toEqual('seo');
        });
      });

      it('should ignore unsupported search engines', () => {
        setDocumentReferrer('https://someotherpage.foo.bar/foo/bar?q=foo');

        expect(handleSearchEngineTypeChannel({ name: 'seo' })).toEqual(null);
      });
    });
  });

  describe('getTouchpoints:', () => {
    it('should return the touchpoint history', () => {
      const channels = [
        { name: 'seo', type: 'searchEngine' },
        {
          name: 'aff', type: 'match', match: /(^|&|\?)emsrc=aff($|&)/ig, value: 'refID',
        },
      ];
      setDocumentReferrer('https://fooba.google.com/foo/bar/?foo=bar&bla=blubb');
      initAttribution({ channels });
      setDocumentReferrer('');
      setDocumentLocation('http://example.com?emsrc=aff&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');
      initAttribution({ channels });

      const touchpoints = getTouchpoints();

      expect(touchpoints[0].c).toEqual('seo');
      expect(touchpoints[1].c).toEqual('aff');
      expect(touchpoints[1].v).toEqual('partner/some/campaign/name_123');
    });
  });

  describe('attribution logic:', () => {
    beforeEach(() => {
      exampleConfig.channels = [
        {
          name: 'aff', type: 'match', match: { emsrc: 'aff' }, value: 'refID',
        },
        {
          name: 'dis', type: 'match', match: { emsrc: 'dis' }, value: 'refID',
        },
        {
          name: 'foo', type: 'match', match: { emsrc: 'foo' }, value: 'refID', canOverwrite: true,
        },
        {
          name: 'seo', type: 'searchEngine', canOverwrite: true,
        },
      ];
    });

    // @XXX: multiple init calls shall simulate multiple page loads here

    it('should apply the correct attribution logic for: [match:aff]', () => {
      setDocumentLocation('http://example.com?emsrc=aff&refID=aff/some/campaign/name_123&foo=bar&bla=blubb');

      initAttribution(exampleConfig);

      expect(getAttributedChannel()).toEqual(
        expect.objectContaining({ c: 'aff', v: 'aff/some/campaign/name_123' })
      );
    });

    it('should apply the correct attribution logic for: [match:aff, searchEngine:seo.canOverwrite]', () => {
      setDocumentLocation('http://example.com?emsrc=aff&refID=aff/some/campaign/name_123&foo=bar&bla=blubb');
      initAttribution(exampleConfig);

      setDocumentLocation('http://example.com');
      setDocumentReferrer('http://www.google.de/foo/bar?foo=bar&bla=blubb');
      initAttribution(exampleConfig);

      expect(getAttributedChannel()).toEqual(expect.objectContaining({ c: 'seo' }));
    });

    it('should apply the correct attribution logic for: [match:aff, match:dis]', () => {
      setDocumentLocation('http://example.com?emsrc=aff&refID=aff_partner/some/campaign/name_123&foo=bar');
      currentTime = 123456799000;

      initAttribution(exampleConfig);

      setDocumentLocation('http://example.com?emsrc=dis&refID=dis_partner/some/campaign/name_123&foo=bar');
      currentTime = 183456799000;

      initAttribution(exampleConfig);

      expect(getAttributedChannel()).toEqual(expect.objectContaining({ c: 'dis', v: 'dis_partner/some/campaign/name_123' }));
    });

    it('should apply the correct attribution logic for: [match:foo.canOverwrite, match:dis]', () => {
      setDocumentLocation('http://example.com?emsrc=foo&refID=foo_partner/some/campaign/name_123&foo=bar');

      initAttribution(exampleConfig);

      setDocumentLocation('http://example.com?emsrc=dis&refID=dis_partner/some/campaign/name_123&foo=bar');

      initAttribution(exampleConfig);

      expect(getAttributedChannel()).toEqual(expect.objectContaining({ c: 'foo', v: 'foo_partner/some/campaign/name_123' }));
    });

    it('should apply the correct attribution logic for: [match:foo.canOverwrite, searchEngine:seo.canOverwrite]', () => {
      setDocumentLocation('http://example.com?emsrc=foo&refID=foo_partner/some/campaign/name_123&foo=bar');

      initAttribution(exampleConfig);

      setDocumentLocation('http://example.com');
      setDocumentReferrer('http://www.google.de/foo/bar?foo=bar&bla=blubb');

      initAttribution(exampleConfig);

      expect(getAttributedChannel()).toEqual(expect.objectContaining({ c: 'seo' }));
    });

    it('should ignore touchpoints that are older than the defined lifetime', () => {
      exampleConfig.touchpointLifetime = 1000;
      storageSpy.getItem.mockReturnValue('{"e":[{ "c": "aff", "v": "some_aff_campaign", "t": 100000 }],"t":123}');

      initAttribution(exampleConfig);

      expect(getAttributedChannel()).toEqual(null);
    });

    /* it('should count a touchpoint with "firstView" attribute only on the first call', () => {
      const channel = { c: 'direct', t: new Date().getTime() - 10000 };
      exampleConfig.visitDuration = 1800;
      exampleConfig.channel.push({ name: 'direct', type: 'referrer', referrer: '', firstView: true });
      storageSpy.getItem.mockReturnValue(JSON.stringify({ e: [channel], t: 123 }));
      initAttribution(exampleConfig);
      assert.isNull(getAttributedChannel());
    }); */
  });

  describe('utility methods:', () => {
    describe('storageWrite:', () => {
      it('should encode the value as JSON, then uriEncode it and store it in the localStorage', () => {
        storageWrite('myKey', { foo: 'bar' });

        // expect(window.JSON.stringify).toHaveBeenCalledWith({ foo: 'bar' });
        expect(storageSpy.setItem).toHaveBeenCalledWith('myKey', '{"foo":"bar"}');
      });

      it('should fall back to cookies, if localStorage access throws an error', () => {
        storageSpy.setItem.mockImplementation(() => {
          throw new Error();
        });

        storageWrite('myKey', { foo: 'bar' });

        expect(window.document.cookie).toEqual('myKey={"foo":"bar"}');
      });
    });

    describe('storageRead:', () => {
      it('should first try to read the value from cookie and return it as parsed JSON object', () => {
        window.document.cookie = 'foo=bar; myKey={"foo":"bar"};path=/;';
        storageSpy.getItem.mockReturnValue('');

        expect(storageRead('myKey')).toEqual({ foo: 'bar' });
      });

      it('should use LocalStorage if cookie value is empty and return it as parsed JSON object', () => {
        window.document.cookie = 'foo=bar;';
        storageSpy.getItem.mockReturnValue('{"foo":"bar"}');

        expect(storageRead('myKey')).toEqual({ foo: 'bar' });
      });
    });

    describe('getQueryParam:', () => {
      it('should return the correct value if it is the only param (without leading ?)', () => {
        expect(getQueryParam('test', 'test=my%20Value_123')).toEqual('my%20Value_123');
      });

      it('should return the correct value if it is the only param (with leading ?)', () => {
        expect(getQueryParam('test', '?test=my%20Value_123')).toEqual('my%20Value_123');
      });

      it('should return the correct value if it is the first param of multiple params', () => {
        expect(getQueryParam('test', '?test=my%20Value_123&foo=bar&bla=blubb')).toEqual('my%20Value_123');
      });

      it('should return the correct value if it is in the middle of multiple params', () => {
        expect(getQueryParam('test', '?foo=bar&test=my%20Value_123&bla=blubb')).toEqual('my%20Value_123');
      });

      it('should return the correct value if it is the last of multiple params', () => {
        expect(getQueryParam('test', '?foo=bar&bla=blubb&test=my%20Value_123')).toEqual('my%20Value_123');
      });

      it('should work on from window.location.search the same way as if a second argument is provided', () => {
        setDocumentLocation('http://example.com?test=my%20Value_123');

        expect(getQueryParam('test')).toEqual('my%20Value_123');
      });
    });
  });
});
