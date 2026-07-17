// Portfolio v3 interactions
// 1. Hero role ticker (type / pause / delete loop)  2. Scroll reveals  3. Stat counters
// All effects respect prefers-reduced-motion.

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared image-reveal helper: adds .loaded the instant an <img> actually finishes downloading
  // (or errors), instead of letting it pop in abruptly whenever the network happens to deliver it.
  // A hard 4s fallback guarantees a slow or broken image still becomes visible rather than sitting
  // invisible forever. Used everywhere on the page that shows real photos/logos, not placeholders.
  const revealOnLoad = (imgs) => {
    imgs.forEach((img) => {
      const reveal = () => img.classList.add('loaded');
      if (img.complete) reveal();
      else {
        img.addEventListener('load', reveal, { once: true });
        img.addEventListener('error', reveal, { once: true });
        setTimeout(reveal, 4000);
      }
    });
  };

  /* ---------- 0. Mobile nav toggle ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    };
    const openMenu = () => {
      navLinks.classList.add('open');
      navToggle.setAttribute('aria-expanded', 'true');
    };
    navToggle.addEventListener('click', () => {
      navLinks.classList.contains('open') ? closeMenu() : openMenu();
    });
    // tapping any link (an anchor jump) closes the dropdown
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        closeMenu();
      }
    });
    // resizing past the mobile breakpoint (e.g. rotating a tablet) shouldn't leave it stuck open
    window.addEventListener('resize', () => { if (window.innerWidth > 640) closeMenu(); });
  }

  /* ---------- 1. Hero role ticker ---------- */
  const typeText = document.getElementById('type-text');
  const headline = document.getElementById('hero-headline');
  if (typeText && headline) {
    const phrases = [
      'I run your ads.',
      'I create your content.',
      'I edit your videos.',
      'I write pages that rank.',
      'I automate your busywork.'
    ];
    if (reduced) {
      typeText.textContent = phrases[0];
      headline.classList.add('in');
    } else {
      let p = 0, i = 0, deleting = false, headlineShown = false;
      const tick = () => {
        const phrase = phrases[p];
        if (!deleting) {
          i++;
          typeText.textContent = phrase.slice(0, i);
          if (i === phrase.length) {
            if (!headlineShown) {
              headlineShown = true;
              setTimeout(() => headline.classList.add('in'), 250);
            }
            deleting = true;
            setTimeout(tick, 1600);            // hold the finished phrase
            return;
          }
          setTimeout(tick, 46 + Math.random() * 40);
        } else {
          i--;
          typeText.textContent = phrase.slice(0, i);
          if (i === 0) {
            deleting = false;
            p = (p + 1) % phrases.length;
            setTimeout(tick, 320);
            return;
          }
          setTimeout(tick, 24);
        }
      };
      setTimeout(tick, 400);
      // safety: never leave the headline hidden
      setTimeout(() => headline.classList.add('in'), 3500);
    }
  }

  /* ---------- 2. Scroll reveals ---------- */
  const revealEls = document.querySelectorAll('.reveal:not(#hero-headline)');
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- 3. Counters ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const dur = 1100;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      counters.forEach((el) => {
        el.textContent = (el.dataset.prefix || '') + Number(el.dataset.count).toLocaleString('en-US') + (el.dataset.suffix || '');
      });
    } else {
      const cio = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach((el) => cio.observe(el));
    }
  }

  /* ---------- Tools & platforms: reveal each logo as it loads ---------- */
  revealOnLoad(document.querySelectorAll('.tool-badge img'));

  /* ---------- Tools & platforms: keep both rows gap-free on ANY screen width ----------
     The CSS marquee loops by sliding one track out while its duplicate follows. That is only
     seamless if each track is at least as wide as the row itself — otherwise there's a moment
     where the track has slid past but its duplicate hasn't arrived, which shows as an empty
     gap travelling across the row (this is why the top row gapped but the bottom row, whose
     badges happen to be wider than the viewport, didn't). Instead of hand-balancing badges
     per row — which just moves the problem to whichever row is narrower on the next-wider
     monitor — measure and clone the badge set until every track out-measures its row. */
  const TOOLS_SPEED = 38;   // px per second, identical for both rows — the CSS keyframes slide
                            // one full track width per animation cycle, so a fixed duration made
                            // wider tracks physically move faster (why the bottom row outpaced
                            // the top). Deriving duration from measured width pins the speed,
                            // and IDENTICAL durations keep the two counter-scrolling rows
                            // phase-locked for the conveyor hand-off (row B is row A reversed).
  let lastToolsWidth = null;
  const fillToolsRows = () => {
    if (reduced) return;    // reduced-motion shows a static wrapped pill cloud instead — no
                            // clones or durations needed, and DOM churn would just cause reflow
    const firstRow = document.querySelector('.tools-row');
    if (!firstRow) return;
    const rowWidth = firstRow.getBoundingClientRect().width;
    // mobile browsers fire `resize` when the URL bar collapses on scroll — HEIGHT changes but
    // width doesn't. Rebuilding the tracks on those events restarted the animation mid-scroll,
    // which showed up as the rows visibly snapping while scrolling the page on a phone.
    if (lastToolsWidth !== null && Math.abs(rowWidth - lastToolsWidth) < 1) return;
    lastToolsWidth = rowWidth;
    document.querySelectorAll('.tools-row').forEach((row) => {
      const rowTracks = row.querySelectorAll('.tools-track');
      if (rowTracks.length !== 2) return;
      row.querySelectorAll('.badge-clone').forEach((el) => el.remove());
      const originals = [...rowTracks[0].children];
      let guard = 0;
      while (rowTracks[0].getBoundingClientRect().width < rowWidth && guard < 8) {
        rowTracks.forEach((tr) => {
          originals.forEach((badge) => {
            const clone = badge.cloneNode(true);
            clone.classList.add('badge-clone');
            clone.setAttribute('aria-hidden', 'true');
            tr.appendChild(clone);
            revealOnLoad(clone.querySelectorAll('img'));
          });
        });
        guard++;
      }
      const dur = (rowTracks[0].getBoundingClientRect().width / TOOLS_SPEED).toFixed(2) + 's';
      rowTracks.forEach((tr) => { tr.style.animationDuration = dur; });
    });
  };
  fillToolsRows();
  // one controlled re-measure after web fonts settle (badge widths depend on the font);
  // width-guard above makes this a no-op unless something actually changed
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { lastToolsWidth = null; fillToolsRows(); });
  }
  let toolsResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(toolsResizeTimer);
    toolsResizeTimer = setTimeout(fillToolsRows, 200);
  });

  /* ---------- 4. Creative reel: arrow-driven marquee + lightbox ---------- */
  const marquee = document.getElementById('creative-marquee');
  if (marquee) {
    revealOnLoad(marquee.querySelectorAll('.marquee-track img'));

    const tracks = [...marquee.querySelectorAll('.marquee-track')];
    const AUTO_SPEED = 46;              // px/second, auto-scroll rate
    const STEP = 242;                   // px per arrow click (~one card + gap)
    const RESUME_DELAY = 2600;          // ms of stillness after an arrow click before auto-scroll resumes
    const MAX_QUEUE = STEP * 2.5;       // hard cap on how far a burst of rapid clicks can push the target
                                         // ahead of the ACTUAL current position — without this, clicking fast
                                         // lets the intended destination silently run far ahead while the visible
                                         // gap always looks like a normal single step, then all of that hidden
                                         // distance has to be covered in one go the moment clicking stops
    const MAX_SPEED = 1600;             // px/second ceiling on the tween itself, so even a maxed-out queue
                                         // can never look like it's snapping/flying — worst case it just
                                         // cruises at this brisk-but-calm pace until it arrives
    let trackWidth = 0;
    let offset = 0;
    let target = null;                  // px offset the arrow-tween is easing toward
    let hovering = false;
    let interacting = false;
    let resumeTimer = null;
    let last = null;

    const measure = () => { trackWidth = tracks[0].getBoundingClientRect().width || 1; };
    // offset is a CONTINUOUS position that only ever accumulates — it is never folded back
    // to zero. The fold happens purely at paint time (modulo track width), so the loop seam
    // is invisible and, crucially, an arrow-click target near the seam stays a small, always
    // reachable distance away. (The old version folded `offset` every frame but not `target`,
    // so a click near the seam left the target a full lap ahead — the reel then raced a whole
    // loop, or forever, to catch it. That was the "moving viciously" bug.)
    const paint = () => {
      const x = ((offset % trackWidth) + trackWidth) % trackWidth;
      const t = 'translateX(' + (-x) + 'px)';
      tracks.forEach((tr) => { tr.style.transform = t; });
    };
    const rebase = () => {
      // keep the numbers from growing unboundedly: shift offset AND target down by a whole
      // number of laps together — the difference between them (the tween) is untouched, and
      // the painted position is identical, so this is invisible on screen
      if (Math.abs(offset) > trackWidth * 4) {
        const k = Math.floor(offset / trackWidth) * trackWidth;
        offset -= k;
        if (target !== null) target -= k;
      }
    };
    const frame = (now) => {
      if (last === null) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (target !== null) {
        const diff = target - offset;
        if (Math.abs(diff) < 0.5) { offset = target; target = null; }
        else {
          const wanted = diff * Math.min(1, dt * 8);
          const capped = MAX_SPEED * dt;
          offset += Math.sign(wanted) * Math.min(Math.abs(wanted), capped);
        }
      } else if (!hovering && !interacting && !reduced) {
        offset += AUTO_SPEED * dt;
      }
      rebase();
      paint();
      requestAnimationFrame(frame);
    };

    measure();
    requestAnimationFrame(frame);
    window.addEventListener('resize', () => { measure(); });

    marquee.addEventListener('mouseenter', () => { hovering = true; });
    marquee.addEventListener('mouseleave', () => { hovering = false; });

    const step = (dir) => {
      // clamp against the LIVE offset (not the pending target) — this is what stops a burst of
      // rapid clicks from quietly stacking up a huge backlog that only becomes visible, as a
      // sudden fast catch-up, once the user stops clicking
      const wanted = offset + dir * STEP;
      target = Math.max(offset - MAX_QUEUE, Math.min(offset + MAX_QUEUE, wanted));
      interacting = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { interacting = false; }, RESUME_DELAY);
    };
    const prevBtn = document.getElementById('marquee-prev');
    const nextBtn = document.getElementById('marquee-next');
    if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => step(1));
  }

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImg = document.getElementById('lightbox-img');
    const lbVideo = document.getElementById('lightbox-video');
    const lbCaption = document.getElementById('lightbox-caption');
    const lbClose = document.getElementById('lightbox-close');
    let lastFocused = null;

    const openLightbox = (btn) => {
      lastFocused = btn;
      const isVideo = btn.dataset.type === 'video';
      lbCaption.textContent = btn.dataset.caption || '';
      if (isVideo) {
        lbImg.hidden = true;
        lbImg.src = '';
        lbVideo.hidden = false;
        lbVideo.src = btn.dataset.full;
        lbVideo.currentTime = 0;
        lbVideo.play().catch(() => {});   // ignore autoplay-blocked errors; controls are visible either way
      } else {
        lbVideo.hidden = true;
        lbVideo.pause();
        lbVideo.removeAttribute('src');
        lbVideo.load();
        lbImg.hidden = false;
        lbImg.src = btn.dataset.full;
        lbImg.alt = btn.dataset.caption || '';
      }
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    };
    const closeLightbox = () => {
      lightbox.hidden = true;
      lbImg.src = '';
      lbVideo.pause();
      lbVideo.removeAttribute('src');
      lbVideo.load();
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    };

    // every thumbnail is clickable, including the duplicate loop-track ones (mouse/touch
    // ignore tabindex="-1" — that attribute only keeps duplicates out of keyboard tab order)
    document.querySelectorAll('.cr-item').forEach((btn) => {
      btn.addEventListener('click', () => openLightbox(btn));
    });
    lbClose.addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
  }

  /* ---------- 5. Project estimation calculator ---------- */
  // RATES: adjust these to real pricing. monthly = ongoing partnership base ($/mo),
  // once = one-time project base ($). Scope and timeline multipliers apply to both.
  const RATES = {
    full:    { monthly: 1200, once: 2000 },
    ads:     { monthly: 500,  once: 800 },
    content: { monthly: 600,  once: 900 },
    seo:     { monthly: 450,  once: 700 },
    auto:    { monthly: 250,  once: 800 },
    web:     { monthly: 300,  once: 1200 }
  };
  const estType = document.getElementById('est-type');
  if (estType) {
    const scopeGroup = document.getElementById('est-scope');
    const timeGroup = document.getElementById('est-time');
    const outMonthly = document.getElementById('est-monthly');
    const outOnce = document.getElementById('est-once');
    const activeVal = (group) => parseFloat(group.querySelector('.pill.active').dataset.val);
    const money = (n) => '$' + (Math.round(n / 50) * 50).toLocaleString('en-US');
    const range = (base, mult) => money(base * mult * 0.85) + ' – ' + money(base * mult * 1.2);
    const update = () => {
      const r = RATES[estType.value];
      const mult = activeVal(scopeGroup) * activeVal(timeGroup);
      outMonthly.textContent = range(r.monthly, mult);
      outOnce.textContent = range(r.once, mult);
    };
    [scopeGroup, timeGroup].forEach((group) => {
      group.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        group.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        update();
      });
    });
    estType.addEventListener('change', update);
    update();
  }

  /* ---------- 6. Contact form: validation → mailto → success panel ---------- */
  const form = document.getElementById('contact-form');
  if (form) {
    const fields = {
      name: document.getElementById('cf-name'),
      email: document.getElementById('cf-email'),
      type: document.getElementById('cf-type'),
      budget: document.getElementById('cf-budget'),
      msg: document.getElementById('cf-msg')
    };
    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const mark = (el, bad) => el.classList.toggle('invalid', bad);
    // clear an error as soon as the visitor fixes the field
    Object.values(fields).forEach((el) => {
      el.addEventListener('input', () => mark(el, false));
      el.addEventListener('change', () => mark(el, false));
    });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const bad = [];
      if (!fields.name.value.trim()) bad.push(fields.name);
      if (!emailOk(fields.email.value.trim())) bad.push(fields.email);
      if (!fields.type.value) bad.push(fields.type);
      if (!fields.msg.value.trim()) bad.push(fields.msg);
      Object.values(fields).forEach((el) => mark(el, bad.includes(el)));
      if (bad.length) { bad[0].focus(); return; }

      const subject = encodeURIComponent('[' + fields.type.value + '] enquiry from ' + fields.name.value.trim());
      const body = encodeURIComponent(
        'Name: ' + fields.name.value.trim() +
        '\nEmail: ' + fields.email.value.trim() +
        '\nProject type: ' + fields.type.value +
        '\nBudget: ' + (fields.budget.value || 'Not specified') +
        '\n\nDetails:\n' + fields.msg.value.trim()
      );
      window.location.href = 'mailto:Ahmadoo.rajeh@gmail.com?subject=' + subject + '&body=' + body;
      form.hidden = true;
      const success = document.getElementById('form-success');
      if (success) { success.hidden = false; success.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }
    });
  }
})();
