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
  document.addEventListener('DOMContentLoaded', function () {
    try {
      var mods = JSON.parse(localStorage.getItem('nava_modules') || '{}');
      Object.keys(NAVA_NAV_MAP).forEach(function (moduleKey) {
        if (mods[moduleKey] === false) {
          var href = NAVA_NAV_MAP[moduleKey];
          document.querySelectorAll('.nav-item[href="' + href + '"]')
            .forEach(function (el) {
              el.style.display = 'none';
            });
        }
      });
    } catch (e) {}
  });

})();
