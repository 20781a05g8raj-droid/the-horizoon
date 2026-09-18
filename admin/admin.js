/**
 * The Horizoon - Editorial Admin & SEO Studio Logic
 */

const API_BASE = window.location.origin;
let authToken = localStorage.getItem('hz_admin_token') || '';
let currentPosts = [];
let editingPostId = null;
let isSlugManuallyEdited = false;

// ==========================================================================
// 1. Toast Notification Helper
// ==========================================================================
function showAdminToast(message, type = 'default') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;

  toast.className = `admin-toast ${type} show`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
    </svg>
    <span>${message}</span>
  `;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ==========================================================================
// Image URL Resolver & Client-Side Image Optimizer
// ==========================================================================
function resolveAdminImageUrl(url, defaultImg = '../assets/images/featured-mindfulness.jpg') {
  if (!url || typeof url !== 'string' || !url.trim()) return defaultImg;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('../')) {
    return trimmed;
  }
  return `../${trimmed.replace(/^\//, '')}`;
}

function compressImageFile(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file'));
    }
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl;
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch (err) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==========================================================================
// Local / Standalone Storage Store (Works offline & without external backend)
// ==========================================================================
const FALLBACK_KEY = 'horizoon_local_posts';

// Immediately purge any legacy mock views in browser's local cache
(function purgeLegacyViews() {
  try {
    const local = localStorage.getItem(FALLBACK_KEY);
    if (local) {
      const posts = JSON.parse(local);
      if (Array.isArray(posts)) {
        let changed = false;
        posts.forEach(p => {
          if (p.views !== 0) {
            p.views = 0;
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(FALLBACK_KEY, JSON.stringify(posts));
        }
      }
    }
  } catch (e) {}
})();

function getLocalStoredPosts() {
  const local = localStorage.getItem(FALLBACK_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(p => {
          if (typeof p.views !== 'number' || isNaN(p.views)) p.views = 0;
        });
        return parsed;
      }
    } catch (e) {}
  }
  const defaults = [
    {
      id: "post-1",
      slug: "solo-travel-guide-2026",
      category: "Travel",
      categorySlug: "travel",
      title: "Solo Travel in 2026: Safe, Inspiring, and Budget-Savvy Explorations",
      seoTitle: "Solo Travel in 2026: Safe & Budget-Savvy Guide",
      metaDesc: "Master solo travel in 2026 with verified safety protocols, immersive budgeting hacks, and transformative itineraries. Read the complete guide.",
      date: "Sep 6, 2026",
      isoDate: "2026-09-06T08:00:00Z",
      readTime: "9 min read",
      wordsCount: 1340,
      author: {
        name: "Sophia Lin",
        role: "Culinary Nutritionist & Slow Travel Writer",
        bio: "Sophia Lin is a culinary educator and travel essayist who has lived in six countries.",
        avatar: "assets/images/avatar-sophia.jpg"
      },
      image: "assets/images/latest-solo-travel.jpg",
      imageAlt: "Solo traveler standing on coastal cliffs overlooking sunlit turquoise waters",
      tags: ["Solo Travel", "Budget Travel", "Mindful Living", "Adventure"],
      summary: "Embarking on a solo journey is far more than a physical expedition—it is an exercise in self-reliance, cultural immersion, and intentional discovery.",
      views: 0,
      status: "published",
      createdAt: "2026-09-06T08:00:00.000Z"
    },
    {
      id: "post-2",
      slug: "healthy-meals-for-busy-people",
      category: "Food",
      categorySlug: "food",
      title: "Healthy and Delicious Meals for Busy People: 15-Minute Nutrition Guide",
      seoTitle: "Healthy Meals for Busy People: 15-Minute Nutrition Guide",
      metaDesc: "Nourish your body on hectic days with 15-minute wholesome recipes, smart batch-prepping, and anti-inflammatory ingredients. Read the complete guide.",
      date: "Sep 4, 2026",
      isoDate: "2026-09-04T08:00:00Z",
      readTime: "8 min read",
      wordsCount: 1280,
      author: {
        name: "Sophia Lin",
        role: "Culinary Nutritionist & Slow Travel Writer",
        bio: "Sophia Lin is a culinary educator and travel essayist who has lived in six countries.",
        avatar: "assets/images/avatar-sophia.jpg"
      },
      image: "assets/images/latest-budget-meals.jpg",
      imageAlt: "Vibrant bowl of nutritious pasta tossed with roasted tomatoes, leafy spinach, and cold-pressed olive oil",
      tags: ["Nutrition", "Meal Prep", "Healthy Eating", "Wellness"],
      summary: "Eating wholesome, energy-sustaining food does not demand hours in the kitchen. Discover 15-minute culinary frameworks designed for demanding schedules.",
      views: 0,
      status: "published",
      createdAt: "2026-09-04T08:00:00.000Z"
    },
    {
      id: "post-3",
      slug: "mindfulness-practices-daily-peace",
      category: "Mindfulness",
      categorySlug: "mindfulness",
      title: "Transform Your Morning: 5 Mindfulness Practices for Daily Inner Peace",
      seoTitle: "5 Morning Mindfulness Practices for Inner Peace & Focus",
      metaDesc: "Transform your mornings with 5 practical mindfulness rituals for grounded calm, cognitive clarity, and emotional resilience. Read the complete guide.",
      date: "Sep 8, 2026",
      isoDate: "2026-09-08T08:00:00Z",
      readTime: "7 min read",
      wordsCount: 1150,
      author: {
        name: "Elena Vance",
        role: "Senior Wellness & Lifestyle Editor",
        bio: "Elena Vance is a mindfulness researcher, certified somatic practitioner, and author of The Quiet Horizoon.",
        avatar: "assets/images/avatar-elena.jpg"
      },
      image: "assets/images/featured-mindfulness.jpg",
      imageAlt: "Woman sitting in serene morning meditation by a sunlit open window with aromatic herbal tea",
      tags: ["Mindfulness", "Morning Routine", "Mental Clarity", "Wellness"],
      summary: "How you greet the first thirty minutes of your morning quietly dictates the neurological tone of your entire day.",
      views: 0,
      status: "published",
      createdAt: "2026-09-08T08:00:00.000Z"
    }
  ];
  saveLocalStoredPosts(defaults);
  return defaults;
}

function saveLocalStoredPosts(posts) {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(posts));
  } catch (e) {}
}

// ==========================================================================
// 2. Auth Flow (Login, Logout & Session Verification)
// ==========================================================================
async function initAuth() {
  if (authToken) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.email) {
            const emailEl = document.getElementById('display-admin-email');
            if (emailEl) emailEl.textContent = data.email;
          }
          showAdminApp();
          return;
        }
      }
    } catch (e) {
      console.warn('Session verification error:', e);
    }
    // Token invalid or expired
    authToken = '';
    localStorage.removeItem('hz_admin_token');
  }
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('admin-app').style.display = 'none';
}

