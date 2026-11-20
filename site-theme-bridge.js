/**
 * Site half of the portal theme bridge. Goes on deltatheme.com (the /account/
 * page, or site.js), NOT in Freemius. Its partner is account.js.
 *
 * Add it to the live site only together with the dark redesign: the live
 * light site has no data-theme attribute, which this reads as dark.
 *
 * The site is dark by default; the header toggle sets data-theme="light" on
 * <html>. This sends that theme to the Freemius portal iframe when the portal
 * asks for it, when the iframe loads, and on every toggle.
 */
(function () {
  var PORTAL = 'https://customers.freemius.com';
  var root = document.documentElement;

  function theme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function send() {
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      if ((frames[i].src || '').indexOf(PORTAL) !== 0) continue;
      try {
        frames[i].contentWindow.postMessage({ delta: 'theme', theme: theme() }, PORTAL);
      } catch (e) {}
    }
  }

  window.addEventListener('message', function (e) {
    if (e.origin === PORTAL && e.data && e.data.delta === 'portal-ready') send();
  });
  document.addEventListener('load', function (e) {
    if (e.target && e.target.tagName === 'IFRAME') send();
  }, true);
  new MutationObserver(send).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
