/* ═══════════════════════════════════════════════════════════════
   NAVA PEACE — share-card.js
   Unified invite card generation + multi-platform sharing
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var BOT_URL    = 'https://t.me/NavaPeaceBot';
  var WORLD_URL  = 'https://www.nava-peace.world';
  var APP_URL    = 'https://www.nava-peace.app';

  /* ── Platform definitions ──────────────────────────────────── */
  var PLATFORMS = [
    {
      id: 'telegram',
      name: 'Telegram',
      bg: '#2AABEE',
      svg: '<svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.88 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.268.942z"/></svg>',
      open: function (url) {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.shareToStory) {
          // Native Telegram Stories (Telegram 7.10+) — needs public image URL
          // Fallback to openLink for now
        }
        var text = encodeURIComponent('🕊 Join me on NAVA PEACE! Make Peace. Make Change.\n');
        var tgUrl = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + text;
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.openLink(tgUrl);
        } else {
          window.open(tgUrl, '_blank');
        }
      }
    },
    {
      id: 'instagram',
      name: 'Instagram',
      bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
      svg: '<svg viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
      open: function () {
        // Opens Instagram story camera — user selects card from gallery
        var opened = false;
        // Try iOS deep link
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'instagram://story-camera';
        document.body.appendChild(iframe);
        setTimeout(function () { document.body.removeChild(iframe); }, 1000);
        // Fallback after 1.5s
        setTimeout(function () {
          if (!opened) window.open('https://www.instagram.com/', '_blank');
          opened = true;
        }, 1500);
        opened = false;
      }
    },
    {
      id: 'facebook',
      name: 'Facebook',
      bg: '#1877F2',
      svg: '<svg viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      open: function () {
        // Try Facebook story camera deep link
        var fb = 'fb://composer/story';
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = fb;
        document.body.appendChild(iframe);
        setTimeout(function () { document.body.removeChild(iframe); }, 1000);
        setTimeout(function () {
          window.open('https://www.facebook.com/stories/create', '_blank');
        }, 1500);
      }
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      bg: '#25D366',
      svg: '<svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
      open: function (url) {
        var text = encodeURIComponent('🕊 JOIN NAVA PEACE — Make Peace. Make Change.\n👉 ' + url);
        window.open('https://wa.me/?text=' + text, '_blank');
      }
    },
    {
      id: 'x',
      name: 'X',
      bg: '#000000',
      svg: '<svg viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      open: function (url) {
        var text = encodeURIComponent('🕊 I choose PEACE. Join me on NAVA PEACE!\n');
        window.open('https://x.com/intent/post?text=' + text + '&url=' + encodeURIComponent(url), '_blank');
      }
    },
    {
      id: 'messenger',
      name: 'Messenger',
      bg: 'linear-gradient(45deg,#0084FF,#9B59B6)',
      svg: '<svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.149 0 11.499c0 3.606 1.793 6.82 4.608 8.924V24l4.052-2.224a12.784 12.784 0 003.34.449C18.627 22.225 24 17.076 24 10.726 24 4.374 18.627 0 12 0zm1.191 15.112l-3.086-3.29-6.022 3.29 6.625-7.031 3.157 3.29 5.951-3.29-6.625 7.031z"/></svg>',
      open: function (url) {
        window.open('https://www.facebook.com/dialog/send?link=' + encodeURIComponent(url) + '&app_id=291494419107518', '_blank');
      }
    }
  ];

  /* ── QR Code loader ────────────────────────────────────────── */
  function loadQRLib(cb) {
    if (window.QRCode) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  /* ── Card generation ───────────────────────────────────────── */
  function generateCard(refCode, pseudo) {
    return new Promise(function (resolve, reject) {
      var url = BOT_URL + (refCode ? '?start=' + refCode : '');
      loadQRLib(function () {
        var w = 600, h = 860;
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        var cx = w / 2;

        // Background gradient
        var grad = ctx.createRadialGradient(cx, h * 0.25, 0, cx, h * 0.5, h);
        grad.addColorStop(0, '#1E6E9A');
        grad.addColorStop(0.45, '#0F4060');
        grad.addColorStop(1, '#050F1A');
        roundRect(ctx, 0, 0, w, h, 36, grad);

        // Top accent bar
        var barGrad = ctx.createLinearGradient(0, 0, w, 0);
        barGrad.addColorStop(0, '#64D2FF');
        barGrad.addColorStop(1, '#3AACDF');
        ctx.fillStyle = barGrad;
        ctx.fillRect(36, 0, w - 72, 4);

        // Generate QR in hidden div
        var qrDiv = document.createElement('div');
        qrDiv.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(qrDiv);
        new QRCode(qrDiv, { text: url, width: 300, height: 300, colorDark: '#0a2a40', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });

        // Fetch logo
        fetch('logo.png')
          .then(function (r) { return r.blob(); })
          .then(function (blob) {
            var reader = new FileReader();
            reader.onload = function (e) {
              var logoImg = new Image();
              logoImg.onload = function () { drawCard(logoImg); };
              logoImg.src = e.target.result;
            };
            reader.readAsDataURL(blob);
          })
          .catch(function () { drawCard(null); });

        function drawCard(logoImg) {
          // ── TIER 1: Logo + Title ────────────────────────────
          var t1y = 60;
          if (logoImg) {
            ctx.drawImage(logoImg, cx - 52, t1y, 104, 104);
            t1y += 120;
          } else { t1y += 20; }

          ctx.font = 'bold 46px Nasalization, Arial';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText('NAVA PEACE', cx, t1y);
          t1y += 16;

          // underline
          ctx.fillStyle = '#64D2FF';
          ctx.fillRect(cx - 80, t1y, 160, 2);
          t1y += 22;

          ctx.font = '14px Nasalization, Arial';
          ctx.fillStyle = 'rgba(100,210,255,0.85)';
          ctx.fillText('MAKE PEACE. MAKE CHANGE.', cx, t1y);

          // ── TIER 2: Invitation + QR ─────────────────────────
          var t2y = t1y + 52;
          ctx.font = '13px Nasalization, Arial';
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.fillText('YOU ARE INVITED BY', cx, t2y);
          t2y += 36;

          ctx.font = 'bold 28px Nasalization, Arial';
          ctx.fillStyle = '#64D2FF';
          ctx.fillText((pseudo || 'A PEACE SEEKER').toUpperCase(), cx, t2y);
          t2y += 22;

          ctx.font = '13px Nasalization, Arial';
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.fillText('TO JOIN NAVA PEACE', cx, t2y);
          t2y += 28;

          // QR box
          var qrSize = 260;
          var qrX = cx - qrSize / 2 - 14;
          var qrY = t2y;
          roundRect(ctx, qrX, qrY, qrSize + 28, qrSize + 28, 18, '#FFFFFF');
          ctx.strokeStyle = '#64D2FF';
          ctx.lineWidth = 3;
          roundRectStroke(ctx, qrX, qrY, qrSize + 28, qrSize + 28, 18);

          // Draw QR canvas
          var qrCanvas = qrDiv.querySelector('canvas');
          if (qrCanvas) {
            ctx.drawImage(qrCanvas, qrX + 14, qrY + 14, qrSize, qrSize);
          }
          document.body.removeChild(qrDiv);

          // ── TIER 3: URLs ────────────────────────────────────
          var t3y = qrY + qrSize + 28 + 44;
          ctx.font = '14px Nasalization, Arial';
          ctx.fillStyle = '#64D2FF';
          ctx.fillText(WORLD_URL, cx, t3y);
          t3y += 28;
          ctx.fillStyle = 'rgba(100,210,255,0.6)';
          ctx.fillText(APP_URL, cx, t3y);

          // Bottom accent bar
          ctx.fillStyle = barGrad;
          ctx.fillRect(36, h - 4, w - 72, 4);

          canvas.toBlob(function (blob) {
            resolve(new File([blob], 'nava-peace-invite.png', { type: 'image/png' }));
          }, 'image/png');
        }
      });
    });
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function roundRectStroke(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
  }

  /* ── Save card (auto-download) ─────────────────────────────── */
  function saveCard(file) {
    var url = URL.createObjectURL(file);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'nava-peace-invite.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  /* ── Bottom sheet UI ───────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('nava-share-style')) return;
    var s = document.createElement('style');
    s.id = 'nava-share-style';
    s.textContent = `
      #nava-share-overlay {
        position: fixed; inset: 0; z-index: 9000;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: flex-end; justify-content: center;
        animation: nsOverlayIn .25s ease;
      }
      @keyframes nsOverlayIn { from { opacity:0 } to { opacity:1 } }
      #nava-share-sheet {
        width: 100%; max-width: 480px;
        background: linear-gradient(180deg, #0F2F45 0%, #050F1A 100%);
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        border-top: 1px solid rgba(100,210,255,0.25);
        padding: 0 0 32px;
        animation: nsSheetIn .3s cubic-bezier(.32,1,.22,1);
      }
      @keyframes nsSheetIn { from { transform:translateY(100%) } to { transform:translateY(0) } }
      #nava-share-handle {
        width: 44px; height: 4px; background: rgba(255,255,255,0.2);
        border-radius: 2px; margin: 14px auto 0;
      }
      #nava-share-preview {
        display: flex; justify-content: center;
        padding: 18px 20px 0;
      }
      #nava-share-preview img {
        width: 120px; height: 169px;
        border-radius: 12px;
        object-fit: cover;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        border: 1px solid rgba(100,210,255,0.3);
      }
      #nava-share-saved-msg {
        text-align: center;
        font-family: Nasalization, Arial, sans-serif;
        font-size: 9px; letter-spacing: 2px;
        color: rgba(100,255,160,0.8);
        padding: 10px 0 0;
      }
      #nava-share-gallery-msg {
        text-align: center;
        font-family: Nasalization, Arial, sans-serif;
        font-size: 8px; letter-spacing: 1.5px;
        color: rgba(255,255,255,0.4);
        padding: 4px 24px 14px;
        line-height: 1.8;
      }
      #nava-share-platforms {
        display: flex; justify-content: center; gap: 16px;
        flex-wrap: wrap; padding: 0 20px 18px;
      }
      .nava-plat-btn {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        cursor: pointer; border: none; background: transparent;
      }
      .nava-plat-icon {
        width: 52px; height: 52px; border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        transition: transform .15s;
      }
      .nava-plat-icon svg { width: 26px; height: 26px; }
      .nava-plat-btn:active .nava-plat-icon { transform: scale(0.9); }
      .nava-plat-label {
        font-family: Nasalization, Arial, sans-serif;
        font-size: 7px; letter-spacing: 1px; color: rgba(255,255,255,0.5);
      }
      #nava-share-native-btn {
        display: block; margin: 0 20px;
        padding: 14px; border-radius: 14px;
        background: linear-gradient(135deg,#3AACDF,#1E6E9A);
        border: none; color: #fff; cursor: pointer;
        font-family: Nasalization, Arial, sans-serif;
        font-size: 11px; letter-spacing: 3px; text-align: center;
        width: calc(100% - 40px);
      }
      #nava-share-close-btn {
        display: block; margin: 10px 20px 0;
        padding: 11px; border-radius: 14px;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.5); cursor: pointer;
        font-family: Nasalization, Arial, sans-serif;
        font-size: 10px; letter-spacing: 2px; text-align: center;
        width: calc(100% - 40px);
      }
      #nava-share-loading {
        text-align: center; padding: 48px 20px;
        font-family: Nasalization, Arial, sans-serif;
        font-size: 10px; letter-spacing: 3px; color: rgba(100,210,255,0.7);
      }
    `;
    document.head.appendChild(s);
  }

  function showSheet(file, refCode) {
    removeSheet();
    injectStyles();

    var overlay = document.createElement('div');
    overlay.id = 'nava-share-overlay';
    overlay.onclick = function (e) { if (e.target === overlay) removeSheet(); };

    var imgUrl = URL.createObjectURL(file);

    var html = '<div id="nava-share-sheet">';
    html += '<div id="nava-share-handle"></div>';
    html += '<div id="nava-share-preview"><img src="' + imgUrl + '" alt="invite card"></div>';
    html += '<div id="nava-share-saved-msg">✓ CARD READY</div>';
    html += '<div id="nava-share-gallery-msg">CHOOSE A PLATFORM · SELECT "STORY" OR "POST"<br>THEN PICK YOUR CARD FROM THE GALLERY</div>';

    // Platform buttons
    html += '<div id="nava-share-platforms">';
    var url = BOT_URL + (refCode ? '?start=' + refCode : '');
    PLATFORMS.forEach(function (p) {
      html += '<button class="nava-plat-btn" data-plat="' + p.id + '">';
      html += '<div class="nava-plat-icon" style="background:' + p.bg + ';">' + p.svg + '</div>';
      html += '<span class="nava-plat-label">' + p.name + '</span>';
      html += '</button>';
    });
    html += '</div>';

    // Native share button
    html += '<button id="nava-share-native-btn">🕊 SHARE CARD</button>';
    html += '<button id="nava-share-close-btn">CANCEL</button>';
    html += '</div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // Save card (auto-download)
    saveCard(file);

    // Platform button events
    overlay.querySelectorAll('.nava-plat-btn').forEach(function (btn) {
      btn.onclick = function () {
        var platId = btn.getAttribute('data-plat');
        var plat = PLATFORMS.find(function (p) { return p.id === platId; });
        if (plat) plat.open(url);
      };
    });

    // Native share
    document.getElementById('nava-share-native-btn').onclick = function () {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          text: '🕊 JOIN NAVA PEACE — Make Peace. Make Change.',
          url: url
        }).catch(function () {});
      } else {
        saveCard(file);
      }
    };

    document.getElementById('nava-share-close-btn').onclick = function () {
      removeSheet();
      URL.revokeObjectURL(imgUrl);
    };
  }

  function showLoadingSheet() {
    removeSheet();
    injectStyles();
    var overlay = document.createElement('div');
    overlay.id = 'nava-share-overlay';
    overlay.innerHTML = '<div id="nava-share-sheet"><div id="nava-share-loading">🕊 GENERATING YOUR CARD...</div></div>';
    document.body.appendChild(overlay);
  }

  function removeSheet() {
    var el = document.getElementById('nava-share-overlay');
    if (el) el.parentNode.removeChild(el);
  }

  /* ── Public API ────────────────────────────────────────────── */
  window.NAVA_SHARE = {
    open: function () {
      var uid     = localStorage.getItem('nava_peace_uid')     || '';
      var refCode = localStorage.getItem('nava_peace_ref_code')|| '';
      var pseudo  = localStorage.getItem('nava_peace_pseudo')  || 'PEACE SEEKER';

      showLoadingSheet();
      generateCard(refCode, pseudo)
        .then(function (file) { showSheet(file, refCode); })
        .catch(function (e) {
          console.warn('NAVA_SHARE card error', e);
          removeSheet();
        });
    }
  };

})();