function showAdminApp() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('admin-app').style.display = 'flex';
  loadDashboardData();
  loadAllArticles();
  checkSupabaseUiStatus();
}

async function checkSupabaseUiStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/supabase/status`);
    if (res.ok) {
      const data = await res.json();
      const dot = document.getElementById('sb-status-dot');
      const text = document.getElementById('sb-status-text');
      if (dot && text) {
        if (data.connected) {
          dot.style.background = '#10b981';
          text.textContent = 'Supabase Connected';
        } else {
          dot.style.background = '#3b82f6';
          text.textContent = 'Supabase Active';
        }
      }
    }
  } catch (e) {}
}

// Login Form Submit
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = (emailInput?.value || '').trim();
    const password = (passwordInput?.value || '').trim();
    const errorBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('btn-login-submit');

    if (!email || !password) {
      errorBox.textContent = 'Please enter both your Admin Email and Password.';
      errorBox.style.display = 'block';
      return;
    }

    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Verifying credentials...</span>';

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        authToken = data.token;
        localStorage.setItem('hz_admin_token', authToken);
        if (data.email) {
          const emailEl = document.getElementById('display-admin-email');
          if (emailEl) emailEl.textContent = data.email;
        }
        if (passwordInput) passwordInput.value = '';
        showAdminApp();
        showAdminToast(`Authenticated via ${data.provider || 'Secure Engine'}`, 'success');
        return;
      } else {
        errorBox.textContent = data.message || 'Invalid email or password. Access denied.';
        errorBox.style.display = 'block';
      }
    } catch (err) {
      errorBox.textContent = 'Could not connect to authentication server. Please check your connection.';
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Sign In to Admin Panel</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      `;
    }
  });
}

// Toggle Password Visibility on Login Screen
const btnToggleLoginPwd = document.getElementById('btn-toggle-login-pwd');
if (btnToggleLoginPwd) {
  btnToggleLoginPwd.addEventListener('click', () => {
    const pwdInput = document.getElementById('login-password');
    const eyeOpen = btnToggleLoginPwd.querySelector('.icon-eye-open');
    const eyeClosed = btnToggleLoginPwd.querySelector('.icon-eye-closed');
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      if (eyeOpen) eyeOpen.style.display = 'none';
      if (eyeClosed) eyeClosed.style.display = 'block';
    } else {
      pwdInput.type = 'password';
      if (eyeOpen) eyeOpen.style.display = 'block';
      if (eyeClosed) eyeClosed.style.display = 'none';
    }
  });
}

