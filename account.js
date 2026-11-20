/**
 * Freemius store / account customizations for deltatheme.com.
 *
 * Public URL (attach this in Freemius; always a tag, never @main):
 * https://cdn.jsdelivr.net/gh/21press/freemius-customizations@<tag>/account.js
 *
 * Theme bridge (November 2026). The portal is a cross-origin iframe on
 * deltatheme.com/account/, so it cannot see the site's light/dark toggle.
 * The site sends the current theme with postMessage; this file applies it as
 * data-delta-theme on <html>, which switches the dark block at the end of
 * account.css on or off.
 *
 *   portal -> site:  { delta: "portal-ready" }          once this file runs
 *   site -> portal:  { delta: "theme", theme: "dark" }  or "light"
 *
 * Messages are only accepted from the origins below. With no message the
 * portal stays light, which is what the live site needs until the redesign
 * launches. The last theme is remembered for this tab, so a reload inside
 * the portal does not flash light first.
 */
(function () {
  var ORIGINS = [
    'https://deltatheme.com',
    'https://www.deltatheme.com',
    'https://staging.deltatheme.com'
  ];
  var KEY = 'delta-portal-theme';
  var root = document.documentElement;

  function apply(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-delta-theme', 'dark');
    } else {
      root.removeAttribute('data-delta-theme');
    }
  }

  // Only inside the site's iframe. Opened on its own, the portal stays light.
  if (window.parent === window) return;

  // The remembered theme is kept per parent site. Browsers share this storage
  // between staging.deltatheme.com and deltatheme.com, so one key for both
  // carried staging's dark into the live light site in the same tab.
  var parentOrigin = '';
  try {
    parentOrigin = (location.ancestorOrigins && location.ancestorOrigins[0]) ||
      (document.referrer ? new URL(document.referrer).origin : '');
  } catch (e) {}
  if (ORIGINS.indexOf(parentOrigin) === -1) parentOrigin = '';
  KEY = KEY + ':' + parentOrigin;

  if (parentOrigin) {
    try { apply(sessionStorage.getItem(KEY)); } catch (e) {}
  }

  window.addEventListener('message', function (e) {
    if (ORIGINS.indexOf(e.origin) === -1) return;
    var d = e.data;
    if (!d || typeof d !== 'object' || d.delta !== 'theme') return;
    var theme = d.theme === 'dark' ? 'dark' : 'light';
    apply(theme);
    try { sessionStorage.setItem(KEY, theme); } catch (err) {}
  });

  // Ask the site for the theme. The site also sends it when the iframe loads
  // and on every toggle, so a missed reply is covered.
  ORIGINS.forEach(function (o) {
    try { window.parent.postMessage({ delta: 'portal-ready' }, o); } catch (err) {}
  });
})();
