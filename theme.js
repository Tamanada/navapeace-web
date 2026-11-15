/* ══════════════════════════════════════════════════════════════════════════
   NAVA PEACE · THEME SWITCHER
   Loaded synchronously in <head>, before the page styles, so the saved theme
   is applied before first paint (no flash of the wrong theme).

   - The choice is a display preference only: stored in localStorage
     ('nava_theme'), never sent to the server, no effect on game state.
   - Sky is the default and needs no attribute: an unknown or missing value
     always falls back to Sky.
   API: NAVA_THEME.get() · NAVA_THEME.set(name) · NAVA_THEME.list · NAVA_THEME.chrome(fallback)
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'nava_theme';
  var THEMES = {
    sky:       { chrome: null,      fonts: null },
    sanctuary: { chrome: '#111116', fonts: 'family=Cinzel:wght@500;700&family=Raleway:wght@400;600;700' },
    field:     { chrome: '#F6F1E7', fonts: 'family=Nunito:wght@400;600;700&family=Playfair+Display:wght@600;700' }
  };
  var LIST = ['sky', 'sanctuary', 'field'];
  var root = document.documentElement;
  var current = 'sky';

  function valid(name) {
    return typeof name === 'string' && Object.prototype.hasOwnProperty.call(THEMES, name);
  }

  function stored() {
    try {
      var t = localStorage.getItem(KEY);
      return valid(t) ? t : 'sky';
    } catch (e) {
      return 'sky';            // storage blocked (private mode): stay on the default
    }
  }

  // Web fonts for the non-default themes. If the request is blocked (CSP, offline,
  // network filtering) the font stacks in theme.css fall back to system fonts.
  function loadFonts(name) {
    var spec = THEMES[name].fonts;
    var link = document.getElementById('nv-theme-fonts');
    if (!spec) return;
    var href = 'https://fonts.googleapis.com/css2?' + spec + '&display=swap';
    if (link) {
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
      return;
    }
    link = document.createElement('link');
    link.id = 'nv-theme-fonts';
    link.rel = 'stylesheet';
    link.href = href;
    (document.head || root).appendChild(link);
  }

  // Browser / Telegram chrome colour. Sky keeps whatever each page declares.
  function paintChrome(name) {
    var color = THEMES[name].chrome;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      if (!meta.hasAttribute('data-nv-default')) {
        meta.setAttribute('data-nv-default', meta.getAttribute('content') || '');
      }
      meta.setAttribute('content', color || meta.getAttribute('data-nv-default'));
    }
    try {
      var wa = window.Telegram && window.Telegram.WebApp;
      if (wa && color) {
        wa.setHeaderColor(color);
        wa.setBackgroundColor(color);
      }
    } catch (e) { /* older Telegram clients do not support these calls */ }
  }

  function syncPickers() {
    var inputs = document.querySelectorAll('input[data-nv-theme]');
    for (var i = 0; i < inputs.length; i++) {
      var on = inputs[i].value === current;
      inputs[i].checked = on;
      var label = inputs[i].closest ? inputs[i].closest('.nv-theme-opt') : null;
      if (label) label.classList.toggle('nv-on', on);
    }
  }

  function apply(name) {
    current = valid(name) ? name : 'sky';
    if (current === 'sky') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', current);
    loadFonts(current);
    paintChrome(current);
    syncPickers();
  }

  function set(name) {
    if (!valid(name)) return false;
    try { localStorage.setItem(KEY, name); } catch (e) { /* applies for this page view only */ }
    var wasSky = current === 'sky';
    apply(name);
    // Going back to Sky inside Telegram: restore the app's default chrome colour
    if (name === 'sky' && !wasSky) {
      try {
        var wa = window.Telegram && window.Telegram.WebApp;
        if (wa) { wa.setHeaderColor('#43b4e4'); wa.setBackgroundColor('#43b4e4'); }
      } catch (e) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('nava:theme', { detail: { theme: current } }));
    } catch (e) {}
    return true;
  }

  function bindPickers() {
    var inputs = document.querySelectorAll('input[data-nv-theme]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('change', function (ev) {
        if (ev.target.checked) set(ev.target.value);
      });
    }
    syncPickers();
  }

  window.NAVA_THEME = {
    list: LIST,
    get: function () { return current; },
    set: set,
    // Colour for Telegram header/background: the theme's, or the caller's Sky default
    chrome: function (fallback) { return THEMES[current].chrome || fallback; }
  };

  apply(stored());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      paintChrome(current);     // the theme-color meta may not have existed yet
      bindPickers();
    });
  } else {
    bindPickers();
  }

  // Keep several open pages in step (PWA with more than one window)
  window.addEventListener('storage', function (ev) {
    if (ev.key === KEY) apply(stored());
  });
})();