// Logout Handler
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (authToken) {
      try {
        await fetch(`${API_BASE}/api/admin/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (e) {}
    }
    authToken = '';
    localStorage.removeItem('hz_admin_token');
    showLoginScreen();
    showAdminToast('You have been securely logged out.');
  });
}

// Credentials Update Form in Settings Tab
const credentialsForm = document.getElementById('credentials-form');
if (credentialsForm) {
  credentialsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('change-current-password').value;
    const newEmail = document.getElementById('change-new-email').value.trim();
    const newPassword = document.getElementById('change-new-password').value;
    const confirmPassword = document.getElementById('change-confirm-password').value;
    const alertBox = document.getElementById('credentials-alert');
    const saveBtn = document.getElementById('btn-save-credentials');

    alertBox.style.display = 'none';
    alertBox.className = 'alert-box';

    if (newPassword && newPassword.length < 6) {
      alertBox.className = 'alert-box alert-error';
      alertBox.textContent = 'New password must be at least 6 characters long.';
      alertBox.style.display = 'block';
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      alertBox.className = 'alert-box alert-error';
      alertBox.textContent = 'New password and confirmation do not match.';
      alertBox.style.display = 'block';
      return;
    }

    if (!newEmail && !newPassword) {
      alertBox.className = 'alert-box alert-error';
      alertBox.textContent = 'Please enter a new email or new password to update.';
      alertBox.style.display = 'block';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Updating security credentials...</span>';

    try {
      const res = await fetch(`${API_BASE}/api/admin/change-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          currentPassword,
          newEmail: newEmail || undefined,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alertBox.className = 'alert-box alert-success';
        alertBox.textContent = data.message || 'Credentials updated successfully!';
        alertBox.style.display = 'block';
        if (data.email) {
          const emailEl = document.getElementById('display-admin-email');
          if (emailEl) emailEl.textContent = data.email;
        }
        credentialsForm.reset();
        showAdminToast('Security credentials updated successfully!', 'success');
      } else {
        alertBox.className = 'alert-box alert-error';
        alertBox.textContent = data.message || 'Could not update credentials.';
        alertBox.style.display = 'block';
      }
    } catch (err) {
      alertBox.className = 'alert-box alert-error';
      alertBox.textContent = 'Network error while updating credentials.';
      alertBox.style.display = 'block';
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        <span>Save New Credentials</span>
      `;
    }
  });
}

// ==========================================================================
// 3. Tab Navigation
// ==========================================================================
window.switchTab = function (tabId) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.add('active');

  const titles = {
    dashboard: { title: 'Dashboard Overview', sub: 'Welcome back, Editor. Here is your publication heartbeat.' },
    editor: { title: editingPostId ? 'Edit Article & SEO' : 'Write New Article & SEO Studio', sub: 'Compose compelling stories with full search engine optimization and mandatory ALT text.' },
    articles: { title: 'Articles Manager', sub: 'Review, edit, track views, and manage published stories.' },
    analytics: { title: 'Viewer Analytics & Insights', sub: 'Deep-dive into reader engagement, most read pieces, and organic search impressions.' },
    settings: { title: 'Security & Admin Settings', sub: 'Manage your administrator email, password, and active security protocols.' }
  };

  if (titles[tabId]) {
    document.getElementById('page-title').textContent = titles[tabId].title;
    document.getElementById('page-subtitle').textContent = titles[tabId].sub;
  }

  if (tabId === 'dashboard') loadDashboardData();
  if (tabId === 'articles') loadAllArticles();
  if (tabId === 'analytics') loadAnalyticsData();
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.getAttribute('data-tab');
    if (tab) switchTab(tab);
  });
});

const topbarWriteBtn = document.getElementById('topbar-write-btn');
if (topbarWriteBtn) {
  topbarWriteBtn.addEventListener('click', () => {
    startNewArticle();
  });
}

// ==========================================================================
// 4. Dashboard & Analytics Loading
// ==========================================================================
async function loadDashboardData() {
  let stats = null;
  try {
    const res = await fetch(`${API_BASE}/api/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) stats = data.stats;
    }
  } catch (e) {
    console.warn('Dashboard stats fallback to local storage:', e);
  }

  if (!stats) {
    const posts = getLocalStoredPosts();
    const published = posts.filter(p => p.status === 'published');
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const sorted = [...published].sort((a, b) => (b.views || 0) - (a.views || 0));
    stats = {
      totalViews,
      totalPublished: published.length,
      totalDrafts: posts.length - published.length,
      topPosts: sorted.slice(0, 5)
    };
  }

  document.getElementById('stat-total-views').textContent = (stats.totalViews || 0).toLocaleString();
  document.getElementById('stat-total-posts').textContent = (stats.totalPublished || 0).toLocaleString();

  const avg = stats.totalPublished > 0 ? Math.round(stats.totalViews / stats.totalPublished) : 0;
  document.getElementById('stat-avg-views').textContent = avg.toLocaleString();

  if (stats.topPosts && stats.topPosts.length > 0 && (stats.totalViews || 0) > 0) {
    const top = stats.topPosts[0];
    document.getElementById('stat-top-title').textContent = top.title;
    document.getElementById('stat-top-views').textContent = `${(top.views || 0).toLocaleString()} organic views`;
  } else if (stats.topPosts && stats.topPosts.length > 0) {
    const top = stats.topPosts[0];
    document.getElementById('stat-top-title').textContent = top.title;
    document.getElementById('stat-top-views').textContent = '0 organic views';
  } else {
    document.getElementById('stat-top-title').textContent = 'No traffic yet';
    document.getElementById('stat-top-views').textContent = '0 organic views';
  }

  // Render top posts table
  const tbody = document.getElementById('top-posts-tbody');
  if (tbody) {
    tbody.innerHTML = (stats.topPosts || []).map(p => `
      <tr>
        <td>
          <a href="/post/${p.slug}" target="_blank" class="table-post-title">${p.title}</a>
          <span class="table-post-slug">/post/${p.slug}</span>
        </td>
        <td><span class="badge-cat">${p.category}</span></td>
        <td><span class="views-pill">👁️ ${(Number(p.views) || 0).toLocaleString()}</span></td>
        <td><span class="badge-status published">Live</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="Edit Article" onclick="editPost('${p.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <a href="/post/${p.slug}" target="_blank" class="btn-icon" title="View SEO Page">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

async function loadAnalyticsData() {
  let posts = null;
  try {
    const res = await fetch(`${API_BASE}/api/posts?status=all&sort=views`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.posts) posts = data.posts;
    }
  } catch (e) {
    console.warn('Analytics fallback to local store:', e);
  }

  if (!posts) {
    posts = [...getLocalStoredPosts()].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
  }

  const maxViews = posts.length > 0 ? Math.max(...posts.map(p => Number(p.views) || 0), 0) : 0;
  const tbody = document.getElementById('analytics-tbody');

  if (tbody) {
    tbody.innerHTML = posts.map((p, idx) => {
      const currentV = Number(p.views) || 0;
      const percentage = maxViews > 0 ? Math.round((currentV / maxViews) * 100) : 0;
      return `
        <tr>
          <td style="font-weight: 800; color: var(--adm-primary);">#${idx + 1}</td>
          <td>
            <a href="/post/${p.slug}" target="_blank" class="table-post-title">${p.title}</a>
            <span class="table-post-slug">/post/${p.slug}</span>
          </td>
          <td><span class="badge-cat">${p.category}</span></td>
          <td><strong style="font-size: 1.05rem;">👁️ ${currentV.toLocaleString()}</strong></td>
          <td>${p.readTime || '8 min read'}</td>
          <td style="width: 220px;">
            <div class="progress-bar-bg" title="${percentage}% of top traffic">
              <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// ==========================================================================
// 5. Articles Management (List, Filter, Delete)
// ==========================================================================
async function loadAllArticles() {
  try {
    const res = await fetch(`${API_BASE}/api/posts?status=all&sort=newest`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.posts) {
        currentPosts = data.posts;
        saveLocalStoredPosts(currentPosts);
        renderArticlesTable(currentPosts);
        return;
      }
    }
  } catch (e) {
    console.warn('Articles list fallback to local store:', e);
  }

  currentPosts = getLocalStoredPosts();
  renderArticlesTable(currentPosts);
}

function renderArticlesTable(posts) {
  const tbody = document.getElementById('all-articles-tbody');
  if (!tbody) return;

  if (posts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--adm-text-muted);">
          No articles found. Click "Write Post" to create your first SEO blog!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = posts.map(p => {
    const imgUrl = resolveAdminImageUrl(p.image, '../assets/images/featured-mindfulness.jpg');
    return `
      <tr>
        <td>
          <img src="${imgUrl}" alt="${p.imageAlt || p.title}" class="table-thumb" onerror="this.src='../assets/images/featured-mindfulness.jpg'">
        </td>
        <td>
          <a href="/post/${p.slug}" target="_blank" class="table-post-title">${p.title}</a>
          <span class="table-post-slug">/post/${p.slug}</span>
          <span style="font-size: 0.76rem; color: var(--adm-text-muted); display: block; margin-top: 2px;">✍️ By ${p.author?.name || 'Editorial Team'}</span>
        </td>
        <td><span class="badge-cat">${p.category}</span></td>
        <td><span class="views-pill">👁️ ${(p.views || 0).toLocaleString()}</span></td>
        <td>${p.date || 'Recent'}</td>
        <td>
          <span class="badge-status ${p.status === 'published' ? 'published' : 'draft'}">
            ${p.status === 'published' ? 'Published' : 'Draft'}
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="Edit Article" onclick="editPost('${p.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <a href="/post/${p.slug}" target="_blank" class="btn-icon" title="View Public Page">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
            <button class="btn-icon btn-icon-delete" title="Delete Article" onclick="deletePostConfirm('${p.id}', '${escapeQuote(p.title)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function escapeQuote(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'");
}

// Filter listeners
const searchInput = document.getElementById('articles-search-input');
const catFilter = document.getElementById('articles-category-filter');
const sortFilter = document.getElementById('articles-sort-filter');

function applyArticleFilters() {
  let filtered = [...currentPosts];
  const q = (searchInput?.value || '').toLowerCase().trim();
  const cat = catFilter?.value || 'all';
  const sort = sortFilter?.value || 'newest';

  if (cat !== 'all') {
    filtered = filtered.filter(p => (p.categorySlug || '').toLowerCase() === cat.toLowerCase() || (p.category || '').toLowerCase() === cat.toLowerCase());
  }

  if (q) {
    filtered = filtered.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q) ||
      (p.summary || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  if (sort === 'views') {
    filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (sort === 'title') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else {
    filtered.sort((a, b) => new Date(b.createdAt || b.isoDate || b.date) - new Date(a.createdAt || a.isoDate || a.date));
  }

  renderArticlesTable(filtered);
}

if (searchInput) searchInput.addEventListener('input', applyArticleFilters);
if (catFilter) catFilter.addEventListener('change', applyArticleFilters);
if (sortFilter) sortFilter.addEventListener('change', applyArticleFilters);

window.deletePostConfirm = async function (id, title) {
  if (!confirm(`Are you sure you want to permanently delete article:\n"${title}"?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        // success
      }
    }
  } catch (e) {
    console.warn('Backend delete unavailable, updating local store:', e);
  }

  // Sync / remove from local store
  const local = getLocalStoredPosts().filter(p => String(p.id) !== String(id));
  saveLocalStoredPosts(local);

  showAdminToast('Article deleted successfully.', 'success');
  loadAllArticles();
  loadDashboardData();
};

