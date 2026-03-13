/* ══════════════════════════════════════════════════════
   NAVA PEACE — MODULE GATE  v2
   Deux rôles :
   1. GATE     — bloque la page courante si son module est désactivé
   2. NAV HIDE — masque dans la barre de nav les onglets désactivés
   ══════════════════════════════════════════════════════ */

/* Correspondance module → fichier HTML de la nav */
var NAVA_NAV_MAP = {
  module_peace:   'peace.html',
  module_map:     'map.html',
  module_market:  'market.html',
  module_profile: 'profile.html',
  module_about:   'about.html',
};

(function () {

  // ── 1. GATE : bloquer la page si son module est désactivé ──
  try {
    var key = document.documentElement.getAttribute('data-module');
    if (key) {
      var mods = JSON.parse(localStorage.getItem('nava_modules') || '{}');
      if (mods[key] === false) {

        // Cacher le body immédiatement (évite le flash de contenu)
        var hideStyle = document.createElement('style');
        hideStyle.id = 'module-gate-hide';
        hideStyle.textContent =
          'body { opacity: 0 !important; pointer-events: none !important; }';
        document.head.appendChild(hideStyle);

        document.addEventListener('DOMContentLoaded', function () {
          var s = document.getElementById('module-gate-hide');
          if (s) s.remove();

          document.body.innerHTML =
            '<div style="' +
              'min-height:100vh;display:flex;flex-direction:column;' +
              'align-items:center;justify-content:center;gap:20px;padding:48px 32px;' +
              'font-family:Nasalization,Arial,sans-serif;' +
              'background:radial-gradient(ellipse at 50% 20%,' +
                '#6DD5F5 0%,#3AACDF 45%,#1E8EC4 100%);' +
              'color:#fff;text-align:center;box-sizing:border-box;' +
            '">' +
              '<img src="logo.png" alt="NAVA PEACE"' +
                ' style="width:90px;height:90px;object-fit:contain;' +
                        'filter:drop-shadow(0 4px 28px rgba(255,255,255,0.50));" />' +
              '<p style="font-size:11px;letter-spacing:6px;text-transform:uppercase;' +
                        'opacity:0.55;margin-top:4px;">MODULE OFFLINE</p>' +
              '<p style="font-size:9px;letter-spacing:2px;opacity:0.38;' +
                        'max-width:280px;line-height:1.9;">' +
                'This section has been temporarily disabled by the administrator.' +
              '</p>' +
              '<a href="peace.html"' +
                ' style="margin-top:12px;padding:13px 32px;' +
                        'background:rgba(255,255,255,0.15);' +
                        'border:1.5px solid rgba(255,255,255,0.35);' +
                        'border-radius:12px;color:#fff;text-decoration:none;' +
                        'font-size:9px;letter-spacing:3px;">' +
                '\u2190 RETURN' +
              '</a>' +
            '</div>';
        });

        return; // corps remplacé — pas besoin de filtrer la nav
      }
    }
  } catch (e) { /* échouer silencieusement */ }

  // ── 2. NAV HIDE : masquer les onglets des modules désactivés ──
  function applyNavHide(mods) {
    Object.keys(NAVA_NAV_MAP).forEach(function (moduleKey) {
      if (mods[moduleKey] === false) {
        var href = NAVA_NAV_MAP[moduleKey];
        document.querySelectorAll('.nav-item[href="' + href + '"]')
          .forEach(function (el) { el.style.display = 'none'; });
      } else {
        var href = NAVA_NAV_MAP[moduleKey];
        document.querySelectorAll('.nav-item[href="' + href + '"]')
          .forEach(function (el) { if (el.style.display === 'none') el.style.display = ''; });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Apply cached settings immediately (fast, synchronous)
    try {
      var mods = JSON.parse(localStorage.getItem('nava_modules') || '{}');
      applyNavHide(mods);
    } catch (e) {}

    // ── 3. SUPABASE SYNC : fetch latest settings from server (cross-device) ──
    // Runs async after paint so it never blocks the page.
    // SUPABASE_URL and SUPABASE_ANON_KEY are defined in supabase_config.js (loaded in <head>).
    try {
      if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
          !SUPABASE_URL.includes('XXXXXXX') &&
          typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) {

        fetch(
          SUPABASE_URL + '/rest/v1/admin_settings?key=eq.nava_modules&select=value',
          {
            headers: {
              'apikey':        SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            },
          }
        ).then(function (r) { return r.json(); })
         .then(function (data) {
           if (!Array.isArray(data) || !data[0] || !data[0].value) return;
           var newVal = data[0].value;
           var oldVal = localStorage.getItem('nava_modules') || '{}';
           if (newVal === oldVal) return; // nothing changed
           localStorage.setItem('nava_modules', newVal);

           var newMods = JSON.parse(newVal);
           // Re-apply nav hide with fresh data
           applyNavHide(newMods);

           // If current page's module was just disabled, gate it now
           var pageKey = document.documentElement.getAttribute('data-module');
           if (pageKey && newMods[pageKey] === false) {
             window.location.reload(); // will hit the localStorage gate on reload
           }
         }).catch(function () {});
      }
    } catch (e) {}
  });

})();
