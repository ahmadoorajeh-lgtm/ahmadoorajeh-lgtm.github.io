// Portfolio v3 interactions
// 1. Hero role ticker (type / pause / delete loop)  2. Scroll reveals  3. Stat counters
// All effects respect prefers-reduced-motion.

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      counters.forEach((el) => {
        el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
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

  /* ---------- 4. Creative reel: arrow-driven marquee + lightbox ---------- */
  const marquee = document.getElementById('creative-marquee');
  if (marquee) {
    const tracks = [...marquee.querySelectorAll('.marquee-track')];
    const AUTO_SPEED = 46;              // px/second, auto-scroll rate
    const STEP = 242;                   // px per arrow click (~one card + gap)
    const RESUME_DELAY = 2600;          // ms of stillness after an arrow click before auto-scroll resumes
    let trackWidth = 0;
    let offset = 0;
    let target = null;                  // px offset the arrow-tween is easing toward
    let hovering = false;
    let interacting = false;
    let resumeTimer = null;
    let last = null;

    const measure = () => { trackWidth = tracks[0].getBoundingClientRect().width || 1; };
    const wrap = () => { offset = ((offset % trackWidth) + trackWidth) % trackWidth; };
    const paint = () => {
      const t = 'translateX(' + (-offset) + 'px)';
      tracks.forEach((tr) => { tr.style.transform = t; });
    };
    const frame = (now) => {
      if (last === null) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (target !== null) {
        const diff = target - offset;
        if (Math.abs(diff) < 0.5) { offset = target; target = null; }
        else { offset += diff * Math.min(1, dt * 8); }
      } else if (!hovering && !interacting && !reduced) {
        offset += AUTO_SPEED * dt;
      }
      wrap();
      paint();
      requestAnimationFrame(frame);
    };

    measure();
    requestAnimationFrame(frame);
    window.addEventListener('resize', () => { measure(); });

    marquee.addEventListener('mouseenter', () => { hovering = true; });
    marquee.addEventListener('mouseleave', () => { hovering = false; });

    const step = (dir) => {
      target = offset + dir * STEP;
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
