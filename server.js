import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import {
  getAllPosts,
  getAllPostsAsync,
  getPostBySlug,
  getPostBySlugAsync,
  getPostById,
  createPost,
  createPostAsync,
  updatePost,
  updatePostAsync,
  deletePost,
  deletePostAsync,
  incrementPostViews,
  incrementPostViewsAsync,
  getStats,
  getStatsAsync,
  getCategories,
  getAuthors,
  syncWithSupabase
} from './data/storage.js';
import {
  checkSupabaseStatus,
  saveCommentInSupabase,
  getCommentsFromSupabase,
  saveNewsletterSubscriber,
  saveContactMessage
} from './data/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

// Admin Secret Key / Hardcoded default for editor login
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USER || 'admin',
  password: process.env.ADMIN_PASSWORD || 'horizoon2026'
};
const ADMIN_TOKEN = 'hz-admin-secret-session-token-2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static asset handlers (supports both root, admin, and /post/:slug relative subpath)
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/post/css', express.static(path.join(__dirname, 'css')));
app.use('/post/assets', express.static(path.join(__dirname, 'assets')));
app.use('/post/js', express.static(path.join(__dirname, 'js')));

// Set up Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'assets', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF, SVG) are allowed'));
  }
});

// Auth helper
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes(ADMIN_TOKEN)) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Admin login required.' });
  }
  next();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// 1. DYNAMIC SEO PRERENDER ROUTE: /post/:slug and /post.html
