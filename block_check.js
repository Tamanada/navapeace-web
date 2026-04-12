/* ═══════════════════════════════════════════════════════════════
   NAVA PEACE – Block Check
   Loaded on all pages. Checks if user is blocked in Supabase.
   If blocked → shows full-screen overlay, prevents all interaction.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  function checkBlock(){
    var uid = localStorage.getItem('nava_peace_uid');
    if(!uid) return;

    if(typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') return;
    if(!window.supabase) return;

    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    sb.from('blocked_users').select('user_uid,reason').eq('user_uid', uid).then(function(res){
      if(res.error || !res.data) return;
      if(res.data.length > 0){
        showBlockScreen();
      }
    });
  }

  function showBlockScreen(){
    var overlay = document.createElement('div');
    overlay.id = 'nava-block-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;' +
      'background:linear-gradient(135deg,#0a0a0a 0%,#1a0a0a 100%);' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'font-family:system-ui,-apple-system,sans-serif;color:#fff;text-align:center;padding:40px;';

    overlay.innerHTML =
      '<div style="font-size:60px;margin-bottom:20px;">🔒</div>' +
      '<h1 style="font-size:22px;font-weight:700;letter-spacing:3px;margin:0 0 16px 0;color:#ff4040;">ACCESS BLOCKED</h1>' +
      '<p style="font-size:13px;line-height:1.8;color:rgba(255,255,255,0.5);max-width:320px;margin:0 0 30px 0;">' +
        'Your account has been suspended.<br>If you believe this is an error, please contact the administrator.' +
      '</p>' +
      '<div style="font-size:10px;color:rgba(255,255,255,0.2);letter-spacing:2px;">NAVA PEACE</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  // Wait for DOM ready then check
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', checkBlock);
  } else {
    checkBlock();
  }
})();
