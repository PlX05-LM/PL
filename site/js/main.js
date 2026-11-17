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

const heroVideo = document.querySelector('.hero-video');
const heroLogoDrop = document.querySelector('.hero-logo-drop');
const heroReplay = document.getElementById('heroReplay');

if (heroVideo && heroLogoDrop) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    heroVideo.remove();
    document.querySelectorAll('.hero-vignette, .hero-grain').forEach((el) => el.remove());
    if (heroReplay) heroReplay.remove();
    heroLogoDrop.classList.add('show');
  } else {
    const reveal = () => {
      heroLogoDrop.classList.add('show');
      if (heroReplay) heroReplay.classList.add('show');
    };

    heroVideo.addEventListener('ended', reveal);
    heroVideo.addEventListener('error', () => {
      heroVideo.remove();
      reveal();
    });

    if (heroReplay) {
      heroReplay.addEventListener('click', () => {
        heroLogoDrop.classList.remove('show');
        heroReplay.classList.remove('show');
        heroVideo.currentTime = 0;
        heroVideo.style.animation = 'none';
        void heroVideo.offsetWidth; // force reflow pour rejouer le zoom CSS
        heroVideo.style.animation = '';
        heroVideo.play();
      });
    }
  }
}
