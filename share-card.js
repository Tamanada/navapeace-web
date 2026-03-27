/* =================================================================
   NAVA PEACE — share-card.js  v3
   Stats invite card + bottom sheet + multi-platform sharing
   ================================================================= */
(function () {
  var BOT_URL  = 'https://t.me/NavaPeaceBot';
  var APP_URL  = 'https://t.me/NavaPeaceBot/app';
  var LOGO_URL = 'logo.png';

  /* Styles */
  var css = document.createElement('style');
  css.textContent = '#nava-share-overlay{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);display:flex;flex-direction:column;justify-content:flex-end;animation:nsOvIn .2s ease}'
    +'@keyframes nsOvIn{from{opacity:0}to{opacity:1}}'
    +'#nava-share-sheet{background:linear-gradient(180deg,#0F3A5A 0%,#050F1A 100%);border-radius:24px 24px 0 0;padding:18px 18px 40px;max-height:92dvh;overflow-y:auto;animation:nsShIn .28s cubic-bezier(.34,1.2,.64,1)}'
    +'@keyframes nsShIn{from{transform:translateY(100%)}to{transform:translateY(0)}}'
    +'.ns-handle{width:40px;height:4px;background:rgba(255,255,255,.2);border-radius:4px;margin:0 auto 14px}'
    +'.ns-title{font-family:Nasalization,Arial,sans-serif;font-size:10px;letter-spacing:4px;color:rgba(255,255,255,.5);text-align:center;margin-bottom:14px}'
    +'#ns-card-wrap{width:100%;max-width:300px;margin:0 auto 16px;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.5);background:#0F2A40;min-height:100px;display:flex;align-items:center;justify-content:center}'
    +'#ns-card-wrap img{width:100%;display:block;border-radius:14px}'
    +'.ns-loader{color:rgba(255,255,255,.4);font-family:Nasalization,Arial,sans-serif;font-size:9px;letter-spacing:2px;padding:36px 20px;text-align:center}'
    +'#ns-save-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;max-width:300px;margin:0 auto 16px;padding:12px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,#64FFAA,#32CC80);color:#050F1A;font-family:Nasalization,Arial,sans-serif;font-size:10px;letter-spacing:3px}'
    +'.ns-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:320px;margin:0 auto 14px}'
    +'.ns-btn{display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:11px 6px;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    +'.ns-btn:active{background:rgba(255,255,255,.18)}'
    +'.ns-btn svg{width:26px;height:26px}'
    +'.ns-btn span{font-family:Nasalization,Arial,sans-serif;font-size:7px;letter-spacing:1px;color:rgba(255,255,255,.6)}'
    +'#ns-hint{text-align:center;font-family:Nasalization,Arial,sans-serif;font-size:8px;letter-spacing:1.5px;color:rgba(255,255,255,.35);line-height:1.9;max-width:280px;margin:0 auto}'
    +'#ns-hint b{color:rgba(100,210,255,.75)}';
  document.head.appendChild(css);

  /* Platforms */
  var P = [
    { id:'telegram', label:'TELEGRAM',
      svg:'<svg viewBox="0 0 24 24" fill="#2AABEE"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
      fn: function(f,u){ if(!_native(f,u)) _open('https://t.me/share/url?url='+enc(u)+'&text='+enc('Join me on NAVA PEACE — Make Peace. Make Change.')); }
    },
    { id:'instagram', label:'INSTAGRAM',
      svg:'<svg viewBox="0 0 24 24"><defs><linearGradient id="igG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f09433"/><stop offset="50%" stop-color="#dc2743"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><path fill="url(#igG)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
      fn: function(f,u){ _save(f); setTimeout(function(){_open('instagram://story-camera');},400); _hint('INSTAGRAM','NEW STORY - GALLERY'); }
    },
    { id:'facebook', label:'FACEBOOK',
      svg:'<svg viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      fn: function(f,u){ _save(f); setTimeout(function(){_open('fb://composer/story');},400); _hint('FACEBOOK','NEW STORY - GALLERY'); }
    },
    { id:'whatsapp', label:'WHATSAPP',
      svg:'<svg viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
      fn: function(f,u){ if(!_native(f,u)) _open('https://wa.me/?text='+enc('Join me on NAVA PEACE!\n'+u)); }
    },
    { id:'x', label:'X',
      svg:'<svg viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      fn: function(f,u){ if(!_native(f,u)) _open('https://x.com/intent/post?text='+enc('I choose peace every day. Join NAVA PEACE!')+'&url='+enc(u)); }
    },
    { id:'messenger', label:'MESSENGER',
      svg:'<svg viewBox="0 0 24 24" fill="#0084FF"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/></svg>',
      fn: function(f,u){ _save(f); setTimeout(function(){_open('fb-messenger://share?link='+enc(u));},400); }
    },
    { id:'tiktok', label:'TIKTOK',
      svg:'<svg viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/></svg>',
      fn: function(f,u){ _save(f); setTimeout(function(){_open('snssdk1233://');},400); _hint('TIKTOK','+ - UPLOAD - GALLERY'); }
    },
    { id:'more', label:'MORE',
      svg:'<svg viewBox="0 0 24 24" fill="#64D2FF"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>',
      fn: function(f,u){ if(!_native(f,u)) _save(f); }
    }
  ];

  function enc(s){ return encodeURIComponent(s); }
  function _open(url){
    if(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.openLink) window.Telegram.WebApp.openLink(url);
    else window.open(url,'_blank');
  }
  function _native(file,url){
    if(!navigator.canShare||!navigator.canShare({files:[file]})) return false;
    navigator.share({files:[file],title:'NAVA PEACE',text:'Join me on NAVA PEACE',url:url}).catch(function(){});
    return true;
  }
  function _save(file){
    var u=URL.createObjectURL(file);
    var a=document.createElement('a'); a.href=u; a.download='nava-peace-invite.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(u);},1000);
  }
  function _hint(app,step){
    var el=document.getElementById('ns-hint');
    if(el) el.innerHTML='CARD SAVED - OPEN <b>'+app+'</b> - '+step;
  }

  /* QR loader */
  function _loadQR(cb){
    if(window.QRCode){cb();return;}
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    s.onload=cb; document.head.appendChild(s);
  }

  /* Fetch stats from Supabase */
  async function _fetchStats(){
    var stats = { lovers:0, countries:0, doves:0, today:0, days:0 };
    try {
      var sb = (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined')
        ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
      if (!sb) return stats;

      var today = new Date().toISOString().split('T')[0];

      var r1 = await sb.from('peace_votes').select('user_uid', {count:'exact',head:true});
      stats.doves = r1.count || 0;

      var r2 = await sb.rpc('count_distinct_users');
      stats.lovers = r2.data || 0;
      if (!r2.data) {
        var r2b = await sb.from('peace_votes').select('user_uid');
        var uids = new Set((r2b.data||[]).map(function(r){return r.user_uid;}));
        stats.lovers = uids.size;
      }

      var r3 = await sb.from('peace_votes').select('country');
      var ctries = new Set((r3.data||[]).filter(function(r){return r.country;}).map(function(r){return r.country;}));
      stats.countries = ctries.size;

      var r4 = await sb.from('peace_votes').select('id', {count:'exact',head:true}).gte('created_at', today+'T00:00:00Z');
      stats.today = r4.count || 0;

      // Days since launch (from admin_settings or fallback)
      var r5 = await sb.from('admin_settings').select('value').eq('key','launch_date').single();
      var launchDate = r5.data ? r5.data.value.replace(/"/g,'') : '2026-03-08';
      var diff = Math.floor((Date.now() - new Date(launchDate).getTime()) / 86400000);
      stats.days = Math.max(0, diff);

    } catch(e){ console.warn('stats fetch error', e); }
    return stats;
  }

  /* Draw world map dots + peace words */
  function _drawMap(c, x, y, w, h) {
    // Glass panel
    c.save();
    c.beginPath();
    var r=10;
    c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
    c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
    c.fillStyle='rgba(255,255,255,0.12)';
    c.fill();
    c.strokeStyle='rgba(255,255,255,0.2)';
    c.lineWidth=1.5; c.stroke();
    c.clip();

    // Peace words scattered geographically
    var words = [
      {t:'PEACE',   px:0.55, py:0.30, s:13},
      {t:'PAIX',    px:0.42, py:0.28, s:11},
      {t:'PAZ',     px:0.28, py:0.50, s:12},
      {t:'PAZ',     px:0.35, py:0.62, s:10},
      {t:'AMANI',   px:0.52, py:0.60, s:11},
      {t:'SHALOM',  px:0.60, py:0.40, s:10},
      {t:'\u548C\u5E73', px:0.78, py:0.32, s:14},
      {t:'\u5E73\u548C', px:0.82, py:0.45, s:11},
      {t:'\u548C\u5E73', px:0.72, py:0.55, s:10},
      {t:'\u0936\u093E\u0928\u094D\u0924\u093F', px:0.68, py:0.42, s:10},
      {t:'\u0635\u0644\u062D', px:0.57, py:0.38, s:11},
    ];
    words.forEach(function(w2){
      c.font = w2.s+'px Nasalization,Arial,sans-serif';
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.textAlign = 'left';
      c.fillText(w2.t, x + w2.px*w, y + w2.py*h);
    });

    // Country dots
    var dots = [
      {px:0.45,py:0.30,r:18},{px:0.78,py:0.35,r:14},{px:0.28,py:0.48,r:12},
      {px:0.68,py:0.45,r:10},{px:0.55,py:0.58,r:9},{px:0.85,py:0.28,r:8},
      {px:0.35,py:0.32,r:7},{px:0.60,py:0.25,r:6},{px:0.72,py:0.60,r:6},
      {px:0.20,py:0.55,r:5},{px:0.50,py:0.70,r:5},
    ];
    dots.forEach(function(d){
      c.beginPath();
      c.arc(x+d.px*w, y+d.py*h, d.r, 0, Math.PI*2);
      c.fillStyle='rgba(255,255,255,0.18)';
      c.fill();
      c.strokeStyle='rgba(255,255,255,0.35)';
      c.lineWidth=1.5; c.stroke();
    });

    c.restore();
  }

  /* Draw stat box */
  function _drawStat(c, x, y, w, h, value, label) {
    var r=10;
    c.beginPath();
    c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
    c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
    c.fillStyle='rgba(255,255,255,0.12)';
    c.fill();
    c.strokeStyle='rgba(255,255,255,0.18)';
    c.lineWidth=1; c.stroke();

    c.textAlign='center';
    var cx2=x+w/2, cy2=y+h/2;
    c.font='bold 36px Nasalization,Arial,sans-serif';
    c.fillStyle='#FFFFFF';
    c.fillText(String(value), cx2, cy2+4);
    c.font='9px Nasalization,Arial,sans-serif';
    c.fillStyle='rgba(255,255,255,0.55)';
    c.fillText(label.toUpperCase(), cx2, cy2+24);
  }

  /* Generate card */
  function _genCard(refUrl, stats){
    return new Promise(function(resolve){
      _loadQR(function(){
        var W=480, H=780, pad=24, cr=20;
        var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
        var c=cv.getContext('2d');

        // Background gradient
        var bg=c.createLinearGradient(0,0,0,H);
        bg.addColorStop(0,'#3AACDF');
        bg.addColorStop(0.5,'#1E6E9A');
        bg.addColorStop(1,'#0A2A40');
        c.beginPath(); c.moveTo(cr,0); c.lineTo(W-cr,0); c.quadraticCurveTo(W,0,W,cr);
        c.lineTo(W,H-cr); c.quadraticCurveTo(W,H,W-cr,H); c.lineTo(cr,H);
        c.quadraticCurveTo(0,H,0,H-cr); c.lineTo(0,cr); c.quadraticCurveTo(0,0,cr,0);
        c.closePath(); c.fillStyle=bg; c.fill();

        // QR div (hidden)
        var qd=document.createElement('div'); qd.style.cssText='position:fixed;left:-9999px;top:-9999px;width:200px;height:200px;';
        document.body.appendChild(qd);
        try{ new QRCode(qd,{text:refUrl,width:200,height:200,colorDark:'#0A2A40',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M}); }catch(e){}

        fetch(LOGO_URL).then(function(r){return r.blob();}).then(function(b){
          var fr=new FileReader(); fr.onload=function(ev){
            var img=new Image();
            img.onload=function(){ _drawCard(c,W,H,pad,img,qd,stats,refUrl,cv,resolve); };
            img.onerror=function(){ _drawCard(c,W,H,pad,null,qd,stats,refUrl,cv,resolve); };
            img.src=ev.target.result;
          }; fr.readAsDataURL(b);
        }).catch(function(){ _drawCard(c,W,H,pad,null,qd,stats,refUrl,cv,resolve); });
      });
    });
  }

  function _drawCard(c,W,H,pad,logo,qd,stats,refUrl,cv,resolve){
    c.textAlign='center';
    var y=pad+16;

    // Logo
    if(logo){ c.drawImage(logo, W/2-40, y, 80, 80); y+=90; }
    else { y+=20; }

    // NAVA PEACE
    c.font='bold 32px Nasalization,Arial,sans-serif';
    c.fillStyle='#FFFFFF';
    c.fillText('NAVA PEACE', W/2, y); y+=22;

    // Tagline
    c.font='10px Nasalization,Arial,sans-serif';
    c.fillStyle='rgba(255,255,255,0.7)';
    c.fillText('TODAY HUMANITY CHOOSES PEACE', W/2, y); y+=28;

    // Days since launch
    c.font='bold 14px Nasalization,Arial,sans-serif';
    c.fillStyle='rgba(255,255,255,0.9)';
    c.fillText(stats.days+' DAYS SINCE LAUNCH', W/2, y); y+=20;

    // World map
    var mapH=140;
    _drawMap(c, pad, y, W-pad*2, mapH);
    y+=mapH+16;

    // Stats grid (2x2)
    var gw=(W-pad*2-10)/2, gh=70;
    _drawStat(c, pad,      y, gw, gh, stats.lovers,   'PEACE LOVERS');
    _drawStat(c, pad+gw+10,y, gw, gh, stats.countries,'COUNTRIES');
    y+=gh+10;
    _drawStat(c, pad,      y, gw, gh, stats.doves,    'TOTAL DOVES');
    _drawStat(c, pad+gw+10,y, gw, gh, '+'+stats.today,'ACTIONS TODAY');
    y+=gh+20;

    // QR code
    var qc=qd.querySelector('canvas');
    if(qc){
      var qs=140, qx=W/2-qs/2-8, qy=y-8, qw2=qs+16, qh2=qs+16, qr=12;
      c.fillStyle='#FFFFFF';
      c.beginPath(); c.moveTo(qx+qr,qy); c.lineTo(qx+qw2-qr,qy); c.quadraticCurveTo(qx+qw2,qy,qx+qw2,qy+qr);
      c.lineTo(qx+qw2,qy+qh2-qr); c.quadraticCurveTo(qx+qw2,qy+qh2,qx+qw2-qr,qy+qh2);
      c.lineTo(qx+qr,qy+qh2); c.quadraticCurveTo(qx,qy+qh2,qx,qy+qh2-qr);
      c.lineTo(qx,qy+qr); c.quadraticCurveTo(qx,qy,qx+qr,qy); c.closePath(); c.fill();
      c.drawImage(qc, qx+8, qy+8, qs, qs);
    }

    document.body.removeChild(qd);
    cv.toBlob(function(b){ resolve(new File([b],'nava-peace-share.png',{type:'image/png'})); },'image/png');
  }

  /* Bottom sheet */
  function _showSheet(file,refUrl){
    var prev=URL.createObjectURL(file);
    var ov=document.createElement('div'); ov.id='nava-share-overlay';
    var btns=P.map(function(p){
      return '<div class="ns-btn" data-id="'+p.id+'">'+p.svg+'<span>'+p.label+'</span></div>';
    }).join('');
    ov.innerHTML='<div id="nava-share-sheet">'
      +'<div class="ns-handle"></div>'
      +'<p class="ns-title">SHARE THIS CARD</p>'
      +'<div id="ns-card-wrap"><img src="'+prev+'" /></div>'
      +'<button id="ns-save-btn">Download  SAVE TO GALLERY</button>'
      +'<div class="ns-grid">'+btns+'</div>'
      +'<p id="ns-hint">TAP A PLATFORM - CARD SAVED AUTOMATICALLY</p>'
      +'</div>';
    ov.addEventListener('click',function(e){ if(e.target===ov) _close(ov,prev); });
    ov.querySelector('#ns-save-btn').addEventListener('click',function(e){
      e.stopPropagation(); _save(file); _hint('YOUR GALLERY','SAVED');
    });
    ov.querySelectorAll('.ns-btn').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        var id=btn.getAttribute('data-id');
        for(var i=0;i<P.length;i++){ if(P[i].id===id){ P[i].fn(file,refUrl); break; } }
      });
    });
    document.body.appendChild(ov);
  }

  function _close(ov,prev){
    ov.style.animation='nsOvIn .15s ease reverse';
    setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); if(prev) URL.revokeObjectURL(prev); },150);
  }

  /* Main entry point */
  async function open(){
    var refCode = localStorage.getItem('nava_peace_ref_code');
    var refUrl  = refCode ? (APP_URL+'?startapp='+refCode) : BOT_URL;

    // Loading sheet
    var ld=document.createElement('div'); ld.id='nava-share-overlay';
    ld.innerHTML='<div id="nava-share-sheet"><div class="ns-handle"></div><p class="ns-title">GENERATING CARD...</p><div id="ns-card-wrap"><div class="ns-loader">Loading stats...</div></div></div>';
    ld.addEventListener('click',function(e){ if(e.target===ld&&ld.parentNode) ld.parentNode.removeChild(ld); });
    document.body.appendChild(ld);

    try{
      var stats = await _fetchStats();
      var file  = await _genCard(refUrl, stats);
      if(ld.parentNode) ld.parentNode.removeChild(ld);
      _showSheet(file,refUrl);
    }catch(e){
      console.warn('NAVA_SHARE error',e);
      if(ld.parentNode) ld.parentNode.removeChild(ld);
    }
  }

  window.NAVA_SHARE = { open: open };
})();
