// Portfolio v2 — scroll-triggered 3D reveals.
// Deliberately NOT continuous scroll-position math: everything here is a discrete
// CSS-transition triggered by IntersectionObserver, the same proven mechanism as
// the main site's `.reveal` class. That choice is intentional — see the note at
// the top of style.css.

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reveal: hero card + work deck ---------- */
  const revealTargets = document.querySelectorAll('.hero-card, .deck-item');
  if (reduced || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Safari on iOS can fire this before the un-revealed state ever paints, skipping
          // the transition entirely. Double rAF guarantees one paint of the hidden state first.
          requestAnimationFrame(() => requestAnimationFrame(() => entry.target.classList.add('in')));
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    revealTargets.forEach((el) => io.observe(el));
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

  /* ---------- Autoplay the muted background-preview videos once visible ---------- */
  document.querySelectorAll('.deck-media video').forEach((v) => {
    const startAt = parseFloat(v.dataset.start || '0');
    let seeked = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          // skip a video's blank/loading intro frames the first time it plays, so the
          // background preview matches the good moment its poster image already shows
          if (!seeked && startAt > 0) {
            seeked = true;
            if (v.readyState >= 1) v.currentTime = startAt;
            else v.addEventListener('loadedmetadata', () => { v.currentTime = startAt; }, { once: true });
          }
          v.play().catch(() => {});
        } else v.pause();
      });
    }, { threshold: 0.4 });
    io.observe(v);
  });
})();
