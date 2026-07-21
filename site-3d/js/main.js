// Portfolio v2 — a slide deck, not a scrolling page. The page itself never
// scrolls; advancing (wheel tick, swipe, arrow key, or a dot click) triggers a
// single discrete "go to slide N" state change, and CSS animates the swap.
// That's deliberately NOT continuous scroll-position math — this session's
// earlier bugs (runaway easing, phase-drift) all came from accumulating error
// in continuous scroll math. A discrete index can't drift the same way.

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Slides: discrete scene changes + dot nav + wheel/touch/keyboard ---------- */
  const slides = document.querySelectorAll('.slide');
  const dotsNav = document.getElementById('slide-dots');
  if (slides.length) {
    let current = 0;
    let animating = false;
    const ANIM_MS = 700;

    const dots = [];
    if (dotsNav) {
      slides.forEach((el, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot';
        dot.setAttribute('aria-label', el.dataset.label || ('Slide ' + (i + 1)));
        dot.addEventListener('click', () => goTo(i));
        dotsNav.appendChild(dot);
        dots.push(dot);
      });
    }

    function setDots(index) {
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }

    function goTo(index) {
      if (index < 0 || index >= slides.length || index === current) return;
      if (animating && !reduced) return;
      const forward = index > current;
      const outgoing = slides[current];
      const incoming = slides[index];

      incoming.setAttribute('aria-hidden', 'false');
      outgoing.setAttribute('aria-hidden', 'true');

      if (reduced) {
        outgoing.classList.remove('current');
        incoming.classList.add('current');
        current = index;
        setDots(index);
        return;
      }

      animating = true;
      incoming.classList.add(forward ? 'enter-down' : 'enter-up');
      incoming.style.zIndex = '3';
      void incoming.offsetHeight; // force layout so the start position paints before animating

      // A short setTimeout instead of requestAnimationFrame here: rAF can be paused
      // by the browser for a backgrounded/inactive tab (e.g. the user switches apps
      // mid-transition on their phone), which would leave the swap stuck forever.
      // setTimeout always fires, so the transition can never get permanently wedged.
      setTimeout(() => {
        outgoing.classList.remove('current');
        outgoing.classList.add(forward ? 'exit-up' : 'exit-down');
        incoming.classList.remove('enter-down', 'enter-up');
        incoming.classList.add('current');
      }, 20);

      setTimeout(() => {
        outgoing.classList.remove('exit-up', 'exit-down');
        outgoing.style.zIndex = '';
        incoming.style.zIndex = '';
        animating = false;
      }, ANIM_MS);

      current = index;
      setDots(index);
    }

    // First slide starts visible; every other slide starts hidden from
    // assistive tech until it becomes current.
    slides.forEach((el, i) => el.setAttribute('aria-hidden', i === 0 ? 'false' : 'true'));
    setDots(0);

    const advance = (delta) => goTo(current + delta);

    // Wheel: one tick of real intent = one slide. Trackpads fire many tiny
    // deltaY events per gesture, so `animating` (or the reduced-motion no-op
    // above) is what keeps a single swipe from skipping several slides.
    window.addEventListener('wheel', (e) => {
      const lightbox = document.getElementById('lightbox');
      if (lightbox && !lightbox.hidden) return;
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      advance(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    // Touch: swipe up = next (matches Stories/Reels), swipe down = previous.
    let touchStartY = null;
    window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchend', (e) => {
      const lightbox = document.getElementById('lightbox');
      if (lightbox && !lightbox.hidden) { touchStartY = null; return; }
      if (touchStartY === null) return;
      const dy = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 44) advance(dy > 0 ? 1 : -1);
      touchStartY = null;
    }, { passive: true });

    // Keyboard: arrow/page keys and spacebar, presentation-clicker style.
    document.addEventListener('keydown', (e) => {
      const lightbox = document.getElementById('lightbox');
      if (lightbox && !lightbox.hidden) return;
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); advance(1); }
      else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); advance(-1); }
    });

    // Nav links and hero CTAs point at slide ids (#work, #tools, etc.) — jump
    // to that slide directly instead of letting the browser try to scroll.
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute('href').slice(1);
      const idx = [...slides].findIndex((s) => s.id === id);
      if (idx === -1) return;
      a.addEventListener('click', (e) => { e.preventDefault(); goTo(idx); });
    });
  }

  /* ---------- Tools ring: build once, position each logo around the circle ---------- */
  const ring = document.getElementById('ring');
  if (ring) {
    const tools = [
      ['adobe-after-effects.png', 'After Effects'], ['adobe-premiere.png', 'Premiere Pro'],
      ['canva.png', 'Canva'], ['capcut.png', 'CapCut'], ['zapier.png', 'Zapier'],
      ['make.png', 'Make.com'], ['n8n.png', 'n8n'], ['google.png', 'Google Workspace'],
      ['microsoft.png', 'Microsoft 365'], ['wordpress.png', 'WordPress'], ['notion.png', 'Notion']
    ];
    const radius = 190; // px — distance each logo sits from the ring's centre, out along Z
    const step = 360 / tools.length;
    tools.forEach(([file, name], i) => {
      const item = document.createElement('div');
      item.className = 'ring-item';
      item.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + radius + 'px)';
      const img = document.createElement('img');
      img.src = 'img/tools/' + file;
      img.alt = name;
      img.width = 42; img.height = 42;
      item.appendChild(img);
      ring.appendChild(item);
    });
  }

  /* ---------- Lightbox: view a project image or video full-size ---------- */
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbVideo = document.getElementById('lightbox-video');
    const lbImg = document.getElementById('lightbox-img');
    const lbClose = document.getElementById('lightbox-close');
    let lastFocused = null;
    const open = (btn) => {
      lastFocused = btn;
      if (btn.dataset.video) {
        lbImg.hidden = true; lbImg.removeAttribute('src');
        lbVideo.hidden = false;
        lbVideo.src = btn.dataset.video;
        lbVideo.play().catch(() => {});
      } else {
        lbVideo.hidden = true; lbVideo.pause(); lbVideo.removeAttribute('src'); lbVideo.load();
        lbImg.hidden = false;
        lbImg.src = btn.dataset.img;
        lbImg.alt = btn.dataset.caption || '';
      }
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    };
    const close = () => {
      lightbox.hidden = true;
      lbVideo.pause();
      lbVideo.removeAttribute('src');
      lbVideo.load();
      lbImg.removeAttribute('src');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    };
    document.querySelectorAll('.deck-media .play, .deck-media .zoom, .creative-item').forEach((btn) => {
      btn.addEventListener('click', () => open(btn));
    });
    lbClose.addEventListener('click', close);
    lightbox.querySelector('.lightbox-bg').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox.hidden) close(); });
  }
})();