// Injects rich SEO tags, Open Graph, Twitter Cards, Schema.org JSON-LD,
// and complete article content into the HTML before sending to browser / crawler!
// ============================================================================
async function renderSeoPost(req, res) {
  let slug = req.params?.slug || req.query?.slug;
  if (!slug) {
    const rawUrl = req.url || '';
    const match = rawUrl.match(/\/post\/([^?#/]+)/);
    if (match) slug = match[1];
  }
  if (!slug) {
    const matched = req.headers['x-matched-path'] || req.headers['x-now-route-matches'] || '';
    const match = matched.match(/\/post\/([^?#/]+)/);
    if (match) slug = match[1];
  }
  if (!slug) slug = 'mindfulness-practices-daily-peace';

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  let liveViews = 0;
  try {
    liveViews = await incrementPostViewsAsync(slug, String(clientIp));
  } catch (e) {}

  let post = await getPostBySlugAsync(slug);
  if (!post && decodeURIComponent(slug) !== slug) {
    post = await getPostBySlugAsync(decodeURIComponent(slug));
  }
  if (!post) {
    const all = await getAllPostsAsync({ status: 'published' });
    post = all.find(p => p.slug === slug || p.slug === decodeURIComponent(slug));
    if (!post && all.length > 0) {
      post = all[0];
    }
  }
  if (post && liveViews > 0) {
    post.views = liveViews;
  }

  const candidatePaths = [
    path.join(__dirname, 'post.html'),
    path.join(process.cwd(), 'post.html'),
    path.join(__dirname, '..', 'post.html'),
    path.resolve('post.html')
  ];
  const postHtmlPath = candidatePaths.find(p => fs.existsSync(p));

  if (!postHtmlPath) {
    return res.status(404).send('Template post.html not found');
  }

  let html = fs.readFileSync(postHtmlPath, 'utf-8');

  if (post) {
    const postUrl = `${SITE_URL}/post/${post.slug}`;
    const isDataImg = (post.image || '').startsWith('data:') || (post.image || '').startsWith('blob:');
    const imageUrl = isDataImg
      ? `${SITE_URL}/assets/images/featured-mindfulness.jpg`
      : (post.image.startsWith('http') ? post.image : `${SITE_URL}/${post.image.replace(/^\//, '')}`);
    const pageTitle = `${post.seoTitle || post.title} | The Horizoon`;
    const cleanDesc = (post.metaDesc || post.summary || '').replace(/"/g, '&quot;');
    const imageAlt = escapeHtml(post.imageAlt || post.title);

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    // Replace Meta Description
    html = html.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
      `<meta name="description" content="${cleanDesc}">\n  <meta name="keywords" content="${escapeHtml((post.tags || []).join(', '))}">\n  <meta name="author" content="${escapeHtml(post.author?.name || 'The Horizoon')}">`
    );

    // Replace Canonical Link
    html = html.replace(
      /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i,
      `<link rel="canonical" href="${postUrl}">`
    );

    // Replace Open Graph Tags
    const ogBlock = `
  <!-- Primary Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${cleanDesc}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:alt" content="${imageAlt}">
  <meta property="article:published_time" content="${post.isoDate || post.createdAt}">
  <meta property="article:section" content="${escapeHtml(post.category)}">
  ${(post.tags || []).map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n  ')}

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${postUrl}">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${cleanDesc}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${imageAlt}">
    `;

    html = html.replace(/<meta\s+property="og:type"[\s\S]*?<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, ogBlock.trim());

    // Inject JSON-LD Schema
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postUrl
      },
      "headline": post.title,
      "description": post.metaDesc || post.summary,
      "image": [imageUrl],
      "datePublished": post.isoDate || post.createdAt,
      "dateModified": post.updatedAt || post.isoDate || post.createdAt,
      "author": {
        "@type": "Person",
        "name": post.author?.name || "The Horizoon Team",
        "jobTitle": post.author?.role || "Editor"
      },
      "publisher": {
        "@type": "Organization",
        "name": "The Horizoon",
        "logo": {
          "@type": "ImageObject",
          "url": `${SITE_URL}/assets/images/logo.png`
        }
      },
      "articleSection": post.category,
      "keywords": (post.tags || []).join(', '),
      "wordCount": post.wordsCount || 1000
    };

    const schemaScript = `\n  <script type="application/ld+json">\n  ${JSON.stringify(schemaData, null, 2)}\n  </script>`;
    html = html.replace('</head>', `${schemaScript}\n</head>`);

    // Guarantee base href exists for stylesheet & asset loading
    if (!html.includes('<base href="/">')) {
      html = html.replace('<head>', '<head>\n  <base href="/">');
    }

    // Ensure all asset paths are absolute
    html = html.replace(/href="css\//g, 'href="/css/');
    html = html.replace(/href="assets\//g, 'href="/assets/');
    html = html.replace(/src="assets\//g, 'src="/assets/');
    html = html.replace(/src="js\//g, 'src="/js/');

    // Inject Server Post Data into window for instant client-side rendering with zero flicker
    const safeDataScript = `\n  <script id="__HORIZOON_INITIAL_POST__" type="application/json">${JSON.stringify(post).replace(/</g, '\\u003c')}</script>`;
    html = html.replace('</body>', `${safeDataScript}\n</body>`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

// Register SEO routes
app.get('/post/:slug', renderSeoPost);
app.get('/post', renderSeoPost);
app.get('/post.html', (req, res, next) => {
  if (req.query && req.query.slug) {
    return renderSeoPost(req, res);
  }
  next();
});
app.get('/api/index.js', (req, res, next) => {
  if (req.query && req.query.slug) {
    return renderSeoPost(req, res);
  }
  next();
});

// ============================================================================
// 2. DYNAMIC SITEMAP: /sitemap.xml
// Auto-discovers all published posts with Google Image extensions & dates!
// ============================================================================
app.get('/sitemap.xml', async (req, res) => {
  const posts = await getAllPostsAsync({ status: 'published' });
  const categories = getCategories();
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Core Pages -->
  <url>
    <loc>${SITE_URL}/index.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${SITE_URL}/contact.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${SITE_URL}/newsletter.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Category Landing Pages -->
  ${categories.map(c => `
  <url>
    <loc>${SITE_URL}/category.html?cat=${c.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}

  <!-- Published Blog Posts (Rankable Single SEO Pages) -->
  ${posts.map(p => {
    const postDate = (p.updatedAt || p.createdAt || p.isoDate || today).split('T')[0];
    const isDataImg = (p.image || '').startsWith('data:') || (p.image || '').startsWith('blob:');
    const imageUrl = isDataImg
      ? `${SITE_URL}/assets/images/featured-mindfulness.jpg`
      : (p.image.startsWith('http') ? p.image : `${SITE_URL}/${p.image.replace(/^\//, '')}`);
    return `
  <url>
    <loc>${SITE_URL}/post/${p.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(p.title)}</image:title>
      <image:caption>${escapeXml(p.imageAlt || p.title)}</image:caption>
    </image:image>
  </url>`;
  }).join('')}

</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml.trim());
});

// ============================================================================
// 3. REST API ENDPOINTS
// ============================================================================

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    return res.json({
      success: true,
      token: ADMIN_TOKEN,
      user: {
        username: ADMIN_CREDENTIALS.username,
        role: 'Editor-in-Chief',
        name: 'Horizoon Admin'
      }
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password.' });
});

// Admin Session Verification
app.get('/api/admin/verify', requireAuth, (req, res) => {
  res.json({ success: true, user: { username: ADMIN_CREDENTIALS.username, role: 'Editor-in-Chief' } });
});

// Get all posts (public: published only, admin: can request all)
app.get('/api/posts', async (req, res) => {
  const { category, search, sort, status } = req.query;
  const isAuth = (req.headers.authorization || '').includes(ADMIN_TOKEN);
  const filterStatus = isAuth && status ? status : (status || 'published');

  const posts = await getAllPostsAsync({
    category,
    search,
    sort: sort || 'newest',
    status: filterStatus === 'all' ? undefined : filterStatus
  });

  res.json({
    success: true,
    count: posts.length,
    posts
  });
});

// Get single post by slug
app.get('/api/posts/:slug', async (req, res) => {
  const post = await getPostBySlugAsync(req.params.slug);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found.' });
  }
  res.json({ success: true, post });
});

// Record Organic Post View (Live View Counter)
app.post('/api/posts/:slug/view', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const views = await incrementPostViewsAsync(req.params.slug, String(ip));
  res.json({ success: true, views });
});

// Create new post (Admin required)
app.post('/api/posts', requireAuth, async (req, res) => {
  const {
    title,
    slug,
    category,
    categorySlug,
    seoTitle,
    metaDesc,
    author,
    image,
    imageAlt,
    tags,
    summary,
    content,
    status
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Article title is required.' });
  }

  // Generate clean slug if not given
  let cleanSlug = (slug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!cleanSlug) {
    cleanSlug = `article-${Date.now()}`;
  }

  // Check slug uniqueness
  let existing = await getPostBySlugAsync(cleanSlug);
  if (existing) {
    cleanSlug = `${cleanSlug}-${Math.floor(Math.random() * 1000)}`;
  }

  // Validate image alt text
  if (image && (!imageAlt || !imageAlt.trim())) {
    return res.status(400).json({
      success: false,
      message: 'For high SEO performance, Image Alt Text is mandatory for every uploaded or featured image.'
    });
  }

  function normalizeContentHtml(html) {
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

  const newPost = await createPostAsync({
    title: title.trim(),
    slug: cleanSlug,
    category: category || 'Lifestyle',
    categorySlug: categorySlug || (category || 'lifestyle').toLowerCase().replace(/\s+/g, '-'),
    seoTitle: seoTitle || title.trim(),
    metaDesc: metaDesc || summary || title.trim(),
    author: author,
    image: image || 'assets/images/featured-mindfulness.jpg',
    imageAlt: imageAlt || title.trim(),
    tags: tags || [],
    summary: summary || '',
    content: normalizeContentHtml(content || ''),
    status: status || 'published'
  });

  res.status(201).json({
    success: true,
    message: 'Article published & saved to Supabase successfully!',
    post: newPost
  });
});

// Update post (Admin required)
app.put('/api/posts/:id', requireAuth, async (req, res) => {
  const updateData = { ...req.body };
  if (updateData.content) {
    updateData.content = updateData.content.replace(/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi, (match, prefix, href, suffix) => {
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
  const updated = await updatePostAsync(req.params.id, updateData);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Post not found.' });
  }
  res.json({
    success: true,
    message: 'Article updated & saved to Supabase successfully!',
    post: updated
  });
});

// Delete post (Admin required)
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  const success = await deletePostAsync(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Post not found.' });
  }
  res.json({
    success: true,
    message: 'Article deleted successfully.'
  });
});

// Image Upload Endpoint (Admin required)
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  const relativePath = `assets/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: relativePath,
    fullUrl: `${SITE_URL}/${relativePath}`,
    filename: req.file.filename
  });
});

// Admin Dashboard Analytics
app.get('/api/stats', requireAuth, async (req, res) => {
  const stats = await getStatsAsync();
  res.json({
    success: true,
    stats
  });
});

// Taxonomy Helpers
app.get('/api/categories', (req, res) => {
  res.json({ success: true, categories: getCategories() });
});

app.get('/api/authors', (req, res) => {
  res.json({ success: true, authors: getAuthors() });
});

// Supabase Status & Sync Endpoint
app.get('/api/supabase/status', async (req, res) => {
  const isConnected = await checkSupabaseStatus();
  res.json({
    success: true,
    connected: isConnected,
    project: 'inpwfukukgfjcphljoef',
    message: isConnected ? 'Supabase database is connected & active.' : 'Supabase table "posts" needs to be created in SQL Editor.'
  });
});

app.post('/api/supabase/sync', requireAuth, async (req, res) => {
  const synced = await syncWithSupabase();
  res.json({
    success: synced,
    message: synced ? 'Successfully synchronized with Supabase database!' : 'Could not sync. Ensure "posts" table is created in Supabase.'
  });
});

// Comments API (Stores in Supabase)
app.get('/api/comments/:slug', async (req, res) => {
  const comments = await getCommentsFromSupabase(req.params.slug);
  res.json({ success: true, comments: comments || [] });
});

app.post('/api/comments', async (req, res) => {
  const { postSlug, authorName, authorEmail, content } = req.body;
  if (!postSlug || !authorName || !content) {
    return res.status(400).json({ success: false, message: 'Missing required comment fields.' });
  }
  const saved = await saveCommentInSupabase({ postSlug, authorName, authorEmail, content });
  res.status(201).json({ success: true, message: 'Comment submitted successfully!', comment: saved });
});

// Newsletter Subscription API (Stores in Supabase)
app.post('/api/newsletter', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email address required.' });
  }
  await saveNewsletterSubscriber(email, name);
  res.json({ success: true, message: 'Subscribed successfully to The Horizoon Dispatch!' });
});

// Contact Form Inquiries API (Stores in Supabase)
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Please fill out all required fields.' });
  }
  await saveContactMessage({ name, email, subject, message });
  res.json({ success: true, message: 'Thank you for reaching out! Our editorial team will review your message.' });
});

// Try initial background sync with Supabase
syncWithSupabase().catch(() => {});

// ============================================================================
// 4. SERVE STATIC ASSETS & HTML PAGES
// ============================================================================
app.use(express.static(__dirname));

// Fallback to static files or index.html
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      return res.sendFile(filePath);
    }
    const dirIndexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(dirIndexPath) && fs.statSync(dirIndexPath).isFile()) {
      return res.sendFile(dirIndexPath);
    }
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🌅 The Horizoon Server running at: ${SITE_URL}`);
    console.log(`🔐 Admin Panel available at: ${SITE_URL}/admin`);
  });
}

export default app;
