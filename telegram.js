/* ─── NAVA PEACE — Telegram Mini App detection ─── */
var NAVA_TG = { isTelegram: false, user: null, startParam: null, uid: null };

(function () {
  try {
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
      var u = Telegram.WebApp.initDataUnsafe.user;
      NAVA_TG.isTelegram = true;
      NAVA_TG.user = u;
      NAVA_TG.startParam = Telegram.WebApp.initDataUnsafe.start_param || null;
      NAVA_TG.uid = 'tg_' + u.id;

      // Store Telegram user ID as identity
      localStorage.setItem('nava_peace_uid', NAVA_TG.uid);

      // Auto-detect language from Telegram (only on first visit)
      if (u.language_code && !localStorage.getItem('nava_peace_lang')) {
        var supported = ['en','fr','es','pt','ar','zh','hi','ja','ru','de','ko','uk'];
        var lc = u.language_code.substring(0, 2).toLowerCase();
        if (supported.indexOf(lc) !== -1) {
          localStorage.setItem('nava_peace_lang', lc);
        }
      }

      // Capture referral from startParam
      if (NAVA_TG.startParam) {
        localStorage.setItem('nava_peace_referred_by', NAVA_TG.startParam.toUpperCase());
      }

      // Signal Telegram that the app is ready
      Telegram.WebApp.ready();
      Telegram.WebApp.expand(); // Use full screen

      // Match app theme to NAVA PEACE
      try {
        Telegram.WebApp.setHeaderColor('#43b4e4');
        Telegram.WebApp.setBackgroundColor('#43b4e4');
      } catch (e) { /* older Telegram versions may not support this */ }
    }
  } catch (e) {
    // Not in Telegram — silent fallback
    NAVA_TG.isTelegram = false;
  }
})();

/**
 * Get the appropriate share/referral link depending on context
 * In Telegram: t.me/NavaPeaceBot/app?startapp=CODE
 * On web: https://nava-peace.app/?ref=CODE
 */
function getShareLink(refCode) {
  if (!refCode) refCode = localStorage.getItem('nava_peace_ref_code') || '';
  if (NAVA_TG.isTelegram && refCode) {
    return 'https://t.me/NavaPeaceBot/app?startapp=' + refCode;
  } else if (refCode) {
    return 'https://nava-peace.app/?ref=' + refCode;
  }
  return 'https://nava-peace.app';
}
