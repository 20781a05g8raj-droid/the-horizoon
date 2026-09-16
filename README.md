# The Horizoon 🌅
> **Fresh Perspectives Every Day** — A modern, responsive lifestyle and wellness editorial blog platform.

![The Horizoon Logo](assets/images/logo.png)

## Overview
**The Horizoon** is a production-grade editorial website built for mindful living, slow travel, healthy culinary nutrition, deep work focus, and intentional rest. Designed with an elegant, responsive aesthetic matching clean editorial typography, warm palettes, and navy blue brand identity (`#0B5A8A`).

---

## 🌟 Key Features

- **Replicated Editorial Layout**: Faithfully structured matching modern lifestyle publications:
  - Sticky header with category dropdowns, live search modal, and bookmark badge.
  - Interactive two-column Hero section with 01–03 slide carousel and mini latest headlines.
  - 8-category icon explorer strip (*Lifestyle, Travel, Food, Health, Productivity, Technology, Personal Finance, Inspiration*).
  - Two-column Featured Article section with handwritten overlay (`"A Healthier Happier You"`).
  - 4-column numbered Trending Now grid.
  - Full-width dark navy Newsletter banner.
  - 4-column Latest Articles grid.
  - Complete, accessible footer.
- **6 Full Original SEO-Optimized Articles** (1,200–1,400+ words each) across Travel, Food, Health, Productivity, Technology, and Lifestyle.
  - Includes internal links, 3–5 high-authority external citations (.gov, .edu, academic health portals), reading time, author bios, and JSON-LD Article structured data.
- **Dedicated Pages**:
  - `index.html` — Homepage
  - `blog.html` — Archive with live search, 8 category filter pills, sorting, and pagination
  - `post.html` — Single post template with dynamic TOC, reading progress bar, social share, and interactive comments
  - `category.html` — Category landing page for all 8 categories
  - `newsletter.html` — Dedicated Sunday Briefing newsletter subscription page with reader testimonials
  - `about.html` — Brand story, core values, and editorial team
  - `contact.html` — Working contact form with validation, success modal, and interactive FAQ accordion
  - `privacy.html` — Privacy policy and data protection terms
  - `404.html` — Branded 404 error page
  - `sitemap.xml` & `robots.txt` — Search engine crawler indexing
- **Interactive Functionality**:
  - Live search modal (`/` or `Ctrl+K`).
  - Saved articles drawer with `localStorage` persistence.
  - Working newsletter subscription engine with toast notifications.
  - Dynamic Table of Contents with scroll-spy highlighting.
  - Working reader discussion / comment submission system.
  - Live organic post view counter with analytics tracking.
  - Full-featured Editorial Admin Panel & SEO Studio (`/admin`).

---

## 🚀 Getting Started

### 1. Running the Full SEO Backend & Admin Suite (Recommended)

Run the Node.js Express server with live SEO prerendering, view counters, and admin suite:

```bash
# Install dependencies (first time only)
npm install

# Start the server
npm start
```

- **Public Website**: `http://localhost:3000`
- **Admin Panel & SEO Studio**: `http://localhost:3000/admin`
  - **Authentication**: Secured via Supabase Auth & PBKDF2 cryptography. Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file or update inside the Admin Panel under **Security & Settings**.
- **Dynamic Sitemap**: `http://localhost:3000/sitemap.xml`

### 2. Static File Mode

You can also preview statically without backend writing capabilities:

```bash
npx serve .
# Or using Python:
python -m http.server 3000
```

---

## 🎨 Brand Guidelines
- **Primary Navy**: `#0B5A8A`
- **Deep Midnight Navy**: `#073552`
- **Charcoal Text**: `#141A20`
- **Editorial Serif**: *Playfair Display*
- **Interface Sans**: *Plus Jakarta Sans*
- **Handwritten Script**: *Caveat*

---

## 📄 License
© 2026 The Horizoon. All rights reserved.
