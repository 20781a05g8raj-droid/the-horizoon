/**
 * The Horizoon - Single Post Logic
 * Reading progress bar, dynamic TOC, social share, related posts, comments
 */

import { ARTICLES, MOCK_COMMENTS, SITE_CONFIG } from './data.js';
import { showToast, toggleSaveArticle, getSavedSlugs } from './main.js';

export async function initSinglePost() {
  let article = null;
  let slug = '';

  // 1. Check if server preloaded post data in DOM
  const serverDataScript = document.getElementById('__HORIZOON_INITIAL_POST__');
  if (serverDataScript) {
    try {
      article = JSON.parse(serverDataScript.textContent);
      slug = article.slug;
    } catch (e) {}
  }

  // 2. Extract slug from URL pathname (/post/xyz) or query param (?slug=xyz)
  if (!slug) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[pathParts.length - 2] === 'post') {
      slug = pathParts[pathParts.length - 1];
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      slug = urlParams.get('slug') || 'mindfulness-practices-daily-peace';
    }
  }

  // 3. Fetch from API if not already preloaded
  if (!article) {
    try {
      const res = await fetch(`/api/posts/${slug}`);
      const data = await res.json();
      if (data.success && data.post) {
        article = data.post;
      }
    } catch (e) {
      console.warn('API fetch failed, falling back to static ARTICLES store:', e);
    }
  }

  // 4. Fallback to localStorage (if published in Admin Studio)
  if (!article) {
    try {
      const local = JSON.parse(localStorage.getItem('horizoon_local_posts') || '[]');
      const found = local.find(a => a.slug === slug);
      if (found) article = found;
    } catch (e) {}
  }

  // Fallback to static data
  if (!article) {
    article = ARTICLES.find(a => a.slug === slug) || ARTICLES[0];
  }

  if (!article) return;

  // Track live real-audience view
  if (article && article.slug) {
    fetch(`/api/posts/${encodeURIComponent(article.slug)}/view`, { method: 'POST' }).catch(() => {});
  }

  renderPostHeader(article);
  renderPostBody(article);
  renderAuthorBio(article);
  renderRelatedPosts(article);
  renderComments(article.slug);
  setupReadingProgress();
  setupTableOfContents();
  setupSocialShare(article);
  setupCommentForm(article.slug);
  setupSaveButton(article.slug);
  injectArticleSchema(article);

  // 4. Record View in Background and Update Counter
  trackPostView(article.slug);
}

async function trackPostView(slug) {
  try {
    const res = await fetch(`/api/posts/${slug}/view`, { method: 'POST' });
    const data = await res.json();
    if (data.success && data.views !== undefined) {
      const viewsEl = document.getElementById('post-views-count');
      if (viewsEl) viewsEl.textContent = data.views.toLocaleString();
    }
  } catch (e) {
    console.warn('Could not record post view:', e);
  }
}

function renderPostHeader(article) {
  document.title = `${article.seoTitle || article.title} | ${SITE_CONFIG.name}`;
  
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', article.metaDesc || article.summary);

  const breadcrumbCat = document.getElementById('post-breadcrumb-cat');
  if (breadcrumbCat) {
    breadcrumbCat.textContent = article.category;
    breadcrumbCat.href = `category.html?cat=${article.categorySlug}`;
  }

  const badge = document.getElementById('post-category-badge');
  if (badge) {
    badge.textContent = article.category;
    badge.href = `category.html?cat=${article.categorySlug}`;
  }

  const titleEl = document.getElementById('post-title');
  if (titleEl) titleEl.textContent = article.title;

  const dateEl = document.getElementById('post-date');
  if (dateEl) dateEl.textContent = article.date;

  const readTimeEl = document.getElementById('post-read-time');
  if (readTimeEl) readTimeEl.textContent = article.readTime || '8 min read';

  const viewsEl = document.getElementById('post-views-count');
  if (viewsEl) viewsEl.textContent = (article.views || 0).toLocaleString();

  const authorNameEl = document.getElementById('post-author-name');
  if (authorNameEl) authorNameEl.textContent = article.author ? article.author.name : 'The Horizoon';

  const authorAvatarEl = document.getElementById('post-author-avatar');
  if (authorAvatarEl && article.author && article.author.avatar) {
    const avatarSrc = (article.author.avatar.startsWith('http') || article.author.avatar.startsWith('/'))
      ? article.author.avatar
      : `/${article.author.avatar}`;
    authorAvatarEl.src = avatarSrc;
    authorAvatarEl.alt = article.author.name || 'Author avatar';
  }

  const featuredImg = document.getElementById('post-featured-image');
  if (featuredImg && article.image) {
    featuredImg.src = article.image.startsWith('http') || article.image.startsWith('/')
      ? article.image
      : `/${article.image}`;
    featuredImg.alt = article.imageAlt || article.title;
  }
}

