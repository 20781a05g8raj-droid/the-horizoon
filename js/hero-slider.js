/**
 * The Horizoon - Hero Carousel Slider
 * Smooth slide transitions, 01/02/03 indicators, progress bar, pause on hover
 */

import { HERO_SLIDES } from './data.js';

let currentSlideIndex = 0;
let slideInterval = null;
const SLIDE_DURATION = 6000; // 6 seconds per slide
let progressStartTime = null;
let animationFrameId = null;

export function initHeroSlider() {
  const heroCard = document.getElementById('hero-main-card');
  if (!heroCard) return;

  const eyebrowEl = heroCard.querySelector('.hero-eyebrow');
  const titleEl = heroCard.querySelector('.hero-title');
  const descEl = heroCard.querySelector('.hero-description');
  const ctaBtn = heroCard.querySelector('.hero-btn');
  const bgImg = heroCard.querySelector('.hero-bg');
  const quoteEl = heroCard.querySelector('.hero-mug-caption');
  const progressFill = heroCard.querySelector('.hero-progress-fill');
  const slideNumBtns = heroCard.querySelectorAll('.hero-slide-num');

  function updateSlide(index) {
    currentSlideIndex = index;
    const slide = HERO_SLIDES[currentSlideIndex];

    // Fade effect
    heroCard.style.opacity = '0.85';
    setTimeout(() => {
      if (eyebrowEl) eyebrowEl.textContent = slide.eyebrow;
      if (titleEl) titleEl.textContent = slide.title;
      if (descEl) descEl.textContent = slide.description;
      if (ctaBtn) {
        ctaBtn.textContent = slide.ctaText;
        ctaBtn.setAttribute('href', slide.ctaLink);
      }
      if (bgImg) bgImg.src = slide.bgImage;
      if (quoteEl) quoteEl.textContent = slide.quoteCaption;
      heroCard.style.opacity = '1';
    }, 150);

    // Update numbers
    slideNumBtns.forEach((btn, idx) => {
      if (idx === currentSlideIndex) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    startProgress();
  }

  function startProgress() {
    cancelAnimationFrame(animationFrameId);
    progressStartTime = performance.now();

    function step(now) {
      const elapsed = now - progressStartTime;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION) * 100);
      if (progressFill) progressFill.style.width = `${pct}%`;

      if (elapsed < SLIDE_DURATION) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        nextSlide();
      }
    }

    animationFrameId = requestAnimationFrame(step);
  }

  function nextSlide() {
    const nextIdx = (currentSlideIndex + 1) % HERO_SLIDES.length;
    updateSlide(nextIdx);
  }

  // Bind number clicks
  slideNumBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      updateSlide(idx);
    });
  });

  // Pause on hover
  heroCard.addEventListener('mouseenter', () => {
    cancelAnimationFrame(animationFrameId);
  });

  heroCard.addEventListener('mouseleave', () => {
    startProgress();
  });

  // Initial display
  updateSlide(0);
}

document.addEventListener('DOMContentLoaded', () => {
  initHeroSlider();
});
