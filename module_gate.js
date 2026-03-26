/* ══════════════════════════════════════════════════════
   NAVA PEACE — MODULE GATE  v3
   1. GATE     — redirige vers la première page active si le module courant est désactivé
   2. NAV HIDE — masque dans la barre de nav les onglets désactivés
   ══════════════════════════════════════════════════════ */

(function () {

  var NAV_ORDER = ['module_peace','module_map','module_stats','module_market','module_profile','module_about'];
  var NAV_PAGES = {
    module_peace:   'peace.html',
    module_map:     'map.html',
    module_stats:   'stats.html',
    module_market:  'market.html',
    module_profile: 'profile.html',
    module_about:   'about.html',
  };

  // ── 1. GATE : rediriger si le module courant est désactivé ──
  try {
    var key = document.documentElement.getAttribute('data-module');
    if (key) {
      var mods = JSON.parse(localStorage.getItem('nava_modules') || '{}');
      if (mods[key] === false) {
        // Trouver la première page active
        var target = null;
        for (var i = 0; i < NAV_ORDER.length; i++) {
          var k = NAV_ORDER[i];
          if (k !== key && mods[k] !== false) {
            target = NAV_PAGES[k];
            break;
          }
        }
        if (target) {
          window.location.replace(target);
        }
        return;
      }
    }
  } catch (e) { /* échouer silencieusement */ }

  // ── 2. NAV HIDE : masquer les onglets des modules désactivés ──
  function applyNavHide(mods) {
    var keys = Object.keys(NAV_PAGES);
    for (var i = 0; i < keys.length; i++) {
      var moduleKey = keys[i];
      var href = NAV_PAGES[moduleKey];
      var items = document.querySelectorAll('.nav-item[href="' + href + '"]');
      for (var j = 0; j < items.length; j++) {
        items[j].style.display = mods[moduleKey] === false ? 'none' : '';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Appliquer immédiatement depuis le cache
    try {
      var mods = JSON.parse(localStorage.getItem('nava_modules') || '{}');
      applyNavHide(mods);
    } catch (e) {}

    // ── 3. SUPABASE SYNC ──
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
           if (newVal === oldVal) return;

           var oldMods = JSON.parse(oldVal);
           localStorage.setItem('nava_modules', newVal);
           var newMods = JSON.parse(newVal);
           applyNavHide(newMods);

           var pageKey = document.documentElement.getAttribute('data-module');
           if (pageKey) {
             if (newMods[pageKey] === false) {
               // Module désactivé → rediriger
               var target = null;
               for (var i = 0; i < NAV_ORDER.length; i++) {
                 var k = NAV_ORDER[i];
                 if (k !== pageKey && newMods[k] !== false) {
                   target = NAV_PAGES[k];
                   break;
                 }
               }
               if (target) window.location.replace(target);
             } else {
               // Modules changed → reload to re-run gate check with fresh values
               window.location.reload();
             }
           } else {
             // Not on a module page — reload to refresh nav
             window.location.reload();
           }
         }).catch(function () {});
      }
    } catch (e) {}
  });

})();
