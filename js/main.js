/**
 * The Horizoon - Main JavaScript
 * Handles sticky nav, search modal, saved articles drawer, newsletter subscriptions, and mobile drawer
 */

import { ARTICLES, CATEGORIES, SITE_CONFIG } from './data.js';

let allSearchableArticles = [...ARTICLES];

export async function loadPublishedArticles() {
  // 1. Instant Cache-First Render (0ms perceived load time)
  try {
    const local = JSON.parse(localStorage.getItem('horizoon_local_posts') || '[]');
    const published = local.filter(p => p.status === 'published');
    if (published.length > 0) {
      allSearchableArticles = published;
      renderHomepageLatestArticles(published);
      updateSavedUI();
    } else {
      renderHomepageLatestArticles(ARTICLES);
    }
  } catch (e) {
    renderHomepageLatestArticles(ARTICLES);
  }

  // 2. Silent Asynchronous Revalidation in background
  try {
    const res = await fetch('/api/posts?status=published');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
        allSearchableArticles = data.posts;
        renderHomepageLatestArticles(data.posts);
        updateSavedUI();
        return data.posts;
      }
    }
  } catch (e) {}

  return allSearchableArticles;
}

function renderHomepageLatestArticles(posts) {
  const grid = document.getElementById('homepage-latest-grid');
  if (!grid || !Array.isArray(posts) || posts.length === 0) return;

  const latestFour = posts.slice(0, 4);
  grid.innerHTML = latestFour.map(post => `
    <a href="post.html?slug=${post.slug}" class="latest-card">
      <div class="latest-thumb-wrap">
        <img src="${post.image}" alt="${post.imageAlt || post.title}" loading="lazy" onerror="this.src='assets/images/featured-mindfulness.jpg'">
      </div>
      <span class="latest-category">${post.category || 'LIFESTYLE'}</span>
      <h3 class="latest-title">${post.title}</h3>
      <span class="latest-date">${post.date || 'Recent'}</span>
    </a>
  `).join('');
}

