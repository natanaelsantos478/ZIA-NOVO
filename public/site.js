(function () {
  const nav    = document.getElementById('nav');
  const heroEl = document.getElementById('topo');

  // ── hamburger menu ────────────────────────────────────────────
  const burgerBtn     = document.getElementById('nav-burger');
  const burgerOverlay = document.getElementById('bmenu-overlay');
  const burgerClose   = document.getElementById('bmenu-close');
  const prodBtn       = document.getElementById('bmenu-produtos-btn');
  const prodSection   = prodBtn ? prodBtn.closest('.bmenu-section') : null;

  function openBmenu() {
    burgerOverlay.classList.add('open');
    burgerOverlay.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    burgerBtn.setAttribute('aria-expanded', 'true');
  }
  function closeBmenu() {
    burgerOverlay.classList.remove('open');
    burgerOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    burgerBtn.setAttribute('aria-expanded', 'false');
  }

  if (burgerBtn) burgerBtn.addEventListener('click', openBmenu);
  if (burgerClose) burgerClose.addEventListener('click', closeBmenu);
  if (burgerOverlay) burgerOverlay.addEventListener('click', ev => {
    if (ev.target === burgerOverlay) closeBmenu();
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeBmenu(); });

  // produtos accordion
  if (prodBtn && prodSection) {
    prodBtn.addEventListener('click', () => {
      const isOpen = prodSection.classList.toggle('open');
      prodBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // demo button inside burger menu
  document.querySelectorAll('.bmenu-demo-btn').forEach(btn => {
    btn.addEventListener('click', () => { closeBmenu(); openModal(); });
  });

  // ── parallax targets ──────────────────────────────────────────
  const parEyebrow = document.getElementById('par-eyebrow');
  const parLogo    = document.getElementById('par-logo');
  const parTitle   = document.getElementById('par-title');
  const parSub     = document.getElementById('par-sub');
  const parCtas    = document.getElementById('par-ctas');
  const parStats   = document.getElementById('par-stats');
  const parRings   = document.querySelector('.hero-rings');
  const parArc     = document.querySelector('.hero-arc');

  function doParallax() {
    if (!heroEl) return;
    const s = Math.max(0, window.scrollY);
    if (s > heroEl.offsetHeight * 1.1) return;
    if (parEyebrow) parEyebrow.style.transform = `translateY(${-s * 0.60}px)`;
    if (parLogo)    parLogo.style.transform    = `translateY(${-s * 0.38}px)`;
    if (parTitle)   parTitle.style.transform   = `translateY(${-s * 0.22}px)`;
    if (parSub)     parSub.style.transform     = `translateY(${-s * 0.14}px)`;
    if (parCtas)    parCtas.style.transform    = `translateY(${-s * 0.09}px)`;
    if (parStats)   parStats.style.transform   = `translateY(${-s * 0.04}px)`;
    if (parRings)   parRings.style.transform   = `translate(-50%, calc(-50% + ${s * 0.20}px))`;
    if (parArc)     parArc.style.transform     = `translateX(-50%) translateY(${s * 0.14}px)`;
  }

  window.addEventListener('scroll', doParallax, { passive: true });
  doParallax();

  // ── nav: dark by default (hero is dark); light when over light sections ──
  function updateNav() {
    const scrolled = window.scrollY > 60;
    nav.classList.toggle('scrolled', scrolled);

    let overLight = false;
    document.querySelectorAll('.s-light, .s-parceiros').forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.top <= 64 && r.bottom > 64) overLight = true;
    });
    nav.classList.toggle('light', overLight);
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // ── smooth anchor scroll ──────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', ev => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      ev.preventDefault();
      const offset = (nav ? nav.offsetHeight : 0) + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ── showcase accordion ────────────────────────────────────────
  document.querySelectorAll('.sh-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel  = btn.closest('.sh-panel');
      const isOpen = panel.classList.contains('open');
      document.querySelectorAll('.sh-panel.open').forEach(p => {
        p.classList.remove('open');
        p.querySelector('.sh-trigger').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        panel.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        setTimeout(() => {
          const navH = nav ? nav.offsetHeight : 60;
          const top  = panel.getBoundingClientRect().top + window.scrollY - navH - 16;
          window.scrollTo({ top, behavior: 'smooth' });
        }, 80);
      }
    });
  });

  // ── scroll reveal ─────────────────────────────────────────────
  const revealEls = document.querySelectorAll(
    '.diff-item, .agent-card, .emp-card, .mod-grid li, .bens-grid li, .step, .ps, .fn-col'
  );
  if ('IntersectionObserver' in window && revealEls.length) {
    revealEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity .65s ease ${(i % 4) * 0.07}s, transform .65s ease ${(i % 4) * 0.07}s`;
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    revealEls.forEach(el => io.observe(el));
  }
  const VT_SRCS = [
    'assets/128663-741704878_medium.mp4',
    'assets/223191_medium.mp4',
    'assets/265271_medium.mp4',
    'assets/65562-515098354_medium.mp4',
  ];

  // ── hero background video ────────────────────────────────────
  const bgVideo = document.querySelector('.hero-bg-video');
  if (bgVideo) {
    let bgIdx = 1; // offset para não trocar junto com o do título
    bgVideo.playbackRate = 1.5;
    bgVideo.addEventListener('canplay', () => { bgVideo.play().catch(() => {}); });
    setInterval(() => {
      bgIdx = (bgIdx + 1) % VT_SRCS.length;
      bgVideo.src = VT_SRCS[bgIdx];
      bgVideo.load();
    }, 3000);
  }

  // ── diffs "ZITA" video-through-text ─────────────────────────
  const ztVideo  = document.querySelector('.diffs-zt-video');
  const ztCanvas = document.querySelector('.diffs-zt-canvas');
  const ztText   = document.querySelector('.diffs-zt-text');

  if (ztVideo && ztCanvas && ztText) {
    const ztCtx = ztCanvas.getContext('2d');
    let ztIdx = 2, ztRaf = 0, ztLastTs = 0, ztVisible = false;

    function ztResize() {
      const r = ztText.getBoundingClientRect();
      ztCanvas.width  = Math.max(1, Math.round(r.width  * devicePixelRatio));
      ztCanvas.height = Math.max(1, Math.round(r.height * devicePixelRatio));
    }

    function ztTick(ts) {
      ztRaf = requestAnimationFrame(ztTick);
      if (ts - ztLastTs < 1000 / 12) return; // 12fps — decorativo, poupa CPU
      ztLastTs = ts;
      if (ztVideo.readyState < 2 || ztVideo.paused) return;
      ztCtx.drawImage(ztVideo, 0, 0, ztCanvas.width, ztCanvas.height);
      ztText.style.backgroundImage = 'url(' + ztCanvas.toDataURL('image/jpeg', 0.70) + ')';
    }

    let ztTimer = 0;
    function ztNext() {
      clearTimeout(ztTimer);
      ztIdx = (ztIdx + 1) % VT_SRCS.length;
      ztVideo.src = VT_SRCS[ztIdx];
      ztVideo.load();
      if (ztVisible) ztVideo.play().catch(() => {});
    }

    ztVideo.addEventListener('canplay', () => {
      if (!ztVisible) return;
      ztFitText(); ztResize();
      ztVideo.playbackRate = 1.5;
      ztVideo.play().catch(() => {});
      if (!ztRaf) ztTick(0);
      clearTimeout(ztTimer);
      ztTimer = setTimeout(ztNext, 4000);
    });
    window.addEventListener('resize', () => { ztFitText(); ztResize(); });

    // só ativa quando a seção estiver visível — evita 3 vídeos simultâneos
    const diffsSect = document.querySelector('.s-diffs');
    if (diffsSect && 'IntersectionObserver' in window) {
      const ztIO = new IntersectionObserver(entries => {
        ztVisible = entries[0].isIntersecting;
        if (ztVisible) {
          if (ztVideo.src) { ztVideo.play().catch(() => {}); }
          else { ztVideo.src = VT_SRCS[ztIdx]; ztVideo.load(); }
          if (!ztRaf) ztTick(0);
        } else {
          ztVideo.pause();
          if (ztRaf) { cancelAnimationFrame(ztRaf); ztRaf = 0; }
        }
      }, { threshold: 0.05 });
      ztIO.observe(diffsSect);
    } else {
      ztVisible = true;
      ztVideo.src = VT_SRCS[ztIdx];
      ztVideo.load();
    }
  }

  function ztFitText() {
    const el = document.querySelector('.diffs-zt-text');
    if (!el) return;
    el.style.fontSize = '';
    const vw = window.innerWidth;
    const cw = el.getBoundingClientRect().width;
    if (!cw) return;
    el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * vw / cw) + 'px';
  }
  ztFitText();
  window.addEventListener('resize', ztFitText);

  // ── video through text ───────────────────────────────────────
  const vtVideo  = document.querySelector('.vt-video');
  const vtCanvas = document.querySelector('.vt-canvas');
  const vtEm     = document.querySelector('.vt-em');

  if (vtVideo && vtCanvas && vtEm) {
    const ctx = vtCanvas.getContext('2d');
    let vtIdx = 0, vtRaf = 0, lastTs = 0;

    function vtResize() {
      const r = vtEm.getBoundingClientRect();
      vtCanvas.width  = Math.max(1, Math.round(r.width  * devicePixelRatio));
      vtCanvas.height = Math.max(1, Math.round(r.height * devicePixelRatio));
    }

    function vtTick(ts) {
      vtRaf = requestAnimationFrame(vtTick);
      if (ts - lastTs < 1000 / 24) return;
      lastTs = ts;
      if (vtVideo.readyState < 2 || vtVideo.paused) return;
      ctx.drawImage(vtVideo, 0, 0, vtCanvas.width, vtCanvas.height);
      vtEm.style.backgroundImage = 'url(' + vtCanvas.toDataURL('image/jpeg', 0.75) + ')';
    }

    let vtTimer = 0;

    function vtNext() {
      clearTimeout(vtTimer);
      vtIdx = (vtIdx + 1) % VT_SRCS.length;
      vtVideo.src = VT_SRCS[vtIdx];
      vtVideo.load();
      vtVideo.play().catch(() => {});
    }

    vtVideo.addEventListener('canplay', () => {
      vtResize();
      vtVideo.playbackRate = 1.5;
      vtVideo.play().catch(() => {});
      if (!vtRaf) vtTick(0);
      clearTimeout(vtTimer);
      vtTimer = setTimeout(vtNext, 3000);
    });
    window.addEventListener('resize', vtResize);
  window.addEventListener('resize', vtFitSub);

    vtVideo.src = VT_SRCS[0];
    vtVideo.load();
  }

  // ── fit subtitle to same width as vt-root ────────────────────
  function vtFitSub() {
    const vt  = document.querySelector('.vt-root');
    const sub = document.querySelector('.hero-title-sub');
    if (!vt || !sub) return;
    sub.style.fontSize = '';
    const tw  = vt.getBoundingClientRect().width;
    const cw  = sub.getBoundingClientRect().width;
    if (!cw) return;
    sub.style.fontSize = (parseFloat(getComputedStyle(sub).fontSize) * tw / cw) + 'px';
  }
  vtFitSub();
  window.addEventListener('resize', vtFitSub);

  // ── modal demo ────────────────────────────────────────────
  const SUPA_URL = 'https://tgeomsnxfcqwrxijjvek.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZW9tc254ZmNxd3J4aWpqdmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDAxMjEsImV4cCI6MjA4ODExNjEyMX0.5c_DvW3KlTd1p75oMDXrRZNmggFrVUbwO9Dk0fqapD4';

  const modalEl = document.getElementById('modal-demo');
  const formEl  = document.getElementById('form-demo');

  function openModal()  { modalEl.classList.add('open');    document.body.style.overflow = 'hidden'; }
  function closeModal() { modalEl.classList.remove('open'); document.body.style.overflow = ''; }

  // abre ao clicar em qualquer link #contato ou botão de demonstração
  document.querySelectorAll('a[href="#contato"], .nav-cta').forEach(a => {
    a.addEventListener('click', ev => { ev.preventDefault(); openModal(); });
  });
  const closeBtn = document.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modalEl) modalEl.addEventListener('click', ev => { if (ev.target === modalEl) closeModal(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeModal(); });

  if (formEl) {
    formEl.addEventListener('submit', async ev => {
      ev.preventDefault();
      const msgEl = document.getElementById('fd-msg');
      const btn   = formEl.querySelector('.modal-btn');
      const nome  = document.getElementById('fd-nome').value.trim();
      const email = document.getElementById('fd-email').value.trim();
      const tel   = document.getElementById('fd-tel').value.trim();
      const emp   = document.getElementById('fd-emp').value.trim();

      if (!nome || !email) {
        msgEl.textContent = 'Preencha ao menos nome e e-mail.';
        msgEl.className = 'fd-msg err';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Enviando…';
      msgEl.textContent = '';
      msgEl.className = 'fd-msg';

      try {
        const res = await fetch(SUPA_URL + '/rest/v1/rpc/create_demo_lead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPA_KEY,
            'Authorization': 'Bearer ' + SUPA_KEY
          },
          body: JSON.stringify({ p_nome: nome, p_email: email, p_telefone: tel || null, p_empresa: emp || null })
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg  = (body.message || '').toLowerCase();
          if (msg.includes('rate_limit_email'))
            throw new Error('Você já enviou uma solicitação recentemente. Entraremos em contato em breve.');
          if (msg.includes('rate_limit_global'))
            throw new Error('Muitas solicitações no momento. Tente novamente em alguns minutos.');
          throw new Error('server');
        }
        msgEl.textContent = '✓ Solicitação recebida! Entraremos em contato em breve.';
        msgEl.className = 'fd-msg ok';
        formEl.reset();
        setTimeout(closeModal, 3500);
      } catch (err) {
        msgEl.textContent = err.message !== 'server'
          ? err.message
          : 'Não foi possível enviar. Tente pelo WhatsApp ou e-mail.';
        msgEl.className = 'fd-msg err';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Solicitar demonstração →';
      }
    });
  }

})();
