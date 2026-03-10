/* ══════════════════════════════════════════════════════
   NAVA PEACE — MODULE GATE
   Reads data-module attribute on <html> tag.
   If that module is disabled in nava_modules (localStorage),
   hides the page and shows a full-screen "offline" overlay.
   ══════════════════════════════════════════════════════ */
(function () {
  try {
    var key = document.documentElement.getAttribute('data-module');
    if (!key) return;

    var mods = JSON.parse(localStorage.getItem('nava_modules') || '{}');
    if (mods[key] !== false) return; // module active (or never set) → let page load

    // 1. Hide body immediately to avoid flash of page content
    var hide = document.createElement('style');
    hide.id = 'module-gate-hide';
    hide.textContent = 'body { opacity: 0 !important; pointer-events: none !important; }';
    document.head.appendChild(hide);

    // 2. On DOM ready — replace body with offline screen
    document.addEventListener('DOMContentLoaded', function () {
      var s = document.getElementById('module-gate-hide');
      if (s) s.remove();

      document.body.innerHTML =
        '<div style="' +
          'min-height:100vh;display:flex;flex-direction:column;' +
          'align-items:center;justify-content:center;gap:20px;padding:48px 32px;' +
          'font-family:Nasalization,Arial,sans-serif;' +
          'background:radial-gradient(ellipse at 50% 20%,#6DD5F5 0%,#3AACDF 45%,#1E8EC4 100%);' +
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

  } catch (e) { /* fail silently — never break the page */ }
})();