// ==========================================================================
// 1. Toast Notification Helper
// ==========================================================================
export function showToast(message, type = 'default') {
  let toast = document.getElementById('site-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'site-toast';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.className = `toast-notification ${type} show`;
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    <span>${message}</span>
  `;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ==========================================================================
// 2. Saved Articles (Bookmarks) System
// ==========================================================================
const STORAGE_KEY_SAVED = 'thehorizoon_saved_slugs';

export function getSavedSlugs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleSaveArticle(slug) {
  let saved = getSavedSlugs();
  const index = saved.indexOf(slug);
  let isSaved = false;

  if (index >= 0) {
    saved.splice(index, 1);
    isSaved = false;
    showToast('Article removed from bookmarks.');
  } else {
    saved.push(slug);
    isSaved = true;
    showToast('Article saved to your reading list!', 'success');
  }

  localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(saved));
  updateSavedUI();
  return isSaved;
}

export function updateSavedUI() {
  const saved = getSavedSlugs();
  
  // Update badges
  document.querySelectorAll('.saved-badge').forEach(badge => {
    badge.textContent = saved.length;
    badge.style.display = saved.length > 0 ? 'flex' : 'none';
  });

  // Update save buttons state across page
  document.querySelectorAll('[data-save-slug]').forEach(btn => {
    const slug = btn.getAttribute('data-save-slug');
    if (saved.includes(slug)) {
      btn.classList.add('saved');
      btn.querySelector('.save-btn-text') && (btn.querySelector('.save-btn-text').textContent = 'Saved');
    } else {
      btn.classList.remove('saved');
      btn.querySelector('.save-btn-text') && (btn.querySelector('.save-btn-text').textContent = 'Save');
    }
  });

  // Re-render saved drawer list
  renderSavedDrawerContent();
}

function renderSavedDrawerContent() {
  const container = document.getElementById('saved-drawer-items');
  if (!container) return;

  const savedSlugs = getSavedSlugs();
  if (savedSlugs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--color-text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; opacity: 0.5;">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        <p style="font-weight: 600; color: var(--color-text-main); margin-bottom: 0.25rem;">No saved articles yet</p>
        <p style="font-size: 0.85rem;">Click the bookmark icon on any article to save it for later reading.</p>
      </div>
    `;
    return;
  }

  const savedArticles = allSearchableArticles.filter(a => savedSlugs.includes(a.slug));
  container.innerHTML = savedArticles.map(article => `
    <div class="saved-item-card">
      <img src="${article.image}" alt="${article.title}" class="saved-item-thumb">
      <div class="saved-item-details">
        <a href="post.html?slug=${article.slug}" class="saved-item-title">${article.title}</a>
        <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem;">
          ${article.category} • ${article.readTime}
        </div>
      </div>
      <button class="saved-item-remove" data-remove-slug="${article.slug}" title="Remove bookmark" aria-label="Remove bookmark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');

  // Bind remove buttons
  container.querySelectorAll('[data-remove-slug]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const slug = btn.getAttribute('data-remove-slug');
      toggleSaveArticle(slug);
    });
  });
}

// ==========================================================================
// 3. Live Search Modal
// ==========================================================================
function setupSearchModal() {
  const backdrop = document.getElementById('search-modal-backdrop');
  const input = document.getElementById('search-modal-input');
  const resultsContainer = document.getElementById('search-modal-results');
  const closeBtn = document.getElementById('search-modal-close');
  const triggers = document.querySelectorAll('.search-box-trigger');

  if (!backdrop || !input) return;

  function openSearch() {
    backdrop.classList.add('open');
    input.value = '';
    renderSearchResults('');
    setTimeout(() => input.focus(), 50);
  }

  function closeSearch() {
    backdrop.classList.remove('open');
  }

  triggers.forEach(trigger => trigger.addEventListener('click', openSearch));
  closeBtn && closeBtn.addEventListener('click', closeSearch);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSearch();
  });

  // Keyboard shortcut: Pressing "/" or "Ctrl+K" / "Cmd+K" opens search
  document.addEventListener('keydown', (e) => {
    if ((e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape' && backdrop.classList.contains('open')) {
      closeSearch();
    }
  });

  input.addEventListener('input', (e) => {
    renderSearchResults(e.target.value.trim());
  });

  function renderSearchResults(query) {
    if (!resultsContainer) return;
    if (!query) {
      resultsContainer.innerHTML = `
        <div style="padding: 1rem; color: var(--color-text-muted); font-size: 0.88rem; text-align: center;">
          Type keywords like <em>"mindfulness"</em>, <em>"travel"</em>, <em>"habits"</em>, or <em>"nutrition"</em>...
        </div>
      `;
      return;
    }

    const q = query.toLowerCase();
    const matches = allSearchableArticles.filter(post => 
      (post.title || '').toLowerCase().includes(q) ||
      (post.summary || '').toLowerCase().includes(q) ||
      (post.category || '').toLowerCase().includes(q) ||
      (post.tags || []).some(t => t.toLowerCase().includes(q))
    );

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 2rem 1rem; text-align: center; color: var(--color-text-muted);">
          No articles found matching "<strong>${query}</strong>". Try a different topic!
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = matches.map(post => `
      <a href="post.html?slug=${post.slug}" class="search-result-item">
        <img src="${post.image}" alt="${post.title}" class="search-result-thumb">
        <div class="search-result-info">
          <div class="category-badge">${post.category}</div>
          <div class="search-result-title">${post.title}</div>
          <div class="search-result-meta">${post.date} • ${post.readTime}</div>
        </div>
      </a>
    `).join('');
  }
}

// ==========================================================================
// 4. Newsletter Subscription Engine
// ==========================================================================
function setupNewsletterForms() {
  document.querySelectorAll('form[data-newsletter-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput ? emailInput.value.trim() : '';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address.');
        return;
      }

      // Save to localStorage
      try {
        const subs = JSON.parse(localStorage.getItem('thehorizoon_subscribers') || '[]');
        if (!subs.includes(email)) subs.push(email);
        localStorage.setItem('thehorizoon_subscribers', JSON.stringify(subs));
      } catch (err) {}

      showToast('🎉 Welcome to The Horizoon! Your subscription is confirmed.', 'success');
      form.reset();
    });
  });
}

// ==========================================================================
// 5. Saved Drawer Toggle
// ==========================================================================
function setupSavedDrawer() {
  const backdrop = document.getElementById('saved-drawer-backdrop');
  const closeBtn = document.getElementById('saved-drawer-close');
  const triggers = document.querySelectorAll('.saved-trigger-btn');

  if (!backdrop) return;

  function openDrawer() {
    backdrop.classList.add('open');
  }

  function closeDrawer() {
    backdrop.classList.remove('open');
  }

  triggers.forEach(t => t.addEventListener('click', openDrawer));
  closeBtn && closeBtn.addEventListener('click', closeDrawer);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeDrawer();
  });
}

// ==========================================================================
// 6. Mobile Off-Canvas Drawer
// ==========================================================================
function setupMobileNav() {
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const openBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-nav-close');

  if (!backdrop || !openBtn) return;

  function openNav() {
    backdrop.classList.add('open');
  }

  function closeNav() {
    backdrop.classList.remove('open');
  }

  openBtn.addEventListener('click', openNav);
  closeBtn && closeBtn.addEventListener('click', closeNav);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeNav();
  });
}

// ==========================================================================
// 7. Sticky Header Scroll Effect
// ==========================================================================
function setupStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

// Global Bookmark Click Listener
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const saveBtn = e.target.closest('[data-save-slug]');
    if (saveBtn) {
      e.preventDefault();
      e.stopPropagation();
      const slug = saveBtn.getAttribute('data-save-slug');
      toggleSaveArticle(slug);
    }
  });

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    setupStickyHeader();
    setupSearchModal();
    setupSavedDrawer();
    setupMobileNav();
    setupNewsletterForms();
    updateSavedUI();
    loadPublishedArticles();
  });
}
