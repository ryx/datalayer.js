/* eslint-disable max-len */
import {
  AttributionEngine,
  LastTouchAttributionModel,
  SearchEngineChannel,
  ReferrerMatchingChannel,
  URLMatchingChannel,
  initAttribution,
  getAttributedChannel,
  getConfig,
  getTouchpoints,
  handleSearchEngineTypeChannel,
  getQueryParam,
  resetAttribution,
  storageRead,
  storageWrite,
  Touchpoint,
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

  describe('URLMatchingChannel', () => {
    beforeEach(() => {
      setDocumentReferrer('');
    });

    it('should recognize a touchpoint based on a string match and extract the correct value', () => {
      setDocumentLocation('http://example.com?adword=/foo/bar/123&foo=bar&bla=blubb');
      const channel = new URLMatchingChannel('sea', 'SEA (adwords)', 'adword', 'adword');

      expect(channel.execute()).toBeInstanceOf(Touchpoint);
    });

    it('should NOT recognize a touchpoint based on a string match for unknown channels', () => {
      setDocumentLocation('http://example.com?furz=/foo/bar/123&foo=bar&bla=blubb');
      const channel = new URLMatchingChannel('sea', 'SEA (adwords)', 'adword', 'adword');

      expect(channel.execute()).toBe(null);
    });

    it('should recognize a "match" touchpoint based on a string match and URL-decode the extracted value', () => {
      setDocumentLocation('http://example.com?adword=%2Ffoo%2Fbar%2F123&foo=bar&bla=blubb');
      const channel = new URLMatchingChannel('sea', 'SEA (adwords)', 'adword', 'adword');

      const touchpoint = channel.execute();

      expect(touchpoint.getValue()).toEqual('/foo/bar/123');
      expect(touchpoint.getChannel().getId()).toEqual('sea');
    });

    it('should recognize a "match" touchpoint based on a RegExp match and extract the correct value', () => {
      setDocumentLocation('http://example.com?emsrc=aff1&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');
      const channel = new URLMatchingChannel('aff1', 'Affiliate 1', /(^|&|\?)emsrc=aff1($|&)/ig, 'refID');

      const touchpoint = channel.execute();

      expect(touchpoint.getValue()).toEqual('partner/some/campaign/name_123');
      expect(touchpoint.getChannel().getId()).toEqual('aff1');
      expect(touchpoint.getChannel().getLabel()).toEqual('Affiliate 1');
    });

    it('should recognize a "match" touchpoint based on an object literal key/value comparison', () => {
      setDocumentLocation('http://example.com?emsrc=aff2&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');
      const channel = new URLMatchingChannel('aff2', 'Affiliate 2', { emsrc: 'aff2' }, 'refID');

      const touchpoint = channel.execute();

      expect(touchpoint.getValue()).toEqual('partner/some/campaign/name_123');
      expect(touchpoint.getChannel().getId()).toEqual('aff2');
      expect(touchpoint.getChannel().getLabel()).toEqual('Affiliate 2');
    });


    it('should recognize a "match" touchpoint based on a key/value comparison for the existence of a value', () => {
      setDocumentLocation('http://example.com?emsrc=aff4&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');
      const channel = new URLMatchingChannel('aff3', 'Affiliate 3', { emsrc: true }, 'refID');

      const touchpoint = channel.execute();

      expect(touchpoint.getValue()).toEqual('partner/some/campaign/name_123');
      expect(touchpoint.getChannel().getId()).toEqual('aff3');
      expect(touchpoint.getChannel().getLabel()).toEqual('Affiliate 3');
    });

    it('should recognize a "match" touchpoint based on a key/value comparison for the non-existence of a value', () => {
      setDocumentLocation('http://example.com?refID=partner/some/campaign/name_123&foo=bar&bla=blubb');
      const channel = new URLMatchingChannel('aff4', 'Affiliate 4', { emsrc: false }, 'refID');

      const touchpoint = channel.execute();

      expect(touchpoint.getValue()).toEqual('partner/some/campaign/name_123');
      expect(touchpoint.getChannel().getId()).toEqual('aff4');
      expect(touchpoint.getChannel().getLabel()).toEqual('Affiliate 4');
    });

    it('should recognize a "match" touchpoint based on an object literal key/value comparison with multiple values', () => {
      setDocumentLocation('http://example.com?emsrc=aff6&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');
      const channel = new URLMatchingChannel('aff5', 'Affiliate 5', { emsrc: 'aff6', foo: 'bar', bla: 'blubb' }, 'refID');

      const touchpoint = channel.execute();

      expect(touchpoint.getValue()).toEqual('partner/some/campaign/name_123');
      expect(touchpoint.getChannel().getId()).toEqual('aff5');
      expect(touchpoint.getChannel().getLabel()).toEqual('Affiliate 5');
    });

    describe('return values', () => {
      let touchpoint;

      beforeEach(() => {
        setDocumentLocation('http://example.com?adword=/foo/bar/123&foo=bar&bla=blubb');
        const channel = new URLMatchingChannel('sea', 'SEA (adwords)', 'adword', 'adword');
        touchpoint = channel.execute();
      });

      it('should recognize a channel and return the expected Touchpoint object', () => {
        expect(touchpoint).toBeInstanceOf(Touchpoint);
      });

      it('should return a Touchpoint with the correct value for the campaign name', () => {
        expect(touchpoint.getValue()).toBe('/foo/bar/123');
      });

      it('should return a Touchpoint with the correct Channel', () => {
        expect(touchpoint.getChannel().getLabel()).toBe('SEA (adwords)');
        expect(touchpoint.getChannel().getId()).toBe('sea');
      });

      it('should return a Touchpoint with the correct Channel', () => {
        expect(touchpoint.getChannel().getLabel()).toBe('SEA (adwords)');
        expect(touchpoint.getChannel().getId()).toBe('sea');
      });
    });
  });

  describe('ReferrerMatchingChannel', () => {
    beforeEach(() => {
      setDocumentReferrer('');
      setDocumentLocation('http://somewhere.com');
    });

    it('should recognize a "referrer" touchpoint based on a RegExp match', () => {
      setDocumentReferrer('https://somedomain.example.com/foo/bar/?foo=bar&bla=blubb');
      const channel = new ReferrerMatchingChannel('internal', 'Internal', /\.example\.com(\/|\?|$)/ig);

      const touchpoint = channel.execute();

      expect(touchpoint.getChannel().getId()).toEqual('internal');
    });

    it('should recognize a "referrer" touchpoint based on an array of RegExp matches', () => {
      setDocumentReferrer('https://somedomain.example.com/foo/bar/?foo=bar&bla=blubb');
      const channel = new ReferrerMatchingChannel('internal', 'Internal', [/foo\.bar\.com/ig, /\.example\.com(\/|\?|$)/ig]);

      const touchpoint = channel.execute();

      expect(touchpoint.getChannel().getId()).toEqual('internal');
    });

    it('should recognize a "referrer" touchpoint based on a callback function returning true', () => {
      setDocumentReferrer('https://somedomain.example.com/foo/bar/?foo=bar&bla=blubb');
      const channel = new ReferrerMatchingChannel('internal', 'Internal', str => !!str.match(/^https/ig));

      const touchpoint = channel.execute();

      expect(touchpoint.getChannel().getId()).toEqual('internal');
    });

    it('should NOT recognize a "referrer" touchpoint based on a callback function returning false', () => {
      setDocumentReferrer('https://somedomain.example.com/foo/bar/?foo=bar&bla=blubb');
      const channel = new ReferrerMatchingChannel('internal', 'Internal', str => !!str.match(/^thiswontmatch/ig));

      expect(channel.execute()).toEqual(null);
    });
  });

  describe('SearchEngineChannel', () => {
    beforeEach(() => {
      setDocumentReferrer('');
      setDocumentLocation('http://somewhere.com');
    });

    it('should recognize a "searchEngine" touchpoint based on a given referrer', () => {
      setDocumentReferrer('https://fooba.google.com/foo/bar/?foo=bar&bla=blubb');
      const channel = new SearchEngineChannel('seo', 'SEO');

      expect(channel.execute().getChannel().getId()).toEqual('seo');
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
        const channel = new SearchEngineChannel('seo', 'SEO');

        expect(channel.execute().getChannel().getId()).toEqual('seo');
      });
    });

    it('should ignore unsupported search engines', () => {
      setDocumentReferrer('https://someotherpage.foo.bar/foo/bar?q=foo');
      const channel = new SearchEngineChannel('seo', 'SEO');

      expect(channel.execute()).toEqual(null);
    });
  });

  describe('AttributionEngine', () => {
    it('should initialize with a given configuration and return the current channel', () => {
      setDocumentLocation('http://example.com?adword=/foo/bar/123&foo=bar&bla=blubb');
      const engine = new AttributionEngine(
        new LastTouchAttributionModel(60 * 60 * 24 * 30),
        [
          new URLMatchingChannel('sea', 'SEA (adwords)', 'adword', 'adword'),
        ],
        60 * 30, // 30min
        '__mcajs',
      );

      const touchpoint = engine.execute();

      expect(touchpoint).toBeInstanceOf(Touchpoint);
      expect(touchpoint.getChannel()).toBeInstanceOf(URLMatchingChannel);
      expect(touchpoint.getChannel().getId()).toBe('sea');
      expect(touchpoint.getChannel().getLabel()).toBe('SEA (adwords)');
      expect(touchpoint.getValue()).toBe('/foo/bar/123');
    });

    describe.skip('execute:', () => {
      // @TODO: test parameter handling and arguments

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

    describe('getTouchpointHistory:', () => {
      it('should return the recorded touchpoint history', () => {
        const engine = new AttributionEngine(
          new LastTouchAttributionModel(60 * 60 * 24 * 30),
          [
            new SearchEngineChannel('seo', 'SEO'),
            new URLMatchingChannel('aff', 'Affiliate', /(^|&|\?)emsrc=aff($|&)/ig, 'refID'),
          ]
        );
        // simulate multiple page calls
        setDocumentReferrer('https://fooba.google.com/foo/bar/?foo=bar&bla=blubb');
        engine.execute();
        setDocumentReferrer('');
        setDocumentLocation('http://example.com?emsrc=aff&refID=partner/some/campaign/name_123&foo=bar&bla=blubb');
        engine.execute();

        const touchpoints = engine.getTouchpointHistory();

        expect(touchpoints[0].getChannel().getId()).toEqual('seo');
        expect(touchpoints[1].getChannel().getId()).toEqual('aff');
        expect(touchpoints[1].getValue()).toEqual('partner/some/campaign/name_123');
      });
    });

    describe('execute:', () => {
      let engine;

      beforeEach(() => {
        engine = new AttributionEngine(
          new LastTouchAttributionModel(60 * 60 * 24 * 30),
          [
            new URLMatchingChannel('aff', 'Affiliate', { emsrc: 'aff' }, 'refID'),
            new URLMatchingChannel('dis', 'Display', { emsrc: 'dis' }, 'refID'),
            new URLMatchingChannel('foo', 'Affiliate', { emsrc: 'foo' }, 'refID', { canOverwrite: true }),
            new SearchEngineChannel('seo', 'SEO', { canOverwrite: true }),
          ],
          60 * 30, // expire session after 30min inactivity
          '__mcajs',
        );
      });

      // @XXX: multiple init calls shall simulate multiple page loads here

      it('should apply the correct attribution logic for: [match:aff]', () => {
        setDocumentLocation('http://example.com?emsrc=aff&refID=aff/some/campaign/name_123&foo=bar&bla=blubb');
        engine.execute();

        const touchpoints = engine.getAttributedTouchpoints();

        expect(touchpoints.length).toBe(1);
        expect(touchpoints[0]).toBeInstanceOf(Touchpoint);
        expect(touchpoints[0].getValue()).toEqual('aff/some/campaign/name_123');
        expect(touchpoints[0].getChannel().getId()).toEqual('aff');
      });

      it('should apply the correct attribution logic for: [match:aff, searchEngine:seo.canOverwrite]', () => {
        // build the touchpoint history first
        setDocumentLocation('http://example.com?emsrc=aff&refID=aff/some/campaign/name_123&foo=bar&bla=blubb');
        engine.execute();
        setDocumentLocation('http://example.com');
        setDocumentReferrer('http://www.google.de/foo/bar?foo=bar&bla=blubb');
        engine.execute();

        const touchpoints = engine.getAttributedTouchpoints();

        expect(touchpoints[0].getChannel().getId()).toEqual('seo');
      });

      it('should apply the correct attribution logic for: [match:aff, match:dis]', () => {
        setDocumentLocation('http://example.com?emsrc=aff&refID=aff_partner/some/campaign/name_123&foo=bar');
        currentTime = 123456799000;
        engine.execute();
        setDocumentLocation('http://example.com?emsrc=dis&refID=dis_partner/some/campaign/name_123&foo=bar');
        currentTime = 183456799000;
        engine.execute();

        const touchpoints = engine.getAttributedTouchpoints();

        expect(touchpoints[0].getChannel().getId()).toEqual('dis');
        expect(touchpoints[0].getValue()).toEqual('dis_partner/some/campaign/name_123');
      });

      it('should apply the correct attribution logic for: [match:foo.canOverwrite, match:dis]', () => {
        setDocumentLocation('http://example.com?emsrc=foo&refID=foo_partner/some/campaign/name_123&foo=bar');
        engine.execute();
        setDocumentLocation('http://example.com?emsrc=dis&refID=dis_partner/some/campaign/name_123&foo=bar');
        engine.execute();

        const touchpoints = engine.getAttributedTouchpoints();

        expect(touchpoints[0].getChannel().getId()).toEqual('foo');
        expect(touchpoints[0].getValue()).toEqual('foo_partner/some/campaign/name_123');
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
