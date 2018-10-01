/**
 * Append a given URL as new script tag to the document's HEAD
 *
 * @method addScript
 * @param  src   {String} URL of script to be added
 * @param  async {Boolean} set async attribute (yes/no)
 */
export function addScript(src, async = true) {
  const scriptEl = window.document.createElement('script');
  scriptEl.type = 'text/javascript';
  scriptEl.async = async;
  scriptEl.src = src;
  const headEl = window.document.getElementsByTagName('HEAD')[0];
  headEl.appendChild(scriptEl);
  return scriptEl;
}

/**
 * Add a given HTML string to a given element.
 *
 * @method addHTML
 * @param  element   {HTMLElement|String} element to add HTML to or CSS selector of element
 * @param  html      {String}      HTML string to add
 * @param  position  {String}      position to add to, defaults to "beforeend"
 *          (see https://developer.mozilla.org/de/docs/Web/API/Element/insertAdjacentHTML)
 */
export function addHTML(element, html, position = 'beforeend') {
  let el = element;
  if (typeof el === 'string') {
    el = window.document.querySelector(element);
  }
  if (el) {
    el.insertAdjacentHTML(position, html);
    return el;
  }
  return false;
}

/**
 * Add a given HTML string to a given element.
 *
 * @method addHTML
 * @param   src     {String}  URL of image
 * @param   width   {int}     width of image (defaults to 1)
 * @param   height  {int}     height of image (defaults to 1)
 */
export function addImage(src, width = 1, height = 1) {
  return addHTML('body', `<img src="${src}" width="${width}" height="${height}" />`);
}

export default {
  addScript,
  addHTML,
  addImage,
};