function renderPostBody(article) {
  const bodyEl = document.getElementById('post-body-content');
  if (bodyEl) {
    bodyEl.innerHTML = article.content || '';

    // Auto-fix any link without protocol (e.g. google.com) so it opens the real external website
    const links = bodyEl.querySelectorAll('a');
    links.forEach(a => {
      let rawHref = (a.getAttribute('href') || '').trim();
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

      if (!/^(https?:\/\/|mailto:|tel:|\/|\/\/)/i.test(rawHref)) {
        if (/^[a-zA-Z0-9_-]+\.html/i.test(rawHref)) {
          a.setAttribute('href', '/' + rawHref);
        } else {
          // Domain like google.com, www.google.com
          a.setAttribute('href', 'https://' + rawHref);
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
      } else if (/^https?:\/\//i.test(rawHref)) {
        try {
          const urlObj = new URL(rawHref);
          if (urlObj.origin !== window.location.origin) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          }
        } catch (e) {}
      }
    });

    // Safeguard click listener to intercept any rogue relative external link
    bodyEl.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      if (!/^(https?:\/\/|\/|mailto:|tel:|\/\/)/i.test(href)) {
        e.preventDefault();
        window.open('https://' + href, '_blank', 'noopener,noreferrer');
      }
    });
  }

  const tagsContainer = document.getElementById('post-tags-list');
  if (tagsContainer && article.tags && article.tags.length > 0) {
    tagsContainer.innerHTML = article.tags.map(t => `
      <a href="blog.html?q=${encodeURIComponent(t)}" class="post-tag-item">#${t}</a>
    `).join('');
  } else if (tagsContainer) {
    tagsContainer.innerHTML = '';
  }
}

function renderAuthorBio(article) {
  const authorBox = document.getElementById('post-author-box');
  if (!authorBox) return;

  const author = article.author || {
    name: 'The Horizoon Editorial Team',
    role: 'Staff Writer',
    bio: 'Editorial voice of The Horizoon bringing fresh perspectives on intentional living.',
    avatar: 'assets/images/avatar-elena.jpg'
  };

  const avatarSrc = (author.avatar || '').startsWith('http') || (author.avatar || '').startsWith('/')
    ? author.avatar
    : `/${author.avatar || 'assets/images/avatar-elena.jpg'}`;

  authorBox.innerHTML = `
    <img src="${avatarSrc}" alt="${author.name}" class="author-bio-avatar">
    <div class="author-bio-content">
      <div class="author-bio-role">WRITTEN BY</div>
      <h4 class="author-bio-name">${author.name}</h4>
      <p class="author-bio-desc">${author.bio}</p>
    </div>
  `;
}

function setupReadingProgress() {
  const bar = document.getElementById('reading-progress-bar');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const articleEl = document.getElementById('post-main-article');
    if (!articleEl) return;

    const totalHeight = articleEl.clientHeight - window.innerHeight;
    const scrollPos = window.scrollY - articleEl.offsetTop;

    if (totalHeight > 0) {
      const progress = Math.min(100, Math.max(0, (scrollPos / totalHeight) * 100));
      bar.style.width = `${progress}%`;
    }
  }, { passive: true });
}

function setupTableOfContents() {
  const tocList = document.getElementById('post-toc-list');
  const bodyEl = document.getElementById('post-body-content');
  if (!tocList || !bodyEl) return;

  const headings = bodyEl.querySelectorAll('h1, h2, h3');
  const tocSection = document.getElementById('post-toc-wrapper');

  if (headings.length === 0) {
    if (tocSection) tocSection.style.display = 'none';
    return;
  }

  if (tocSection) tocSection.style.display = 'block';

  tocList.innerHTML = '';
  headings.forEach((heading, idx) => {
    const id = `section-${idx}`;
    heading.id = id;
    const tagName = heading.tagName.toLowerCase();
    const isSub = tagName === 'h3';

    const li = document.createElement('li');
    li.className = `toc-item ${isSub ? 'toc-sub' : ''}`;
    li.innerHTML = `<a href="#${id}" class="toc-link">${heading.textContent}</a>`;
    tocList.appendChild(li);
  });

  // Smooth scroll offset click handler
  tocList.querySelectorAll('.toc-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').replace('#', '');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const topOffset = targetEl.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: topOffset, behavior: 'smooth' });
      }
    });
  });

  // Active section spy
  window.addEventListener('scroll', () => {
    let currentId = '';
    headings.forEach(heading => {
      const top = heading.getBoundingClientRect().top;
      if (top <= 140) {
        currentId = heading.id;
      }
    });

    tocList.querySelectorAll('.toc-link').forEach(link => {
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }, { passive: true });
}

function setupSocialShare(article) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(article.title);

  const twitterBtn = document.getElementById('share-twitter');
  if (twitterBtn) {
    twitterBtn.href = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
  }

  const facebookBtn = document.getElementById('share-facebook');
  if (facebookBtn) {
    facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  }

  const linkedinBtn = document.getElementById('share-linkedin');
  if (linkedinBtn) {
    linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }

  const copyBtn = document.getElementById('share-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!', 'success');
      } catch (e) {
        showToast('Link copied to clipboard!', 'success');
      }
    });
  }
}

