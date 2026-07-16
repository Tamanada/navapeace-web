// NAVA PEACE — Ambient audio player
// Include on any page. Syncs muted state via localStorage across navigations.
(function () {
  var SRC = 'peace-ambient.mp3';
  var KEY = 'nava_sound_muted';

  var audio   = new Audio(SRC);
  audio.loop   = true;
  audio.volume = 0.30;

  var muted = localStorage.getItem(KEY) === '1';
  audio.muted = muted;

  // ── Floating button ────────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id  = 'nava-sound-btn';
  btn.setAttribute('aria-label', 'Toggle sound');
  btn.style.cssText = [
    'position:fixed',
    'top:14px',
    'right:14px',
    'z-index:99999',
    'width:36px',
    'height:36px',
    'border-radius:50%',
    'border:1px solid rgba(255,255,255,0.18)',
    'background:rgba(10,30,60,0.55)',
    'backdrop-filter:blur(10px)',
    '-webkit-backdrop-filter:blur(10px)',
    'font-size:16px',
    'line-height:1',
    'cursor:pointer',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'box-shadow:0 2px 10px rgba(0,0,0,0.35)',
    'transition:opacity 0.2s,transform 0.15s',
    'padding:0',
  ].join(';');

  function render() {
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title       = muted ? 'Sound off — tap to enable' : 'Sound on — tap to mute';
  }

  function setMuted(val) {
    muted       = !!val;
    audio.muted = muted;
    localStorage.setItem(KEY, muted ? '1' : '0');
    render();
  }

  btn.addEventListener('click', function () {
    setMuted(!muted);
    if (!muted) audio.play().catch(function () {});
  });

  render();

  // ── Autoplay on load ───────────────────────────────────────────────────────
  function tryPlay() {
    if (muted) return;
    audio.play().catch(function () {
      // Autoplay blocked by browser — wait for first user tap then retry
      document.addEventListener('click', function onFirstTap() {
        document.removeEventListener('click', onFirstTap);
        if (!muted) audio.play().catch(function () {});
      }, { once: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(btn);
      tryPlay();
    });
  } else {
    document.body.appendChild(btn);
    tryPlay();
  }
})();
