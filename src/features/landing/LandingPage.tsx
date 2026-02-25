import React, { useEffect } from 'react';

// Custom element declaration for model-viewer to avoid TypeScript errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

export default function LandingPage() {
  useEffect(() => {
    // 3D Model Interaction
    const handleMouseMove = (event: MouseEvent) => {
      const model = document.querySelector('#hero-model') as any;
      if (!model) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 90;
      const y = (event.clientY / window.innerHeight - 0.5) * 90 + 90;
      model.cameraOrbit = `${x}deg ${y}deg auto`;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Navbar Scroll Effect
    const handleScroll = () => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    };
    window.addEventListener('scroll', handleScroll);

    // Intersection Observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

    // 3D Tilt Effect
    const handleTilt = (e: MouseEvent) => {
        const cards = document.querySelectorAll('.card-3d') as NodeListOf<HTMLElement>;
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.top > window.innerHeight || rect.bottom < 0) return;

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (
                e.clientX >= rect.left - 50 &&
                e.clientX <= rect.right + 50 &&
                e.clientY >= rect.top - 50 &&
                e.clientY <= rect.bottom + 50
            ) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const relativeX = Math.min(Math.max(x - centerX, -centerX), centerX);
                const relativeY = Math.min(Math.max(y - centerY, -centerY), centerY);
                const rotateX = (relativeY / centerY) * -10;
                const rotateY = (relativeX / centerX) * 10;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            } else {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            }
        });
    };
    document.addEventListener('mousemove', handleTilt);

    const handleMouseLeave = () => {
         const cards = document.querySelectorAll('.card-3d') as NodeListOf<HTMLElement>;
         cards.forEach(card => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
         });
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('mousemove', handleTilt);
        document.removeEventListener('mouseleave', handleMouseLeave);
        observer.disconnect();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const target = e.target as HTMLFormElement;
      const name = target.querySelector('#name') as HTMLInputElement;
      const email = target.querySelector('#email') as HTMLInputElement;
      const company = target.querySelector('#company') as HTMLInputElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;

      let isValid = true;
      [name, email, company].forEach(input => {
          if (!input.value.trim()) {
              input.classList.add('error');
              setTimeout(() => input.classList.remove('error'), 500);
              isValid = false;
          }
      });

      if (!isValid) return;

      if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner"></span> Enviando...';
      }

      setTimeout(() => {
          const formContainer = document.getElementById('form-container');
          const successMessage = document.getElementById('success-message');
          if (formContainer) formContainer.style.display = 'none';
          if (successMessage) successMessage.style.display = 'block';
          target.reset();
      }, 1500);
  };

  const handleMenuToggle = () => {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    }
  };

  // Inline CSS derived from the original HTML style block
  // Note: For a true refactor, these should be in a CSS file or CSS-in-JS.
  // We'll use a style tag here to keep it self-contained as per "migrating content" instruction
  // but converting global styles is tricky in scoped components.
  // Ideally, we should move the CSS to a proper stylesheet.
  // Given constraints "NÃO altere o design", I will include the styles in a style tag.

  return (
    <>
      <style>{`
        /* CSS Copied from public/landing.html */
        :root {
            --color-bg-light: #ffffff;
            --color-bg-off: #f8f8ff;
            --color-primary: #2563eb;
            --color-secondary: #7c3aed;
            --color-accent: #ec4899;
            --color-text-main: #0f172a;
            --color-text-sec: #64748b;
            --font-display: 'Plus Jakarta Sans', sans-serif;
            --font-body: 'Inter', sans-serif;
            --gradient-main: linear-gradient(135deg, #2563eb, #7c3aed, #ec4899);
            --gradient-text: linear-gradient(135deg, #2563eb, #7c3aed, #ec4899);
            --gradient-button: linear-gradient(135deg, #2563eb, #7c3aed, #ec4899);
            --gradient-border: linear-gradient(135deg, #2563eb, #7c3aed, #ec4899);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; font-size: 16px; }
        body { font-family: var(--font-body); background-color: var(--color-bg-light); color: var(--color-text-main); overflow-x: hidden; line-height: 1.5; }
        h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); font-weight: 800; line-height: 1.2; }
        a { text-decoration: none; color: inherit; transition: all 0.3s ease; }
        ul { list-style: none; }
        @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0); } }
        @keyframes floatReverse { 0% { transform: translateY(0); } 50% { transform: translateY(20px); } 100% { transform: translateY(0); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes meshMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-on-scroll { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
        .animate-on-scroll.visible { opacity: 1; transform: none; }
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem; border-radius: 100px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.3s ease; }
        .btn-primary { background: var(--gradient-button); color: white; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3); border: none; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4); }
        .btn-outline { background: transparent; color: var(--color-text-main); border: 2px solid transparent; background-image: linear-gradient(white, white), var(--gradient-border); background-origin: border-box; background-clip: padding-box, border-box; }
        .btn-outline:hover { background-image: linear-gradient(#f0f9ff, #f0f9ff), var(--gradient-border); }
        .text-gradient { background: var(--gradient-text); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .navbar { position: fixed; top: 0; left: 0; width: 100%; height: 70px; padding: 0 5%; z-index: 1000; display: flex; align-items: center; justify-content: space-between; background: transparent; transition: all 0.3s ease; }
        .navbar.scrolled { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0, 0, 0, 0.08); box-shadow: 0 1px 40px rgba(0, 0, 0, 0.06); }
        .logo { font-size: 1.8rem; font-weight: 800; font-family: var(--font-display); display: flex; align-items: center; gap: 4px; }
        .logo span:first-child { background: var(--gradient-text); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .logo span:last-child { color: var(--color-text-sec); font-weight: 400; font-size: 1.8rem; }
        .nav-links { display: flex; gap: 2rem; }
        .nav-links a { color: var(--color-text-sec); font-weight: 500; font-size: 0.95rem; }
        .nav-links a:hover { background: var(--gradient-text); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .nav-actions { display: flex; gap: 1rem; align-items: center; }
        .menu-toggle { display: none; flex-direction: column; justify-content: space-between; width: 24px; height: 18px; cursor: pointer; z-index: 1001; }
        .menu-toggle span { display: block; height: 2px; width: 100%; background-color: var(--color-text-main); border-radius: 2px; transition: all 0.3s ease; }
        @media (max-width: 768px) {
            .nav-links { display: none; position: absolute; top: 70px; left: 0; width: 100%; background: white; flex-direction: column; padding: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-bottom: 1px solid rgba(0,0,0,0.05); }
            .nav-links.active { display: flex; }
            .nav-actions { display: none; }
            .menu-toggle { display: flex; }
            .menu-toggle.active span:nth-child(1) { transform: translateY(8px) rotate(45deg); }
            .menu-toggle.active span:nth-child(2) { opacity: 0; }
            .menu-toggle.active span:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
        }
        .hero { position: relative; min-height: 100vh; padding-top: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(circle at 20% 30%, rgba(37, 99, 235, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.05) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.05) 0%, transparent 50%); background-size: 200% 200%; animation: meshMove 15s ease infinite; }
        .orb { position: absolute; border-radius: 50%; z-index: -1; }
        .orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, var(--color-primary), var(--color-secondary)); top: -100px; left: -100px; filter: blur(80px); opacity: 0.15; animation: float 6s ease-in-out infinite; }
        .orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, var(--color-secondary), var(--color-accent)); bottom: -50px; right: -50px; filter: blur(80px); opacity: 0.15; animation: floatReverse 8s ease-in-out infinite; }
        .orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, var(--color-accent), var(--color-primary)); top: 40%; left: 50%; transform: translate(-50%, -50%); filter: blur(60px); opacity: 0.1; animation: float 10s ease-in-out infinite; }
        .hero-content { position: relative; z-index: 10; text-align: center; max-width: 900px; padding: 0 1.5rem; }
        .hero-badge { display: inline-flex; align-items: center; padding: 0.5rem 1rem; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 100px; margin-bottom: 2rem; font-size: 0.85rem; font-weight: 600; }
        .hero-badge span { background: var(--gradient-text); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .hero-title { font-size: clamp(3rem, 6vw, 5rem); line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 1.5rem; color: var(--color-text-main); }
        .hero-subtitle { font-size: 1.2rem; line-height: 1.6; color: var(--color-text-sec); max-width: 600px; margin: 0 auto 2.5rem; }
        .hero-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .btn-hero-primary { background: var(--gradient-button); color: white; padding: 1rem 2.5rem; border-radius: 100px; font-size: 1rem; font-weight: 600; box-shadow: 0 8px 30px rgba(124, 58, 237, 0.3); border: none; cursor: pointer; transition: all 0.3s ease; }
        .btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(124, 58, 237, 0.5); }
        .btn-hero-secondary { background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); border: 1px solid rgba(0, 0, 0, 0.1); color: var(--color-text-main); padding: 1rem 2rem; border-radius: 100px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
        .btn-hero-secondary:hover { background: white; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
        .hero-stats { margin-top: 3rem; display: flex; justify-content: center; align-items: center; gap: 1rem; color: var(--color-text-sec); font-size: 0.9rem; flex-wrap: wrap; }
        .hero-stats span { font-weight: 700; background: var(--gradient-text); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .stat-dot { color: #cbd5e1; }
        .social-proof { padding: 4rem 5%; background: var(--color-bg-light); text-align: center; overflow: hidden; }
        .social-label { color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2rem; font-weight: 600; }
        .marquee-container { width: 100%; overflow: hidden; white-space: nowrap; position: relative; }
        .marquee-container::before, .marquee-container::after { content: ""; position: absolute; top: 0; width: 150px; height: 100%; z-index: 2; }
        .marquee-container::before { left: 0; background: linear-gradient(to right, white, transparent); }
        .marquee-container::after { right: 0; background: linear-gradient(to left, white, transparent); }
        .marquee-track { display: inline-block; animation: marquee 30s linear infinite; }
        .company-logo { display: inline-block; margin: 0 2rem; font-size: 1.3rem; font-weight: 700; color: #cbd5e1; font-family: var(--font-display); }
        .section-problem { padding: 8rem 5%; background-color: var(--color-bg-off); }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
        .problem-tag { font-size: 0.85rem; font-weight: 600; color: #ef4444; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; display: block; }
        .section-title { font-size: clamp(2rem, 4vw, 3rem); color: var(--color-text-main); margin-bottom: 2rem; font-weight: 800; }
        .problem-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0; color: var(--color-text-sec); font-size: 1.05rem; }
        .problem-icon { color: #ef4444; font-weight: 700; }
        .solution-card { background: linear-gradient(135deg, #0f172a, #1e1b4b); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 2.5rem; color: white; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3); }
        .solution-badge { display: inline-block; padding: 0.35rem 1rem; background: var(--gradient-button); border-radius: 100px; font-size: 0.8rem; font-weight: 700; margin-bottom: 1.5rem; }
        .solution-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; font-size: 1.05rem; color: #e2e8f0; }
        .solution-icon { background: var(--gradient-text); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 800; }
        .section-modules { padding: 8rem 5%; background: linear-gradient(to bottom, #0f172a, #1e1b4b); color: white; }
        .modules-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-top: 4rem; }
        .card-3d { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 2rem; cursor: default; transition: transform 0.1s ease-out; backdrop-filter: blur(5px); height: 100%; }
        .module-emoji { font-size: 3rem; margin-bottom: 1rem; display: block; }
        .module-title { font-size: 1.25rem; margin-bottom: 0.5rem; font-weight: 700; }
        .module-desc { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.6; }
        .module-badge { display: inline-block; font-size: 0.75rem; background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 0.25rem 0.75rem; border-radius: 100px; font-weight: 600; }
        .section-steps { padding: 8rem 5%; background: white; }
        .steps-container { display: flex; justify-content: space-between; gap: 2rem; position: relative; margin-top: 4rem; }
        .steps-container::before { content: ''; position: absolute; top: 50px; left: 0; width: 100%; height: 2px; background-image: linear-gradient(to right, #cbd5e1 50%, transparent 50%); background-size: 20px 1px; background-repeat: repeat-x; z-index: 0; }
        .step-item { position: relative; z-index: 1; background: white; padding-right: 2rem; flex: 1; }
        .step-number { font-size: 4rem; font-weight: 800; background: var(--gradient-text); -webkit-background-clip: text; background-clip: text; color: transparent; opacity: 0.3; line-height: 1; margin-bottom: 1rem; }
        .section-audience { padding: 8rem 5%; background: var(--color-bg-off); }
        .audience-card-light { border: 2px solid #e2e8f0; border-radius: 24px; padding: 3rem; height: 100%; background: white; transition: all 0.3s ease; }
        .audience-card-light:hover { border-color: var(--color-primary); box-shadow: 0 10px 40px rgba(37, 99, 235, 0.1); }
        .audience-card-dark { background: linear-gradient(135deg, #1e3a8a, #4c1d95); border-radius: 24px; padding: 3rem; height: 100%; color: white; }
        .audience-icon { font-size: 3rem; margin-bottom: 1.5rem; display: block; }
        .check-list { margin: 2rem 0; }
        .check-item { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; font-weight: 500; }
        .section-testimonials { padding: 8rem 5%; background: var(--color-bg-off); }
        .testimonial-card { background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 2rem; transition: all 0.3s ease; }
        .testimonial-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
        .stars { color: #fbbf24; margin-bottom: 1rem; letter-spacing: 2px; }
        .quote { font-style: italic; color: #374151; margin-bottom: 1.5rem; line-height: 1.6; }
        .client-info { display: flex; align-items: center; gap: 1rem; }
        .avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.2rem; }
        .section-contact { padding: 8rem 5%; background: linear-gradient(135deg, #0f172a, #1e1b4b, #2d1b69); color: white; }
        .contact-form-card { background: white; border-radius: 24px; padding: 2.5rem; box-shadow: 0 25px 60px rgba(0,0,0,0.3); color: var(--color-text-main); }
        .form-input { width: 100%; padding: 0.875rem 1rem; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; font-family: var(--font-body); outline: none; transition: all 0.3s ease; margin-bottom: 1rem; color: var(--color-text-main); }
        .form-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
        .form-input.error { border-color: #ef4444; animation: shake 0.4s ease-in-out; }
        .btn-submit { width: 100%; padding: 1rem; background: var(--gradient-button); color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s ease; }
        .btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .spinner { display: inline-block; width: 1.2rem; height: 1.2rem; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; margin-right: 0.5rem; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }
        .success-state { text-align: center; padding: 2rem 0; animation: fadeSlideUp 0.5s ease-out; }
        .success-icon { font-size: 4rem; color: #22c55e; margin-bottom: 1rem; display: block; }
        .footer { background: #030712; padding: 4rem 5% 2rem; color: #94a3b8; font-size: 0.9rem; }
        .footer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; margin-bottom: 3rem; }
        .footer-title { color: white; font-weight: 600; margin-bottom: 1.5rem; display: block; }
        .footer-links li { margin-bottom: 0.75rem; }
        .footer-links a { color: #94a3b8; transition: color 0.2s; }
        .footer-links a:hover { color: white; }
        .social-icon { display: inline-flex; width: 36px; height: 36px; background: rgba(255,255,255,0.05); border-radius: 50%; align-items: center; justify-content: center; margin-right: 0.5rem; transition: background 0.3s; }
        .social-icon:hover { background: var(--gradient-button); color: white; }
        .footer-bottom { padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        @media (max-width: 1024px) { .modules-grid, .footer-grid { grid-template-columns: repeat(2, 1fr); } .steps-container::before { display: none; } }
        @media (max-width: 768px) { .grid-2, .steps-container, .client-info { grid-template-columns: 1fr; flex-direction: column; } .modules-grid, .footer-grid { grid-template-columns: 1fr; } .step-item { padding-right: 0; margin-bottom: 2rem; text-align: center; } .section-title { font-size: 2rem; } }
      `}</style>

      <nav className="navbar" id="navbar">
        <div className="logo">
            <span>ZIA</span><span>mind</span>
        </div>

        <div className="nav-links" id="navLinks">
            <a href="#produto">Produto</a>
            <a href="#solucoes">Soluções</a>
            <a href="#sobre">Sobre</a>
            <a href="#contato">Contato</a>
        </div>

        <div className="nav-actions">
            <a href="/app" className="btn btn-outline">Entrar</a>
            <a href="/app" className="btn btn-primary">Criar conta</a>
        </div>

        <div className="menu-toggle" id="menuToggle" onClick={handleMenuToggle}>
            <span></span>
            <span></span>
            <span></span>
        </div>
      </nav>

      <section className="hero">
        <model-viewer id="hero-model" src="/isomatrix_glitch.glb" disable-zoom disable-pan style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none'}}></model-viewer>

        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>

        <div className="hero-content animate-on-scroll" style={{position: 'relative', zIndex: 10, padding: '2rem', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'}}>
            <div className="hero-badge">
                ✦ <span>IA de nova geração</span>
            </div>

            <h1 className="hero-title">
                Uma mente.<br />
                <span className="text-gradient">Todos os sistemas.</span><br />
                Zero fricção.
            </h1>

            <p className="hero-subtitle">
                ZIA Mind conecta CRM, ERP, EAM, RH e Logística
                em uma única inteligência que aprende, decide
                e evolui com o seu negócio.
            </p>

            <div className="hero-buttons">
                <button onClick={() => document.getElementById('contato')?.scrollIntoView({behavior: 'smooth'})} className="btn-hero-primary">
                    Falar com um Consultor →
                </button>
                <button className="btn-hero-secondary">
                    ▶ Ver como funciona
                </button>
            </div>

            <div className="hero-stats">
                <div><span>500+</span> empresas</div>
                <div className="stat-dot">·</div>
                <div><span>32</span> integrações</div>
                <div className="stat-dot">·</div>
                <div><span>99.9%</span> uptime</div>
            </div>
        </div>
      </section>

      <section className="social-proof">
        <p className="social-label animate-on-scroll">Confiado por empresas que crescem</p>

        <div className="marquee-container animate-on-scroll">
            <div className="marquee-track">
                <span className="company-logo">Construtora Alpha</span>
                <span className="company-logo">MedGroup</span>
                <span className="company-logo">LogiTech</span>
                <span className="company-logo">FoodCorp</span>
                <span className="company-logo">EduMax</span>
                <span className="company-logo">RetailPro</span>
                <span className="company-logo">FinanceHub</span>
                <span className="company-logo">BuildTech</span>

                <span className="company-logo">Construtora Alpha</span>
                <span className="company-logo">MedGroup</span>
                <span className="company-logo">LogiTech</span>
                <span className="company-logo">FoodCorp</span>
                <span className="company-logo">EduMax</span>
                <span className="company-logo">RetailPro</span>
                <span className="company-logo">FinanceHub</span>
                <span className="company-logo">BuildTech</span>

                <span className="company-logo">Construtora Alpha</span>
                <span className="company-logo">MedGroup</span>
                <span className="company-logo">LogiTech</span>
                <span className="company-logo">FoodCorp</span>
                <span className="company-logo">EduMax</span>
                <span className="company-logo">RetailPro</span>
                <span className="company-logo">FinanceHub</span>
                <span className="company-logo">BuildTech</span>
            </div>
        </div>
      </section>

      <section className="section-problem" id="solucoes">
        <div className="grid-2 animate-on-scroll">
            <div className="problem-column">
                <span className="problem-tag">O problema</span>
                <h2 className="section-title">Seus dados espalhados por 12 sistemas?</h2>

                <div className="problem-list">
                    <div className="problem-item">
                        <span className="problem-icon">✗</span>
                        <span>Planilhas sempre desatualizadas</span>
                    </div>
                    <div className="problem-item">
                        <span className="problem-icon">✗</span>
                        <span>Dados duplicados entre sistemas</span>
                    </div>
                    <div className="problem-item">
                        <span className="problem-icon">✗</span>
                        <span>Relatórios que nunca batem</span>
                    </div>
                    <div className="problem-item">
                        <span className="problem-icon">✗</span>
                        <span>Equipes com informações diferentes</span>
                    </div>
                    <div className="problem-item">
                        <span className="problem-icon">✗</span>
                        <span>Integrações quebrando todo mês</span>
                    </div>
                </div>
            </div>

            <div className="solution-column">
                <div className="solution-card card-3d">
                    <div className="solution-badge">ZIA Mind</div>
                    <h3 className="section-title" style={{fontSize: '2rem', color: 'white'}}>Uma mente que conecta tudo</h3>

                    <div className="solution-list">
                        <div className="solution-item">
                            <span className="solution-icon">✓</span>
                            <span>Dados sincronizados em tempo real</span>
                        </div>
                        <div className="solution-item">
                            <span className="solution-icon">✓</span>
                            <span>IA que identifica inconsistências</span>
                        </div>
                        <div className="solution-item">
                            <span className="solution-icon">✓</span>
                            <span>Relatórios unificados automaticamente</span>
                        </div>
                        <div className="solution-item">
                            <span className="solution-icon">✓</span>
                            <span>Todos falam com a mesma informação</span>
                        </div>
                        <div className="solution-item">
                            <span className="solution-icon">✓</span>
                            <span>Integrações nativas, sem manutenção</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <section className="section-modules" id="produto">
        <div style={{textAlign: 'center'}} className="animate-on-scroll">
            <span className="text-gradient" style={{fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem'}}>O que está incluído</span>
            <h2 className="section-title" style={{color: 'white', marginTop: '1rem', marginBottom: '0.5rem'}}>Tudo que sua empresa precisa</h2>
            <p style={{color: '#94a3b8', fontSize: '1.2rem'}}>Módulos integrados, não softwares separados</p>
        </div>

        <div className="modules-grid animate-on-scroll">
            <div className="card-3d">
                <span className="module-emoji">🧠</span>
                <h3 className="module-title">CRM + IA</h3>
                <p className="module-desc">Vendas com coaching em tempo real</p>
                <span className="module-badge">Incluído</span>
            </div>
            <div className="card-3d">
                <span className="module-emoji">🏗</span>
                <h3 className="module-title">ERP</h3>
                <p className="module-desc">Financeiro, fiscal e contábil unificados</p>
                <span class="module-badge">Incluído</span>
            </div>
            <div className="card-3d">
                <span className="module-emoji">🔧</span>
                <h3 className="module-title">EAM</h3>
                <p className="module-desc">Ativos, manutenção e IoT</p>
                <span class="module-badge">Incluído</span>
            </div>
            <div className="card-3d">
                <span className="module-emoji">👥</span>
                <h3 className="module-title">RH</h3>
                <p className="module-desc">Pessoas, folha e performance</p>
                <span class="module-badge">Incluído</span>
            </div>
            <div className="card-3d">
                <span className="module-emoji">🚛</span>
                <h3 className="module-title">Logística</h3>
                <p className="module-desc">Frota, fretes e supply chain</p>
                <span class="module-badge">Incluído</span>
            </div>
            <div className="card-3d">
                <span className="module-emoji">📊</span>
                <h3 className="module-title">Analytics</h3>
                <p className="module-desc">BI com IA preditiva</p>
                <span class="module-badge">Incluído</span>
            </div>
            <div className="card-3d">
              <div style={{fontSize: '48px', marginBottom: '1rem'}}>✅</div>
              <h3 style={{color: 'white', fontWeight: 700, marginBottom: '0.5rem'}}>SGQ | Qualidade e Compliance</h3>
              <p style={{color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1rem'}}>Gestão de documentos, auditorias, riscos e não conformidades (CAPA).</p>
              <ul style={{color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem', paddingLeft: '1.5rem', listStyleType: 'disc'}}>
                <li>Controle de POPs</li>
                <li>Auditorias e CAPA</li>
                <li>Matriz de Risco</li>
                <li>Calibração</li>
              </ul>
              <span style={{background: 'linear-gradient(to right, #22c55e, #16a34a)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600}}>Incluído</span>
            </div>
        </div>
      </section>

      <section className="section-steps" id="sobre">
        <div style={{textAlign: 'center'}} className="animate-on-scroll">
            <h2 className="section-title">Do caos à clareza em 3 passos</h2>
            <p style={{color: '#64748b', fontSize: '1.2rem'}}>Simples de implementar, poderoso para usar.</p>
        </div>

        <div className="steps-container animate-on-scroll">
            <div className="step-item">
                <div className="step-number">01</div>
                <h3 style={{fontSize: '1.5rem', color: 'var(--color-text-main)', marginBottom: '0.5rem'}}>Conecte seus dados</h3>
                <p style={{color: 'var(--color-text-sec)'}}>Integramos com seus sistemas atuais ou importamos seus dados históricos em minutos.</p>
            </div>
            <div className="step-item">
                <div className="step-number">02</div>
                <h3 style={{fontSize: '1.5rem', color: 'var(--color-text-main)', marginBottom: '0.5rem'}}>Treine a ZIA</h3>
                <p style={{color: 'var(--color-text-sec)'}}>Nossa IA analisa seus processos e aprende como sua empresa opera automaticamente.</p>
            </div>
            <div className="step-item">
                <div className="step-number">03</div>
                <h3 style={{fontSize: '1.5rem', color: 'var(--color-text-main)', marginBottom: '0.5rem'}}>Operação Autônoma</h3>
                <p style={{color: 'var(--color-text-sec)'}}>Receba insights, automações e relatórios unificados sem esforço manual.</p>
            </div>
        </div>
      </section>

      <section className="section-audience">
        <div style={{textAlign: 'center', marginBottom: '3rem'}} className="animate-on-scroll">
            <h2 className="section-title">Para empresas de todos os tamanhos</h2>
        </div>

        <div className="grid-2 animate-on-scroll">
            <div className="audience-card-light">
                <div className="audience-icon">🏪</div>
                <span style={{color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.9rem'}}>Pequenas empresas</span>
                <h3 style={{fontSize: '1.75rem', margin: '1rem 0', color: 'var(--color-text-main)'}}>Do MEI à empresa com 50 funcionários</h3>

                <div className="check-list">
                    <div className="check-item"><span style={{color: 'var(--color-primary)'}}>✓</span> Todos os softwares por um único preço</div>
                    <div className="check-item"><span style={{color: 'var(--color-primary)'}}>✓</span> Sem TI interna necessária</div>
                    <div className="check-item"><span style={{color: 'var(--color-primary)'}}>✓</span> Setup em minutos</div>
                    <div className="check-item"><span style={{color: 'var(--color-primary)'}}>✓</span> Suporte incluído</div>
                </div>

                <button className="btn btn-outline" style={{width: '100%', borderColor: 'var(--color-primary)', color: 'var(--color-primary)'}}>Começar agora →</button>
            </div>

            <div className="audience-card-dark">
                <div className="audience-icon">🏢</div>
                <span style={{color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.9rem'}}>Médias e grandes</span>
                <h3 style={{fontSize: '1.75rem', margin: '1rem 0', color: 'white'}}>Enterprise & Holdings</h3>

                <div className="check-list">
                    <div className="check-item"><span style={{color: 'var(--color-accent)'}}>✓</span> Centralização de sistemas legados</div>
                    <div className="check-item"><span style={{color: 'var(--color-accent)'}}>✓</span> IA treinada nos seus processos</div>
                    <div className="check-item"><span style={{color: 'var(--color-accent)'}}>✓</span> Multi-empresa, multi-filial</div>
                    <div className="check-item"><span style={{color: 'var(--color-accent)'}}>✓</span> SLA e suporte dedicado</div>
                </div>

                <button className="btn" style={{width: '100%', background: 'white', color: 'var(--color-text-main)'}}>Falar com especialista →</button>
            </div>
        </div>
      </section>

      <section className="section-testimonials">
        <div style={{textAlign: 'center', marginBottom: '4rem'}} className="animate-on-scroll">
            <h2 className="section-title">O que nossos clientes dizem</h2>
        </div>

        <div className="modules-grid animate-on-scroll">
            <div className="testimonial-card">
                <div className="stars">★★★★★</div>
                <p className="quote">"Reduzimos 40% do tempo em relatórios. O ZIA faz em segundos o que levava horas."</p>
                <div className="client-info">
                    <div className="avatar" style={{background: 'linear-gradient(135deg, #ef4444, #f97316)'}}>R</div>
                    <div>
                        <div style={{fontWeight: 700, color: 'var(--color-text-main)'}}>Ricardo M.</div>
                        <div style={{fontSize: '0.85rem', color: '#64748b'}}>CEO | Construtora Alpha</div>
                    </div>
                </div>
            </div>

            <div className="testimonial-card">
                <div className="stars">★★★★★</div>
                <p className="quote">"Finalmente um sistema que minha equipe realmente usa. Simples e poderoso ao mesmo tempo."</p>
                <div className="client-info">
                    <div className="avatar" style={{background: 'linear-gradient(135deg, #3b82f6, #06b6d4)'}}>C</div>
                    <div>
                        <div style={{fontWeight: 700, color: 'var(--color-text-main)'}}>Camila F.</div>
                        <div style={{fontSize: '0.85rem', color: '#64748b'}}>Diretora Comercial | MedGroup</div>
                    </div>
                </div>
            </div>

            <div className="testimonial-card">
                <div className="stars">★★★★★</div>
                <p className="quote">"Integramos 8 sistemas diferentes em um. O ROI veio já no primeiro trimestre."</p>
                <div className="client-info">
                    <div className="avatar" style={{background: 'linear-gradient(135deg, #8b5cf6, #d946ef)'}}>A</div>
                    <div>
                        <div style={{fontWeight: 700, color: 'var(--color-text-main)'}}>André L.</div>
                        <div style={{fontSize: '0.85rem', color: '#64748b'}}>CTO | LogiTech</div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <section className="section-contact" id="contato">
        <div className="grid-2 animate-on-scroll">
            <div className="contact-info">
                <span className="solution-badge">Vamos conversar</span>
                <h2 style={{fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', marginBottom: '1.5rem', lineHeight: '1.1', fontWeight: 800}}>
                    Pronto para unificar<br />sua empresa?
                </h2>
                <p style={{color: '#cbd5e1', fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: '500px'}}>
                    Converse com um consultor ZIA Mind e descubra como transformar sua operação em 30 dias.
                </p>

                <div style={{marginBottom: '3rem'}}>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', fontSize: '1.1rem'}}>
                        <span style={{color: '#4ade80', fontWeight: 'bold'}}>✓</span> Diagnóstico gratuito
                    </div>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', fontSize: '1.1rem'}}>
                        <span style={{color: '#4ade80', fontWeight: 'bold'}}>✓</span> Sem compromisso
                    </div>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', fontSize: '1.1rem'}}>
                        <span style={{color: '#4ade80', fontWeight: 'bold'}}>✓</span> Implementação guiada
                    </div>
                </div>

                <div>
                    <p style={{color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Ou fale diretamente:</p>
                    <div style={{fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem'}}>📧 contato@ziamind.com.br</div>
                    <div style={{fontSize: '1.1rem', fontWeight: 600}}>📱 (11) 9 0000-0000</div>
                </div>
            </div>

            <div className="contact-form-card">
                <div id="form-container">
                    <h3 style={{fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem'}}>Fale com um consultor</h3>
                    <form id="contactForm" onSubmit={handleSubmit}>
                        <input type="text" id="name" className="form-input" placeholder="Nome completo" required />
                        <input type="email" id="email" className="form-input" placeholder="Email corporativo" required />
                        <input type="tel" id="phone" className="form-input" placeholder="WhatsApp (11) 9..." required />
                        <input type="text" id="company" className="form-input" placeholder="Nome da empresa" required />

                        <select id="employees" className="form-input" style={{backgroundColor: 'white'}} defaultValue="">
                            <option value="" disabled>Quantos funcionários?</option>
                            <option value="1-10">1-10</option>
                            <option value="11-50">11-50</option>
                            <option value="51-200">51-200</option>
                            <option value="201-500">201-500</option>
                            <option value="500+">500+</option>
                        </select>

                        <textarea id="message" className="form-input" rows={3} placeholder="Como podemos ajudar sua empresa?" style={{resize: 'none'}}></textarea>

                        <button type="submit" id="submitBtn" className="btn-submit">
                            Enviar mensagem
                        </button>
                    </form>
                    <div style={{marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8'}}>
                        🔒 Dados protegidos. Não compartilhamos com terceiros.
                    </div>
                </div>

                <div id="success-message" className="success-state" style={{display: 'none'}}>
                    <span className="success-icon">✓</span>
                    <h3 style={{fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-main)'}}>Mensagem enviada!</h3>
                    <p style={{color: 'var(--color-text-sec)'}}>Um consultor entrará em contato em até 24 horas úteis.</p>
                </div>
            </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-grid">
            <div>
                <div className="logo" style={{marginBottom: '1rem'}}>
                    <span>ZIA</span><span style={{color: 'white'}}>mind</span>
                </div>
                <p style={{marginBottom: '1.5rem', lineHeight: '1.6'}}>A primeira IA geral para empresas.</p>
                <div style={{display: 'flex'}}>
                    <a href="#" className="social-icon">IN</a>
                    <a href="#" className="social-icon">IG</a>
                    <a href="#" className="social-icon">YT</a>
                </div>
            </div>

            <div>
                <span className="footer-title">Produto</span>
                <ul className="footer-links">
                    <li><a href="#">Módulos</a></li>
                    <li><a href="#">Integrações</a></li>
                    <li><a href="#">Segurança</a></li>
                    <li><a href="#">Roadmap</a></li>
                </ul>
            </div>

            <div>
                <span className="footer-title">Empresa</span>
                <ul className="footer-links">
                    <li><a href="#">Sobre</a></li>
                    <li><a href="#">Blog</a></li>
                    <li><a href="#">Carreiras</a></li>
                    <li><a href="#">Imprensa</a></li>
                </ul>
            </div>

            <div>
                <span className="footer-title">Suporte</span>
                <ul className="footer-links">
                    <li><a href="#">Documentação</a></li>
                    <li><a href="#">Status</a></li>
                    <li><a href="#">Contato</a></li>
                    <li><a href="#">Parceiros</a></li>
                </ul>
            </div>
        </div>

        <div className="footer-bottom">
            <div>© 2025 ZIA Mind. Todos os direitos reservados.</div>
            <div style={{display: 'flex', gap: '1.5rem'}}>
                <a href="#" className="footer-link">Política de Privacidade</a>
                <a href="#" className="footer-link">Termos de Uso</a>
            </div>
        </div>
      </footer>
    </>
  );
}