// ==========================================================================
// 6. Author Presets & Identity Management
// ==========================================================================
const AUTHOR_PRESETS = {
  elena: {
    name: "Elena Vance",
    role: "Senior Wellness & Lifestyle Editor",
    bio: "Elena Vance is a mindfulness researcher, certified somatic practitioner, and author of The Quiet Horizoon.",
    avatar: "assets/images/avatar-elena.jpg"
  },
  marcus: {
    name: "Marcus Thorne",
    role: "Productivity Strategist & Tech Columnist",
    bio: "Marcus Thorne is a former systems architect turned cognitive workflow consultant.",
    avatar: "assets/images/avatar-marcus.jpg"
  },
  sophia: {
    name: "Sophia Lin",
    role: "Culinary Nutritionist & Slow Travel Writer",
    bio: "Sophia Lin is a culinary educator and travel essayist who has lived in six countries.",
    avatar: "assets/images/avatar-sophia.jpg"
  },
  team: {
    name: "The Horizoon Editorial Team",
    role: "Staff Writers",
    bio: "Editorial voice of The Horizoon bringing fresh perspectives on intentional living.",
    avatar: "assets/images/avatar-elena.jpg"
  }
};

function applyAuthorPreset(key) {
  const preset = AUTHOR_PRESETS[key];
  if (!preset) return;
  const nameEl = document.getElementById('author-name-input');
  const roleEl = document.getElementById('author-role-input');
  const bioEl = document.getElementById('author-bio-input');
  const avatarUrlEl = document.getElementById('author-avatar-url');
  const avatarPreview = document.getElementById('author-avatar-preview');
  const selectEl = document.getElementById('post-author-select');

  if (nameEl) nameEl.value = preset.name;
  if (roleEl) roleEl.value = preset.role;
  if (bioEl) bioEl.value = preset.bio;
  if (avatarUrlEl) avatarUrlEl.value = preset.avatar;
  if (selectEl) selectEl.value = key;
  if (avatarPreview) {
    avatarPreview.src = resolveAdminImageUrl(preset.avatar, '../assets/images/avatar-elena.jpg');
  }
}

// ==========================================================================
// 7. Article Editor & SEO Real-time Suite
// ==========================================================================
window.startNewArticle = function () {
  editingPostId = null;
  isSlugManuallyEdited = false;
  document.getElementById('post-editor-form').reset();
  document.getElementById('edit-post-id').value = '';
  document.getElementById('editor-heading').textContent = 'Create New Article';
  document.getElementById('btn-save-text').textContent = 'Publish Post';
  document.getElementById('post-status-select').value = 'published';
  document.getElementById('featured-image-preview').src = '../assets/images/featured-mindfulness.jpg';
  document.getElementById('post-image-url').value = 'assets/images/featured-mindfulness.jpg';
  document.getElementById('post-image-alt').value = '';
  applyAuthorPreset('elena');
  updateWordCount();
  updateSeoLivePreview();
  switchTab('editor');
};

window.cancelEditor = function () {
  if (confirm('Discard any unsaved changes?')) {
    switchTab('articles');
  }
};

window.editPost = function (id) {
  const post = currentPosts.find(p => p.id === id || p.slug === id);
  if (!post) {
    showAdminToast('Post not found', 'error');
    return;
  }

  editingPostId = post.id;
  isSlugManuallyEdited = true;

  document.getElementById('edit-post-id').value = post.id;
  document.getElementById('post-title-input').value = post.title || '';
  document.getElementById('post-slug-input').value = post.slug || '';
  document.getElementById('post-summary-input').value = post.summary || '';
  document.getElementById('post-image-url').value = post.image || '';
  document.getElementById('post-image-alt').value = post.imageAlt || '';
  document.getElementById('post-content-input').value = post.content || '';
  document.getElementById('post-status-select').value = post.status || 'published';
  document.getElementById('post-category-select').value = post.category || 'Lifestyle';
  document.getElementById('post-tags-input').value = (post.tags || []).join(', ');
  document.getElementById('seo-focus-keyword').value = (post.tags && post.tags[0]) || '';
  document.getElementById('seo-meta-title').value = post.seoTitle || post.title || '';
  document.getElementById('seo-meta-desc').value = post.metaDesc || post.summary || '';

  // Author populate
  if (post.author) {
    const matchingKey = Object.keys(AUTHOR_PRESETS).find(k =>
      AUTHOR_PRESETS[k].name.toLowerCase() === (post.author.name || '').toLowerCase() &&
      AUTHOR_PRESETS[k].avatar === post.author.avatar
    );
    const selectEl = document.getElementById('post-author-select');
    if (matchingKey) {
      if (selectEl) selectEl.value = matchingKey;
    } else {
      if (selectEl) selectEl.value = 'custom';
    }
    document.getElementById('author-name-input').value = post.author.name || '';
    document.getElementById('author-role-input').value = post.author.role || '';
    document.getElementById('author-bio-input').value = post.author.bio || '';
    document.getElementById('author-avatar-url').value = post.author.avatar || '';
    const aAvatar = post.author.avatar || 'assets/images/avatar-elena.jpg';
    const aPreview = document.getElementById('author-avatar-preview');
    if (aPreview) {
      aPreview.src = resolveAdminImageUrl(aAvatar, '../assets/images/avatar-elena.jpg');
    }
  } else {
    applyAuthorPreset('elena');
  }

  const imgPreview = document.getElementById('featured-image-preview');
  imgPreview.src = resolveAdminImageUrl(post.image, '../assets/images/featured-mindfulness.jpg');

  document.getElementById('editor-heading').textContent = 'Edit Article & SEO';
  document.getElementById('btn-save-text').textContent = 'Update Article';

  updateWordCount();
  updateSeoLivePreview();
  switchTab('editor');
};

// Title -> Slug auto generation
const titleInput = document.getElementById('post-title-input');
const slugInput = document.getElementById('post-slug-input');

if (titleInput) {
  titleInput.addEventListener('input', () => {
    if (!isSlugManuallyEdited && !editingPostId) {
      const generated = titleInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (slugInput) slugInput.value = generated;
    }
    updateSeoLivePreview();
  });
}

if (slugInput) {
  slugInput.addEventListener('input', () => {
    isSlugManuallyEdited = true;
    updateSeoLivePreview();
  });
}

// Image upload handling
const fileUploadInput = document.getElementById('file-upload-input');
const uploadStatusText = document.getElementById('upload-status-text');

