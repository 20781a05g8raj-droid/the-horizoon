/**
 * The Horizoon - Blog Archive & Filter Logic
 */

import { ARTICLES, CATEGORIES, AUTHORS } from './data.js';

let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'newest';
let currentPage = 1;
const POSTS_PER_PAGE = 6;

export function initBlogPage() {
  const grid = document.getElementById('blog-posts-grid');
  if (!grid) return;

  // Check URL params for category or search
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('cat')) {
    currentCategory = urlParams.get('cat').toLowerCase();
  }
  if (urlParams.get('q')) {
    currentSearch = urlParams.get('q');
    const searchInput = document.getElementById('blog-search-input');
    if (searchInput) searchInput.value = currentSearch;
  }

  setupCategoryFilters();
  setupSearchAndSort();
  renderBlogPosts();
  renderSidebar();
}

function setupCategoryFilters() {
  const container = document.getElementById('blog-category-pills');
  if (!container) return;

  const allCategories = [{ slug: 'all', name: 'All Topics' }, ...CATEGORIES];

  container.innerHTML = allCategories.map(cat => `
    <button class="filter-pill ${currentCategory === cat.slug ? 'active' : ''}" data-cat="${cat.slug}">
      ${cat.name}
    </button>
  `).join('');

  container.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-cat');
      currentPage = 1;
      renderBlogPosts();
    });
  });
}

function setupSearchAndSort() {
  const searchInput = document.getElementById('blog-search-input');
  const sortSelect = document.getElementById('blog-sort-select');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderBlogPosts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderBlogPosts();
    });
  }
}

function renderBlogPosts() {
  const grid = document.getElementById('blog-posts-grid');
  const countEl = document.getElementById('blog-results-count');
  if (!grid) return;

  let filtered = [...ARTICLES];

  // Category filter
  if (currentCategory !== 'all') {
    filtered = filtered.filter(a => a.categorySlug === currentCategory);
  }

  // Search query filter
  if (currentSearch) {
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(currentSearch) ||
      a.summary.toLowerCase().includes(currentSearch) ||
      a.tags.some(t => t.toLowerCase().includes(currentSearch))
    );
  }

  // Sort
  if (currentSort === 'newest') {
    filtered.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
  } else if (currentSort === 'oldest') {
    filtered.sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
  } else if (currentSort === 'reading-time') {
    filtered.sort((a, b) => parseInt(b.readTime) - parseInt(a.readTime));
  }

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'article' : 'articles'}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: var(--color-text-muted);">
        <p style="font-size: 1.25rem; font-weight: 600; color: var(--color-text-main); margin-bottom: 0.5rem;">No articles found</p>
        <p>Try resetting your search query or choosing another category.</p>
        <button class="btn btn-outline btn-sm" id="reset-filters-btn" style="margin-top: 1rem;">Reset Filters</button>
      </div>
    `;
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentCategory = 'all';
        currentSearch = '';
        const searchInput = document.getElementById('blog-search-input');
        if (searchInput) searchInput.value = '';
        setupCategoryFilters();
        renderBlogPosts();
      });
    }
    return;
  }

  // Pagination slice
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + POSTS_PER_PAGE);

  grid.innerHTML = paginated.map(post => `
    <article class="latest-card blog-feed-card">
      <div class="latest-thumb-wrap">
        <a href="post.html?slug=${post.slug}">
          <img src="${post.image}" alt="${post.title}" loading="lazy">
        </a>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
        <span class="latest-category">${post.category}</span>
        <button class="save-btn" data-save-slug="${post.slug}" title="Save article" aria-label="Save article">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
      <h3 class="latest-title">
        <a href="post.html?slug=${post.slug}">${post.title}</a>
      </h3>
      <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 0.85rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
        ${post.summary}
      </p>
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: var(--color-text-muted); margin-top: auto; padding-top: 0.5rem; border-top: 1px solid var(--color-border);">
        <span>${post.date}</span>
        <span>${post.readTime}</span>
      </div>
    </article>
  `).join('');

  renderPagination(filtered.length);
}

function renderPagination(totalItems) {
  const container = document.getElementById('blog-pagination');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / POSTS_PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }

  container.innerHTML = html;
  container.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.getAttribute('data-page'));
      renderBlogPosts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function renderSidebar() {
  const tagsContainer = document.getElementById('sidebar-tags');
  if (tagsContainer) {
    const allTags = Array.from(new Set(ARTICLES.flatMap(a => a.tags)));
    tagsContainer.innerHTML = allTags.map(tag => `
      <button class="sidebar-tag-pill" data-tag="${tag}">#${tag}</button>
    `).join('');

    tagsContainer.querySelectorAll('.sidebar-tag-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag').toLowerCase();
        currentSearch = tag;
        const searchInput = document.getElementById('blog-search-input');
        if (searchInput) searchInput.value = tag;
        currentPage = 1;
        renderBlogPosts();
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initBlogPage();
});
