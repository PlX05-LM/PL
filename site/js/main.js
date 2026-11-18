document.getElementById('year').textContent = new Date().getFullYear();

const revealEls = document.querySelectorAll('.reveal');

if (revealEls.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

const navToggle = document.getElementById('navToggle');
const primaryNav = document.getElementById('primaryNav');

if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      primaryNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const hero = document.getElementById('hero');
const heroZoom = document.getElementById('heroZoom');
const heroFilm = document.getElementById('heroFilm');
const heroIntro = document.getElementById('heroIntro');
const heroOutro = document.getElementById('heroOutro');
const heroCue = document.getElementById('heroCue');
const heroReplay = document.getElementById('heroReplay');

if (hero && heroFilm) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smoothstep = (a, b, v) => {
    const t = clamp((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const progress = () => {
    const rect = hero.getBoundingClientRect();
    const span = hero.offsetHeight - window.innerHeight;
    return span > 0 ? clamp(-rect.top / span) : 1;
  };

  if (reduceMotion) {
    hero.style.height = '100svh';
    if (heroIntro) heroIntro.style.display = 'none';
    if (heroCue) heroCue.style.display = 'none';
    heroFilm.remove();
    document.querySelectorAll('.hero-vignette, .hero-grain').forEach((el) => el.remove());
    if (heroOutro) {
      heroOutro.style.opacity = '1';
      heroOutro.classList.add('show');
    }
  } else {
    let duration = 0;
    let lastShown = -1;
    let playing = false;
    let primed = false;

    const ready = () => { duration = heroFilm.duration || 0; };
    heroFilm.addEventListener('loadedmetadata', ready);
    if (heroFilm.readyState >= 1) ready();

    // iOS ne permet de piloter currentTime qu'après une première lecture
    const prime = () => {
      if (primed) return;
      primed = true;
      const p = heroFilm.play();
      if (p && p.then) p.then(() => { if (!playing) heroFilm.pause(); }).catch(() => {});
    };
    ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach((ev) => {
      window.addEventListener(ev, prime, { once: true, passive: true });
    });

    heroFilm.addEventListener('ended', () => { playing = false; lastShown = -1; });

    if (heroReplay) {
      heroReplay.addEventListener('click', () => {
        if (!duration) return;
        playing = true;
        heroFilm.currentTime = 0;
        heroFilm.play().catch(() => { playing = false; });
      });
    }

    // charge le clip entier en mémoire pour un défilement fluide quel que soit l'hébergeur
    const canWebm = heroFilm.canPlayType('video/webm; codecs="vp9"');
    const sourceEl = heroFilm.querySelector(canWebm ? 'source[type="video/webm"]' : 'source[type="video/mp4"]')
      || heroFilm.querySelector('source');
    if (sourceEl) {
      fetch(sourceEl.src)
        .then((r) => { if (!r.ok) throw new Error('fetch failed'); return r.blob(); })
        .then((blob) => { heroFilm.src = URL.createObjectURL(blob); })
        .catch(() => {});
    }

    const frame = () => {
      const p = progress();
      if (heroZoom) heroZoom.style.transform = `scale(${1.08 - 0.08 * smoothstep(0, 0.8, p)})`;
      if (heroIntro) heroIntro.style.opacity = String(1 - smoothstep(0.03, 0.16, p));
      if (heroCue) heroCue.style.opacity = String(1 - smoothstep(0.02, 0.1, p));
      if (heroOutro) {
        const o = smoothstep(0.8, 0.94, p);
        heroOutro.style.opacity = String(o);
        heroOutro.classList.toggle('show', o > 0.5);
      }
      if (duration && !playing && !heroFilm.seeking) {
        const t = Math.round(smoothstep(0.06, 0.82, p) * (duration - 0.05) * 24) / 24;
        if (Math.abs(t - lastShown) > 0.001) {
          heroFilm.currentTime = t;
          lastShown = t;
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