if (fileUploadInput) {
  fileUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (uploadStatusText) {
      uploadStatusText.textContent = 'Uploading image to server...';
      uploadStatusText.style.color = 'var(--adm-primary)';
    }

    // 1. If authenticated, try real file upload to /api/upload
    if (authToken) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        const upRes = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData.success && upData.url) {
            document.getElementById('post-image-url').value = upData.url;
            const featuredImgPreview = document.getElementById('featured-image-preview');
            if (featuredImgPreview) {
              featuredImgPreview.src = resolveAdminImageUrl(upData.url);
            }
            if (uploadStatusText) {
              uploadStatusText.textContent = '✓ Uploaded to server!';
              uploadStatusText.style.color = 'var(--adm-success)';
            }
            showAdminToast('Image uploaded successfully!', 'success');
            const altField = document.getElementById('post-image-alt');
            if (altField && !altField.value.trim()) altField.focus();
            updateSeoLivePreview();
            return;
          }
        }
      } catch (uploadErr) {
        console.warn('Server upload failed, using client compression:', uploadErr);
      }
    }

    // 2. Client-side canvas compression fallback
    try {
      const dataUrl = await compressImageFile(file, 1200, 0.82);
      document.getElementById('post-image-url').value = dataUrl;
      const featuredImgPreview = document.getElementById('featured-image-preview');
      if (featuredImgPreview) {
        featuredImgPreview.src = dataUrl;
      }
      if (uploadStatusText) {
        uploadStatusText.textContent = '✓ Saved in post data!';
        uploadStatusText.style.color = 'var(--adm-success)';
      }
      showAdminToast('Image ready for database storage!', 'success');

      const altField = document.getElementById('post-image-alt');
      if (altField && !altField.value.trim()) {
        altField.focus();
        showAdminToast('Important for SEO: Please provide descriptive ALT text.', 'default');
      }
      updateSeoLivePreview();
      return;
    } catch (err) {
      console.warn('Canvas compression fallback to FileReader:', err);
    }

    // 3. Local DataURL fallback
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      document.getElementById('post-image-url').value = dataUrl;
      const featuredImgPreview = document.getElementById('featured-image-preview');
      if (featuredImgPreview) {
        featuredImgPreview.src = dataUrl;
      }
      if (uploadStatusText) {
        uploadStatusText.textContent = '✓ Image ready!';
        uploadStatusText.style.color = 'var(--adm-success)';
      }
      showAdminToast('Image loaded for database storage!', 'success');
      const altField = document.getElementById('post-image-alt');
      if (altField && !altField.value.trim()) altField.focus();
      updateSeoLivePreview();
    };
    reader.readAsDataURL(file);
  });
}

const imageUrlInput = document.getElementById('post-image-url');
if (imageUrlInput) {
  imageUrlInput.addEventListener('input', () => {
    const val = imageUrlInput.value.trim();
    const imgPreview = document.getElementById('featured-image-preview');
    if (imgPreview) {
      imgPreview.src = resolveAdminImageUrl(val, '../assets/images/featured-mindfulness.jpg');
    }
    updateSeoLivePreview();
  });
}

// --------------------------------------------------------------------------
// Author Identity & Avatar Handlers
// --------------------------------------------------------------------------
const authorSelect = document.getElementById('post-author-select');
if (authorSelect) {
  authorSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      const nameEl = document.getElementById('author-name-input');
      if (nameEl) nameEl.focus();
    } else if (AUTHOR_PRESETS[val]) {
      applyAuthorPreset(val);
    }
  });
}

// Author Avatar Upload
const authorAvatarFile = document.getElementById('author-avatar-file');
const authorAvatarStatus = document.getElementById('author-avatar-status');

if (authorAvatarFile) {
  authorAvatarFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (authorAvatarStatus) {
      authorAvatarStatus.textContent = 'Optimizing author photo...';
      authorAvatarStatus.style.color = 'var(--adm-primary)';
    }

    try {
      // Compress avatar into lightweight Base64 Data URL (stored directly in DB)
      const dataUrl = await compressImageFile(file, 350, 0.85);
      document.getElementById('author-avatar-url').value = dataUrl;
      const avatarPreview = document.getElementById('author-avatar-preview');
      if (avatarPreview) {
        avatarPreview.src = dataUrl;
      }
      if (authorSelect) authorSelect.value = 'custom';
      if (authorAvatarStatus) {
        authorAvatarStatus.textContent = '✓ Saved in author data!';
        authorAvatarStatus.style.color = 'var(--adm-success)';
      }
      showAdminToast('Author photo optimized & ready for database storage!', 'success');
      return;
    } catch (err) {
      console.warn('Avatar compression fallback to FileReader:', err);
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      document.getElementById('author-avatar-url').value = dataUrl;
      const avatarPreview = document.getElementById('author-avatar-preview');
      if (avatarPreview) avatarPreview.src = dataUrl;
      if (authorSelect) authorSelect.value = 'custom';
      if (authorAvatarStatus) {
        authorAvatarStatus.textContent = '✓ Photo ready!';
        authorAvatarStatus.style.color = 'var(--adm-success)';
      }
      showAdminToast('Author photo loaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  });
}

// Author Avatar URL live preview update
const authorAvatarUrlInput = document.getElementById('author-avatar-url');
if (authorAvatarUrlInput) {
  authorAvatarUrlInput.addEventListener('input', () => {
    const val = authorAvatarUrlInput.value.trim();
    if (authorSelect) authorSelect.value = 'custom';
    const avatarPreview = document.getElementById('author-avatar-preview');
    if (avatarPreview) {
      avatarPreview.src = resolveAdminImageUrl(val, '../assets/images/avatar-elena.jpg');
    }
  });
}

// When user modifies author name, role, or bio, switch preset to 'custom'
['author-name-input', 'author-role-input', 'author-bio-input'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      if (authorSelect && authorSelect.value !== 'custom') {
        const currentPreset = AUTHOR_PRESETS[authorSelect.value];
        const prop = id.replace('author-', '').replace('-input', '');
        if (!currentPreset || el.value.trim() !== currentPreset[prop]) {
          authorSelect.value = 'custom';
        }
      }
    });
  }
});