function setupSaveButton(slug) {
  const saveBtn = document.getElementById('post-save-btn');
  if (!saveBtn) return;

  saveBtn.setAttribute('data-save-slug', slug);
  const saved = getSavedSlugs();
  if (saved.includes(slug)) {
    saveBtn.classList.add('saved');
    saveBtn.querySelector('.save-text').textContent = 'Saved';
  }

  saveBtn.addEventListener('click', () => {
    const isNowSaved = toggleSaveArticle(slug);
    if (isNowSaved) {
      saveBtn.classList.add('saved');
      saveBtn.querySelector('.save-text').textContent = 'Saved';
    } else {
      saveBtn.classList.remove('saved');
      saveBtn.querySelector('.save-text').textContent = 'Save Article';
    }
  });
}

function renderRelatedPosts(currentArticle) {
  const container = document.getElementById('post-related-grid');
  if (!container) return;

  const related = ARTICLES
    .filter(a => a.slug !== currentArticle.slug)
    .slice(0, 3);

  container.innerHTML = related.map(post => `
    <article class="latest-card">
      <div class="latest-thumb-wrap">
        <a href="post.html?slug=${post.slug}">
          <img src="${post.image}" alt="${post.title}" loading="lazy">
        </a>
      </div>
      <span class="latest-category">${post.category}</span>
      <h3 class="latest-title" style="font-size: 1rem;">
        <a href="post.html?slug=${post.slug}">${post.title}</a>
      </h3>
      <div class="latest-date">${post.date} • ${post.readTime}</div>
    </article>
  `).join('');
}

function renderComments(slug) {
  const container = document.getElementById('post-comments-list');
  const countEl = document.getElementById('post-comments-count');
  if (!container) return;

  // Load from mock + local storage
  const mock = MOCK_COMMENTS[slug] || [];
  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem(`thehorizoon_comments_${slug}`) || '[]');
  } catch (e) {}

  const allComments = [...stored, ...mock];
  if (countEl) countEl.textContent = `(${allComments.length})`;

  if (allComments.length === 0) {
    container.innerHTML = `
      <p style="color: var(--color-text-muted); font-size: 0.95rem; font-style: italic;">
        Be the first to share your thoughts on this story.
      </p>
    `;
    return;
  }

  container.innerHTML = allComments.map(c => `
    <div class="comment-item">
      <img src="${c.avatar || 'assets/images/avatar-elena.jpg'}" alt="${c.name}" class="comment-avatar">
      <div class="comment-content">
        <div class="comment-header">
          <span class="comment-author">${c.name}</span>
          <span class="comment-date">${c.date}</span>
        </div>
        <p class="comment-text">${c.text}</p>
      </div>
    </div>
  `).join('');
}

function setupCommentForm(slug) {
  const form = document.getElementById('post-comment-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = form.querySelector('#comment-name');
    const emailInput = form.querySelector('#comment-email');
    const textInput = form.querySelector('#comment-text');

    const name = nameInput.value.trim();
    const text = textInput.value.trim();

    if (!name || !text) {
      showToast('Please provide your name and a comment.');
      return;
    }

    const newComment = {
      name: name,
      date: 'Just now',
      avatar: 'assets/images/avatar-elena.jpg',
      text: text
    };

    try {
      const existing = JSON.parse(localStorage.getItem(`thehorizoon_comments_${slug}`) || '[]');
      existing.unshift(newComment);
      localStorage.setItem(`thehorizoon_comments_${slug}`, JSON.stringify(existing));
    } catch (e) {}

    renderComments(slug);
    form.reset();
    showToast('Your comment has been posted!', 'success');
  });
}

function injectArticleSchema(article) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.title,
    "image": [
      `${SITE_CONFIG.url}/${article.image}`
    ],
    "datePublished": article.isoDate,
    "dateModified": article.isoDate,
    "author": {
      "@type": "Person",
      "name": article.author.name,
      "jobTitle": article.author.role
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_CONFIG.name,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_CONFIG.url}/${SITE_CONFIG.logo}`
      }
    },
    "description": article.metaDesc
  });
  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
  initSinglePost();
});
