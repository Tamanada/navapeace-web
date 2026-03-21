/**
 * discovery.js — NAVA PEACE · Discovery Doves
 * Récompense la découverte de nouvelles sections avec une colombe.
 * Usage : NAVA_DISCOVERY.check('section', sb) après init Supabase.
 */
(function (w) {
  'use strict';

  var KEY = 'nava_discovered';

  var SECTIONS = {
    map:       { icon: '🗺', label: 'PEACE MAP',     msg: 'See the global impact of peace in real time.' },
    profile:   { icon: '👤', label: 'YOUR PROFILE',  msg: 'Customize your profile and track your journey.' },
    stats:     { icon: '📊', label: 'YOUR STATS',    msg: 'Follow your streak and your impact over time.' },
    market:    { icon: '🛒', label: 'NAVA MARKET',   msg: 'Support the mission — every purchase helps.' },
    messages:  { icon: '💬', label: 'PEACE WALL',    msg: 'Leave a message of peace for the world to read.' },
    referrals: { icon: '👥', label: 'REFERRALS',     msg: 'Invite friends and multiply the impact of peace.' }
  };

  /* ── Helpers localStorage ─────────────────────────────────────── */
  function _get() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function _set(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { }
  }

  /* ── Supabase insert ──────────────────────────────────────────── */
  function _award(section, uid, sb) {
    if (!sb || !uid) return;
    sb.from('nava_discoveries')
      .insert({ user_uid: uid, section: section })
      .then(function () { })
      .catch(function () { });
  }

  /* ── Toast +1 dove ────────────────────────────────────────────── */
  function _toast() {
    var old = document.getElementById('disco-toast');
    if (old) old.remove();

    var el = document.createElement('div');
    el.id = 'disco-toast';
    el.style.cssText =
      'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:99999;' +
      'background:linear-gradient(135deg,rgba(26,95,130,0.97),rgba(30,142,196,0.97));' +
      'border:1px solid rgba(255,255,255,0.22);border-radius:50px;' +
      'padding:10px 26px;font-family:Nasalization,Arial,sans-serif;' +
      'font-size:9px;letter-spacing:3px;color:#fff;white-space:nowrap;' +
      'box-shadow:0 4px 24px rgba(0,0,0,0.3);' +
      'opacity:0;transition:opacity 0.4s ease,top 0.4s ease;pointer-events:none;';
    el.textContent = '🕊  +1 DISCOVERY DOVE';
    document.body.appendChild(el);

    requestAnimationFrame(function () {
      el.style.opacity = '1';
      setTimeout(function () {
        el.style.opacity = '0';
        el.style.top = '8px';
        setTimeout(function () { el.remove(); }, 450);
      }, 2800);
    });
  }

  /* ── Overlay bulle ────────────────────────────────────────────── */
  function _showBubble(section, onDismiss) {
    var info = SECTIONS[section];
    if (!info) { if (onDismiss) onDismiss(); return; }

    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    var overlay = document.createElement('div');
    overlay.id = 'disco-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.52);backdrop-filter:blur(6px);' +
      'opacity:0;transition:opacity 0.35s ease;';

    overlay.innerHTML =
      '<div id="disco-card" style="' +
        'background:linear-gradient(155deg,rgba(26,95,130,0.97),rgba(12,55,85,0.97));' +
        'border:1px solid rgba(255,255,255,0.16);border-radius:24px;' +
        'padding:36px 28px 28px;max-width:300px;width:88%;text-align:center;' +
        'font-family:Nasalization,Arial,sans-serif;' +
        'box-shadow:0 24px 60px rgba(0,0,0,0.5);' +
        'transform:translateY(22px);transition:transform 0.38s ease;' +
      '">' +
        '<div style="font-size:46px;margin-bottom:6px;">' + info.icon + '</div>' +
        '<div style="font-size:7px;letter-spacing:5px;color:rgba(255,255,255,0.42);margin-bottom:6px;">SECTION UNLOCKED</div>' +
        '<div style="font-size:12px;letter-spacing:4px;color:#fff;margin-bottom:14px;">' + info.label + '</div>' +
        '<div style="font-size:9px;letter-spacing:1px;color:rgba(255,255,255,0.62);line-height:1.75;margin-bottom:22px;">' + info.msg + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:9px;' +
          'background:rgba(255,255,255,0.1);border-radius:50px;padding:9px 0;margin-bottom:20px;">' +
          '<span style="font-size:16px;">🕊</span>' +
          '<span style="font-size:9px;letter-spacing:3px;color:#fff;">+1 DISCOVERY DOVE</span>' +
        '</div>' +
        '<button id="disco-btn" style="' +
          'background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.28);' +
          'border-radius:50px;padding:12px 0;width:100%;' +
          'font-family:Nasalization,Arial,sans-serif;font-size:8px;letter-spacing:5px;' +
          'color:#fff;cursor:pointer;transition:background 0.2s;' +
        '">CLAIM DOVE</button>' +
      '</div>';

    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      overlay.style.opacity = '1';
      var card = document.getElementById('disco-card');
      if (card) card.style.transform = 'translateY(0)';
    });

    function dismiss() {
      overlay.style.opacity = '0';
      document.body.style.overflow = prevOverflow;
      setTimeout(function () { overlay.remove(); }, 380);
      if (onDismiss) onDismiss();
    }

    var btn = document.getElementById('disco-btn');
    if (btn) btn.addEventListener('click', dismiss);
  }

  /* ── API publique ─────────────────────────────────────────────── */
  w.NAVA_DISCOVERY = {

    /**
     * check(section, sb)
     * Appeler depuis chaque page après init Supabase.
     * Si section non découverte → bulle + dove Supabase + toast.
     */
    check: function (section, sb) {
      var uid = localStorage.getItem('nava_peace_uid');
      if (!uid) return;
      var discovered = _get();
      if (discovered[section]) return;

      setTimeout(function () {
        _showBubble(section, function () {
          discovered[section] = Date.now();
          _set(discovered);
          _award(section, uid, sb);
          _toast();
        });
      }, 1500);
    },

    /** Nombre de sections découvertes (pour le décompte de doves) */
    count: function () { return Object.keys(_get()).length; }
  };

}(window));