// Content Textarea Word Count
const contentInput = document.getElementById('post-content-input');
function updateWordCount() {
  const content = contentInput ? contentInput.value : '';
  const text = content.replace(/<[^>]*>/g, '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.round(words / 200));

  const wordCountDisplay = document.getElementById('content-word-count');
  if (wordCountDisplay) {
    wordCountDisplay.textContent = `${words.toLocaleString()} words • ~${readTime} min read`;
  }
}

if (contentInput) {
  contentInput.addEventListener('input', () => {
    updateWordCount();
    updateSeoLivePreview();
  });
}

// ==========================================================================
// Rich Text Toolbar & In-Page Modal Helpers (H1, Link, Image with Alt)
// ==========================================================================
let editorSelectionRange = { start: 0, end: 0, text: '' };

function saveEditorSelection() {
  if (!contentInput) return;
  editorSelectionRange.start = contentInput.selectionStart;
  editorSelectionRange.end = contentInput.selectionEnd;
  editorSelectionRange.text = contentInput.value.substring(contentInput.selectionStart, contentInput.selectionEnd);
}

function insertIntoEditor(textToInsert) {
  if (!contentInput) return;
  contentInput.focus();
  contentInput.setRangeText(textToInsert, editorSelectionRange.start, editorSelectionRange.end, 'end');
  updateWordCount();
  updateSeoLivePreview();
}

function openLinkModal() {
  saveEditorSelection();
  const linkModal = document.getElementById('link-modal');
  const linkTextInput = document.getElementById('modal-link-text');
  const linkUrlInput = document.getElementById('modal-link-url');

  if (linkTextInput) linkTextInput.value = editorSelectionRange.text || '';
  if (linkUrlInput) linkUrlInput.value = '';
  if (linkModal) linkModal.style.display = 'flex';
  if (linkUrlInput) setTimeout(() => linkUrlInput.focus(), 50);
}

function closeLinkModal() {
  const linkModal = document.getElementById('link-modal');
  if (linkModal) linkModal.style.display = 'none';
}

function openImageModal() {
  saveEditorSelection();
  const imgModal = document.getElementById('image-modal');
  const imgUrlInput = document.getElementById('modal-img-url');
  const imgAltInput = document.getElementById('modal-img-alt');
  const imgCaptionInput = document.getElementById('modal-img-caption');
  const imgPreviewWrap = document.getElementById('modal-img-preview-wrap');
  const uploadStatus = document.getElementById('modal-upload-status');

  if (imgUrlInput) imgUrlInput.value = '';
  if (imgAltInput) imgAltInput.value = '';
  if (imgCaptionInput) imgCaptionInput.value = '';
  if (imgPreviewWrap) imgPreviewWrap.style.display = 'none';
  if (uploadStatus) uploadStatus.textContent = '';
  if (imgModal) imgModal.style.display = 'flex';
  if (imgUrlInput) setTimeout(() => imgUrlInput.focus(), 50);
}

function closeImageModal() {
  const imgModal = document.getElementById('image-modal');
  if (imgModal) imgModal.style.display = 'none';
}

// Modal event listeners
document.getElementById('btn-close-link-modal')?.addEventListener('click', closeLinkModal);
document.getElementById('btn-cancel-link')?.addEventListener('click', closeLinkModal);
document.getElementById('link-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'link-modal') closeLinkModal();
});

function formatLinkUrl(rawUrl) {
  let url = (rawUrl || '').trim();
  if (!url) return '';
  // Keep protocols, mailto, tel, hash, or scheme-relative
  if (/^(https?:\/\/|mailto:|tel:|#|javascript:|\/\/)/i.test(url)) {
    return url;
  }
  // Internal root paths
  if (url.startsWith('/')) {
    return url;
  }
  // Internal page references (e.g. post.html?slug=...)
  if (/^[a-zA-Z0-9_-]+\.html(\?.*)?$/i.test(url)) {
    return '/' + url;
  }
  // Default all external domains (e.g. google.com, wikipedia.org) to https://
  return 'https://' + url;
}

function normalizeContentLinks(html) {
  if (!html) return '';
  return html.replace(/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi, (match, prefix, href, suffix) => {
    let cleanHref = href.trim();
    if (!/^(https?:\/\/|mailto:|tel:|#|javascript:|\/|\/\/)/i.test(cleanHref)) {
      if (/^[a-zA-Z0-9_-]+\.html/i.test(cleanHref)) {
        cleanHref = '/' + cleanHref;
      } else {
        cleanHref = 'https://' + cleanHref;
      }
    }
    const combined = `${prefix} ${suffix}`;
    const hasTarget = /target=/i.test(combined);
    const isExternal = /^https?:\/\//i.test(cleanHref);
    const targetAdd = (!hasTarget && isExternal) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a ${prefix}href="${cleanHref}"${suffix}${targetAdd}>`;
  });
}

document.getElementById('btn-confirm-link')?.addEventListener('click', () => {
  const rawUrl = (document.getElementById('modal-link-url')?.value || '').trim();
  const text = (document.getElementById('modal-link-text')?.value || '').trim() || rawUrl;
  const isTargetBlank = document.getElementById('modal-link-target')?.checked;

  if (!rawUrl) {
    showAdminToast('Please enter a destination URL', 'error');
    document.getElementById('modal-link-url')?.focus();
    return;
  }

  const cleanUrl = formatLinkUrl(rawUrl);
  const isExternal = /^https?:\/\//i.test(cleanUrl);
  const targetAttr = (isTargetBlank || isExternal) ? ' target="_blank" rel="noopener noreferrer"' : '';
  const linkHtml = `<a href="${cleanUrl}"${targetAttr}>${text}</a>`;
  insertIntoEditor(linkHtml);
  closeLinkModal();
  showAdminToast('Link inserted successfully!', 'success');
});

// Image modal event listeners
document.getElementById('btn-close-image-modal')?.addEventListener('click', closeImageModal);
document.getElementById('btn-cancel-image')?.addEventListener('click', closeImageModal);
document.getElementById('image-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'image-modal') closeImageModal();
});

const modalFileUpload = document.getElementById('modal-file-upload');
modalFileUpload?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const status = document.getElementById('modal-upload-status');
  if (status) {
    status.textContent = 'Optimizing image for article...';
    status.style.color = 'var(--adm-primary)';
  }

  try {
    const dataUrl = await compressImageFile(file, 1000, 0.82);
    document.getElementById('modal-img-url').value = dataUrl;
    const previewWrap = document.getElementById('modal-img-preview-wrap');
    const previewImg = document.getElementById('modal-img-preview');
    if (previewWrap && previewImg) {
      previewImg.src = dataUrl;
      previewWrap.style.display = 'block';
    }
    if (status) {
      status.textContent = '✓ Image ready for database save!';
      status.style.color = 'var(--adm-success)';
    }
    document.getElementById('modal-img-alt')?.focus();
    showAdminToast('Image ready! Please enter SEO Alt Text.', 'default');
    return;
  } catch (err) {
    console.warn('Modal image optimization fallback:', err);
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    document.getElementById('modal-img-url').value = dataUrl;
    const previewWrap = document.getElementById('modal-img-preview-wrap');
    const previewImg = document.getElementById('modal-img-preview');
    if (previewWrap && previewImg) {
      previewImg.src = dataUrl;
      previewWrap.style.display = 'block';
    }
    if (status) {
      status.textContent = '✓ Image ready!';
      status.style.color = 'var(--adm-success)';
    }
    document.getElementById('modal-img-alt')?.focus();
    showAdminToast('Image ready! Please enter SEO Alt Text.', 'default');
  };
  reader.readAsDataURL(file);
});

document.getElementById('modal-img-url')?.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  const previewWrap = document.getElementById('modal-img-preview-wrap');
  const previewImg = document.getElementById('modal-img-preview');
  if (val && previewWrap && previewImg) {
    previewImg.src = resolveAdminImageUrl(val, '../assets/images/featured-mindfulness.jpg');
    previewWrap.style.display = 'block';
  }
});

document.getElementById('btn-confirm-image')?.addEventListener('click', () => {
  const imgUrl = (document.getElementById('modal-img-url')?.value || '').trim();
  const imgAlt = (document.getElementById('modal-img-alt')?.value || '').trim();
  const caption = (document.getElementById('modal-img-caption')?.value || '').trim();

  if (!imgUrl) {
    showAdminToast('Please provide an image URL or upload a file.', 'error');
    document.getElementById('modal-img-url')?.focus();
    return;
  }

  if (!imgAlt) {
    showAdminToast('Mandatory for SEO: Please provide descriptive Image Alt Text.', 'error');
    document.getElementById('modal-img-alt')?.focus();
    return;
  }

  const figureHtml = `\n<figure class="post-inline-image">\n  <img src="${imgUrl}" alt="${imgAlt}" loading="lazy">\n  ${caption ? `<figcaption>${caption}</figcaption>\n` : ''}</figure>\n`;
  insertIntoEditor(figureHtml);
  closeImageModal();
  showAdminToast('Image with SEO Alt Text inserted!', 'success');
});

// Rich Text Toolbar Button Handlers
document.querySelectorAll('.toolbar-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!contentInput) return;
    const tag = btn.dataset.tag;
    const start = contentInput.selectionStart;
    const end = contentInput.selectionEnd;
    const selected = contentInput.value.substring(start, end);

    if (tag === 'link') {
      openLinkModal();
      return;
    }
    if (tag === 'img') {
      openImageModal();
      return;
    }

    let replacement = '';
    if (tag === 'h1') replacement = `<h1>${selected || 'Main Article Heading'}</h1>\n`;
    else if (tag === 'h2') replacement = `<h2>${selected || 'Section Heading'}</h2>\n`;
    else if (tag === 'h3') replacement = `<h3>${selected || 'Subheading'}</h3>\n`;
    else if (tag === 'b') replacement = `<strong>${selected || 'bold text'}</strong>`;
    else if (tag === 'i') replacement = `<em>${selected || 'italic text'}</em>`;
    else if (tag === 'blockquote') replacement = `<blockquote>"${selected || 'Inspiring quote'}"</blockquote>\n`;
    else if (tag === 'ul') replacement = `<ul>\n  <li>${selected || 'Bullet item one'}</li>\n  <li>Second bullet item</li>\n</ul>\n`;
    else if (tag === 'ol') replacement = `<ol>\n  <li>${selected || 'Step one'}</li>\n  <li>Step two</li>\n</ol>\n`;
    else if (tag === 'callout') replacement = `<div class="callout-box">\n  <h4>Important Note</h4>\n  <p>${selected || 'Key takeaway text goes here.'}</p>\n</div>\n`;

    contentInput.setRangeText(replacement, start, end, 'end');
    contentInput.focus();
    updateWordCount();
    updateSeoLivePreview();
  });
});

// ==========================================================================
// 7. Live SEO Health Checklist & Google SERP Previewer
// ==========================================================================
const seoTitleInput = document.getElementById('seo-meta-title');
const seoDescInput = document.getElementById('seo-meta-desc');
const seoKeywordInput = document.getElementById('seo-focus-keyword');
const imageAltInput = document.getElementById('post-image-alt');
const summaryInput = document.getElementById('post-summary-input');

function updateSeoLivePreview() {
  const title = (seoTitleInput?.value.trim() || titleInput?.value.trim() || 'Your Article Title Goes Here');
  const slug = (slugInput?.value.trim() || 'your-article-slug');
  const desc = (seoDescInput?.value.trim() || summaryInput?.value.trim() || 'Concise article meta description that appears beneath the clickable link in Google search engine result pages.');
  const keyword = (seoKeywordInput?.value.trim() || '').toLowerCase();
  const altText = imageAltInput?.value.trim() || '';
  const content = contentInput?.value || '';

  // 1. Google SERP Snippet Preview
  const serpTitle = document.getElementById('serp-title-display');
  const serpUrl = document.getElementById('serp-url-display');
  const serpDesc = document.getElementById('serp-desc-display');

  if (serpTitle) serpTitle.textContent = `${title} | The Horizoon`;
  if (serpUrl) serpUrl.textContent = `https://thehorizoon.com › post › ${slug}`;
  if (serpDesc) serpDesc.textContent = desc;

  // 2. Character Counters
  const titleLen = (seoTitleInput?.value || titleInput?.value || '').length;
  const descLen = (seoDescInput?.value || summaryInput?.value || '').length;

  const titleCounter = document.getElementById('meta-title-counter');
  if (titleCounter) {
    titleCounter.textContent = `${titleLen} / 60`;
    titleCounter.className = `char-counter ${titleLen >= 35 && titleLen <= 65 ? 'valid' : (titleLen > 65 ? 'error' : 'warning')}`;
  }

  const descCounter = document.getElementById('meta-desc-counter');
  if (descCounter) {
    descCounter.textContent = `${descLen} / 160`;
    descCounter.className = `char-counter ${descLen >= 120 && descLen <= 160 ? 'valid' : (descLen > 160 ? 'error' : 'warning')}`;
  }

  // 3. Real-time SEO Checklist
  let score = 0;
  const maxScore = 6;

  // Check 1: Keyword in Title
  const checkKwTitle = document.getElementById('check-keyword-title');
  const hasKwInTitle = keyword && title.toLowerCase().includes(keyword);
  if (checkKwTitle) {
    checkKwTitle.className = `checklist-item ${hasKwInTitle ? 'pass' : 'fail'}`;
    checkKwTitle.querySelector('.check-icon').textContent = hasKwInTitle ? '✅' : '⚪';
    if (hasKwInTitle) score++;
  }

  // Check 2: Keyword in Slug
  const checkKwSlug = document.getElementById('check-keyword-slug');
  const cleanKwSlug = keyword.replace(/\s+/g, '-');
  const hasKwInSlug = keyword && slug.toLowerCase().includes(cleanKwSlug);
  if (checkKwSlug) {
    checkKwSlug.className = `checklist-item ${hasKwInSlug ? 'pass' : 'fail'}`;
    checkKwSlug.querySelector('.check-icon').textContent = hasKwInSlug ? '✅' : '⚪';
    if (hasKwInSlug) score++;
  }

  // Check 3: Keyword in Meta Description
  const checkKwDesc = document.getElementById('check-keyword-desc');
  const hasKwInDesc = keyword && desc.toLowerCase().includes(keyword);
  if (checkKwDesc) {
    checkKwDesc.className = `checklist-item ${hasKwInDesc ? 'pass' : 'fail'}`;
    checkKwDesc.querySelector('.check-icon').textContent = hasKwInDesc ? '✅' : '⚪';
    if (hasKwInDesc) score++;
  }

  // Check 4: Image Alt Text Present
  const checkImgAlt = document.getElementById('check-image-alt');
  const hasAlt = altText.length >= 8;
  if (checkImgAlt) {
    checkImgAlt.className = `checklist-item ${hasAlt ? 'pass' : 'fail'}`;
    checkImgAlt.querySelector('.check-icon').textContent = hasAlt ? '✅' : '❌';
    if (hasAlt) score++;
  }

  // Check 5: Word Count
  const words = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
  const checkWords = document.getElementById('check-word-count');
  const hasGoodLength = words >= 600;
  if (checkWords) {
    checkWords.className = `checklist-item ${hasGoodLength ? 'pass' : 'fail'}`;
    checkWords.querySelector('.check-icon').textContent = hasGoodLength ? '✅' : '⚪';
    if (hasGoodLength) score++;
  }

  // Check 6: Headings (H1 / H2 / H3)
  const checkHeadings = document.getElementById('check-headings');
  const hasHeadings = /<h1|<h2|<h3/i.test(content);
  if (checkHeadings) {
    checkHeadings.className = `checklist-item ${hasHeadings ? 'pass' : 'fail'}`;
    checkHeadings.querySelector('.check-icon').textContent = hasHeadings ? '✅' : '⚪';
    if (hasHeadings) score++;
  }

  // Overall Score Badge
  const percentage = Math.round((score / maxScore) * 100);
  const badge = document.getElementById('seo-score-badge');
  if (badge) {
    badge.textContent = `${percentage}% Score`;
    badge.className = `seo-score-badge ${percentage >= 80 ? '' : (percentage >= 50 ? 'fair' : 'poor')}`;
  }
}

[seoTitleInput, seoDescInput, seoKeywordInput, imageAltInput, summaryInput].forEach(el => {
  if (el) el.addEventListener('input', updateSeoLivePreview);
});

// ==========================================================================
// 8. Submit Post Form (Create or Update)
// ==========================================================================
const postEditorForm = document.getElementById('post-editor-form');
if (postEditorForm) {
  postEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('post-title-input').value.trim();
    const slug = document.getElementById('post-slug-input').value.trim();
    const summary = document.getElementById('post-summary-input').value.trim();
    const image = document.getElementById('post-image-url').value.trim();
    const imageAlt = document.getElementById('post-image-alt').value.trim();
    const content = document.getElementById('post-content-input').value.trim();
    const status = document.getElementById('post-status-select').value;
    const category = document.getElementById('post-category-select').value;
    const tagsRaw = document.getElementById('post-tags-input').value;
    const seoTitle = document.getElementById('seo-meta-title').value.trim() || title;
    const metaDesc = document.getElementById('seo-meta-desc').value.trim() || summary;

    // MANDATORY ALT TEXT VALIDATION
    if (!imageAlt) {
      showAdminToast('Mandatory: Please provide descriptive Image Alt Text for Google SEO.', 'error');
      document.getElementById('post-image-alt').focus();
      return;
    }

    // Custom Author Identity Validation & Reading
    const authorName = document.getElementById('author-name-input').value.trim();
    if (!authorName) {
      showAdminToast('Please provide an author name.', 'error');
      document.getElementById('author-name-input').focus();
      return;
    }
    const authorRole = document.getElementById('author-role-input').value.trim() || 'Staff Writer';
    const authorBio = document.getElementById('author-bio-input').value.trim() || 'Editorial contributor at The Horizoon.';
    const authorAvatar = document.getElementById('author-avatar-url').value.trim() || 'assets/images/avatar-elena.jpg';

    const author = {
      name: authorName,
      role: authorRole,
      bio: authorBio,
      avatar: authorAvatar
    };

    const payload = {
      title,
      slug,
      summary,
      image: image || 'assets/images/featured-mindfulness.jpg',
      imageAlt,
      content: normalizeContentLinks(content),
      status,
      category,
      categorySlug: category.toLowerCase().replace(/\s+/g, '-'),
      author,
      tags: tagsRaw.split(',').map(s => s.trim()).filter(Boolean),
      seoTitle,
      metaDesc
    };

    const saveBtn = document.getElementById('btn-save-post');
    const draftBtn = document.getElementById('btn-save-draft');
    if (saveBtn) saveBtn.disabled = true;
    if (draftBtn) draftBtn.disabled = true;

    try {
      if (!authToken) {
        showAdminToast('You must be logged in as admin to publish or save articles.', 'error');
        showLoginScreen();
        return;
      }

      let res;
      if (editingPostId) {
        res = await fetch(`${API_BASE}/api/posts/${editingPostId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/api/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.success && data.post) {
          const isLive = data.post.status === 'published';
          showAdminToast(
            isLive
              ? (editingPostId ? 'Article updated & published live!' : 'Article published live & stored in database!')
              : 'Saved privately as draft.',
            'success'
          );
          editingPostId = null;

          // Also keep local storage cache updated
          const localPosts = getLocalStoredPosts();
          const existingIdx = localPosts.findIndex(p => String(p.id) === String(data.post.id) || p.slug === data.post.slug);
          if (existingIdx !== -1) {
            localPosts[existingIdx] = data.post;
          } else {
            localPosts.unshift(data.post);
          }
          saveLocalStoredPosts(localPosts);

          await loadAllArticles();
          await loadDashboardData();
          switchTab('articles');
          return;
        }
      }

      // If server returned an error (e.g. 400, 401, 500)
      if (res) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          showAdminToast('Admin session expired. Please sign in again.', 'error');
          showLoginScreen();
          return;
        }
        showAdminToast(errData.message || `Server error (${res.status}): Could not save article.`, 'error');
        return;
      }
    } catch (err) {
      console.error('Backend save error:', err);
      showAdminToast('Could not reach backend server. Please verify the server is running.', 'error');
      return;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      if (draftBtn) draftBtn.disabled = false;
    }
  });
}

// Bind explicit "Save Draft" and "Publish Post" buttons
const btnSaveDraft = document.getElementById('btn-save-draft');
if (btnSaveDraft) {
  btnSaveDraft.addEventListener('click', () => {
    const statusSelect = document.getElementById('post-status-select');
    if (statusSelect) statusSelect.value = 'draft';
    const form = document.getElementById('post-editor-form');
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  });
}

const btnSavePost = document.getElementById('btn-save-post');
if (btnSavePost) {
  btnSavePost.addEventListener('click', () => {
    const statusSelect = document.getElementById('post-status-select');
    if (statusSelect) statusSelect.value = 'published';
  });
}

// Initial bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
