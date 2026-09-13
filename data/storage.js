import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getPostsFromSupabase,
  upsertPostInSupabase,
  deletePostFromSupabase,
  incrementViewsInSupabase,
  checkSupabaseStatus
} from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

// Memory cache of recent views: key = `${slug}_${ip}`, value = timestamp
const recentViews = new Map();

// Initial articles dataset
const INITIAL_ARTICLES = [
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
      bio: "Sophia Lin is a culinary educator and travel essayist who has lived in six countries. She documents sustainable foodways, seasonal nutrition, and budget-friendly exploration.",
      avatar: "assets/images/avatar-sophia.jpg"
    },
    image: "assets/images/latest-solo-travel.jpg",
    imageAlt: "Solo traveler standing on coastal cliffs overlooking sunlit turquoise waters",
    tags: ["Solo Travel", "Budget Travel", "Mindful Living", "Adventure"],
    summary: "Embarking on a solo journey is far more than a physical expedition—it is an exercise in self-reliance, cultural immersion, and intentional discovery.",
    content: `<p class="lead">Embarking on a solo journey is far more than a physical vacation—it is an exercise in deep self-reliance, cultural empathy, and restorative mental clarity. In 2026, as remote flexibility and global rail connectivity reach new heights, traveling on your own terms has evolved from a niche adventure into one of the most accessible avenues for personal growth.</p><h2>The Modern Paradigm of Solo Travel</h2><p>Historically, traveling alone was often portrayed either as an act of solitary soul-searching or an intimidating feat fraught with logistical risk. Today, smart travelers approach solo exploration with intentionality. According to global travel trend studies published by the <a href="https://www.unwto.org" target="_blank" rel="noopener noreferrer">UN World Tourism Organization</a>, independent travelers report higher scores in problem-solving autonomy and emotional resilience following self-directed voyages.</p><p>When you navigate a foreign city without familiar companionship, your sensory awareness naturally expands. You are not insulated by habitual conversations; instead, you engage directly with neighborhood baristas, fellow museum-goers, and regional artisans.</p><h2>Crucial Pre-Trip Planning & Safety Protocols</h2><p>True spontaneity thrives on the foundation of rigorous preparation. Ensuring personal safety does not mean succumbing to paranoia; rather, it means establishing effortless safety routines that let you explore with absolute peace of mind.</p><h3>1. The Triple-Redundancy Digital Vault</h3><p>Never rely exclusively on a single smartphone or physical wallet. Before departure, organize your vital credentials according to the 3-2-1 backup standard recommended by cybersecurity standards.</p><h3>2. Verifying Destination Advisories</h3><p>Consult official consular portals for real-time updates on regional transport strikes, health vaccination requirements, and localized safety tips for solo walkers.</p><h2>Budget-Savvy Hacks That Enhance Cultural Connection</h2><blockquote>"Budgeting on a solo voyage is not about spending less on life; it is about investing strictly in what enriches you, while quietly trimming away the synthetic tourist traps."</blockquote><h3>Ditch Tourist Dining for Regional Food Markets</h3><p>Instead of dining at English-menu tourist bistros adjacent to crowded plazas, seek out municipal indoor markets and cooperative farm stalls. Not only will your food expenses plummet by 60%, but you will also sample genuine seasonal produce.</p><p>By pairing intentional safety discipline with open-hearted curiosity, solo travel ceases to be a daunting undertaking and transforms into an enduring wellspring of self-trust, lifelong memories, and fresh perspectives.</p>`,
    views: 0,
    status: "published",
    createdAt: "2026-09-06T08:00:00.000Z",
    updatedAt: "2026-09-06T08:00:00.000Z"
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
      bio: "Sophia Lin is a culinary educator and travel essayist who has lived in six countries. She documents sustainable foodways, seasonal nutrition, and budget-friendly exploration.",
      avatar: "assets/images/avatar-sophia.jpg"
    },
    image: "assets/images/latest-budget-meals.jpg",
    imageAlt: "Vibrant bowl of nutritious pasta tossed with roasted tomatoes, leafy spinach, and cold-pressed olive oil",
    tags: ["Nutrition", "Meal Prep", "Healthy Eating", "Wellness"],
    summary: "Eating wholesome, energy-sustaining food does not demand hours in the kitchen. Discover 15-minute culinary frameworks designed for demanding schedules.",
    content: `<p class="lead">When deadlines mount and our schedules buckle under pressure, nutritional quality is frequently the first casualty. We succumb to ultra-processed takeout, sugary convenience snacks, and erratic eating habits that lead to midday energy crashes. Yet nourishing your body does not require gourmet culinary training or exhausting hours at the stove.</p><h2>The Science of Metabolic Steadiness</h2><p>Our cognitive stamina, emotional regulation, and physical endurance are fundamentally tied to steady blood glucose management. Clinical insights underscore that pairing high-fiber complex carbohydrates with lean proteins and polyphenol-rich healthy fats prevents sharp postprandial glucose spikes.</p><h2>The 3-Component 15-Minute Plate Blueprint</h2><div class="callout-box"><h4>The Golden Triad Formula:</h4><p><strong>1. Clean Protein Foundation (25-30g):</strong> Wild-caught sardines, organic tempeh, brown lentils, or pasture-raised eggs.<br><strong>2. High-Density Phytonutrients (2 cups):</strong> Baby arugula, Tuscan kale, or steamed broccoli.<br><strong>3. Unrefined Lipids & Slow Carbs:</strong> Extra virgin olive oil, pumpkin seeds, avocado, or Japanese sweet potato.</p></div><h2>Three 15-Minute Recipes That Taste Exceptional</h2><h3>1. Mediterranean Salmon & Cannellini Warm Skillet</h3><p>Total Time: 12 minutes. Sear salmon fillets for 4 minutes per side until crisp. Toss cannellini beans and cherry tomatoes into residual pan oils for 2 minutes with garlic and spinach.</p><h3>2. Golden Turmeric Tofu & Sesame Crunch Bowl</h3><p>Total Time: 14 minutes. Crumble organic tofu into a hot non-stick pan with turmeric, smoked paprika, and tamari over a quinoa and fresh cucumber base.</p>`,
    views: 0,
    status: "published",
    createdAt: "2026-09-04T08:00:00.000Z",
    updatedAt: "2026-09-04T08:00:00.000Z"
  },
  {
    id: "post-3",
    slug: "mindfulness-practices-daily-peace",
    category: "Health",
    categorySlug: "health",
    title: "Mindfulness Practices for Daily Peace: A Science-Backed Guide",
    seoTitle: "Mindfulness Practices for Daily Peace: Science-Backed Guide",
    metaDesc: "Discover science-backed mindfulness practices, somatic breathwork, and daily rituals that reduce stress and cultivate emotional peace. Read more.",
    date: "Aug 30, 2026",
    isoDate: "2026-08-30T08:00:00Z",
    readTime: "8 min read",
    wordsCount: 1390,
    author: {
      name: "Elena Vance",
      role: "Senior Wellness & Lifestyle Editor",
      bio: "Elena Vance is a mindfulness researcher, certified somatic practitioner, and author of *The Quiet Horizoon*. She writes on mental health, intentional living, and emotional restoration.",
      avatar: "assets/images/avatar-elena.jpg"
    },
    image: "assets/images/featured-mindfulness.jpg",
    imageAlt: "Woman sitting in serene meditation on a mountain ridge during a warm golden sunrise",
    tags: ["Mindfulness", "Mental Health", "Meditation", "Wellness"],
    summary: "Cultivating inner stillness in an overstimulated culture does not require hours in retreat. Discover micro-habits and somatic shifts that restore genuine equilibrium.",
    content: `<p class="lead">In an age defined by unrelenting alerts, rapid-fire headlines, and hyper-connectivity, chronic low-grade anxiety has become the default backdrop of modern existence. Mindfulness offers a courageous, grounded alternative: returning home to the reality of the present moment.</p><h2>The Neurobiology of the Present Moment</h2><p>Far from being an esoteric or passive luxury, mindfulness induces tangible, measurable modifications in brain architecture. Rigorous neuroimaging investigations demonstrate observable reductions in gray-matter volume of the right amygdala—the brain's emotional threat center.</p><h2>Three Somatic Grounding Tools for Instant De-escalation</h2><h3>1. The Physiological Sigh (Double Inhale Protocol)</h3><p>Take two consecutive inhales through your nose without pausing—the first deep and expansive, followed immediately by a short, sharp top-up inhale. Release all the air through an open, relaxed mouth in a prolonged, unforced sigh lasting 6 to 8 seconds. Repeat 3 to 5 times.</p><h3>2. The 5-4-3-2-1 Sensory Orientation Matrix</h3><p>Anchor yourself by naming 5 things you can see, 4 you can touch, 3 sounds you can hear, 2 aromas, and 1 taste.</p>`,
    views: 0,
    status: "published",
    createdAt: "2026-08-30T08:00:00.000Z",
    updatedAt: "2026-08-30T08:00:00.000Z"
  },
  {
    id: "post-4",
    slug: "deep-work-focus-habits",
    category: "Productivity",
    categorySlug: "productivity",
    title: "How to Stay Focused in a Distracted World: Proven Deep Work Protocols",
    seoTitle: "How to Stay Focused: Proven Deep Work Focus Protocols",
    metaDesc: "Master deep cognitive focus in a distracted world with time-blocking architectures, sensory boundaries, and attention hygiene. Read the full guide.",
    date: "Sep 2, 2026",
    isoDate: "2026-09-02T08:00:00Z",
    readTime: "9 min read",
    wordsCount: 1410,
    author: {
      name: "Marcus Thorne",
      role: "Productivity Strategist & Tech Columnist",
      bio: "Marcus Thorne is a former systems architect turned cognitive workflow consultant. He helps remote professionals build deep focus systems and humane digital boundaries.",
      avatar: "assets/images/avatar-marcus.jpg"
    },
    image: "assets/images/latest-productivity-tools.jpg",
    imageAlt: "Clean, distraction-free minimalist workspace with laptop, ceramic coffee cup, and natural sunlight",
    tags: ["Productivity", "Deep Work", "Focus", "Time Management"],
    summary: "Attention is our most precious cognitive asset. Learn how to construct an impenetrable fortress of focus amidst the relentless noise of modern work.",
    content: `<p class="lead">Knowledge workers today operate in an ecosystem engineered for distraction. Open-plan offices, persistent Slack pings, endless email threads, and social algorithms compete voraciously for every crumb of our attention. The consequence is not merely lost hours; it is the erosion of our capacity for profound, high-leverage thinking.</p><h2>The Hidden Tax of Attention Residue</h2><p>Research reveals that after an interruption, it takes an average of 23 minutes and 15 seconds to return to the original task. When you glance at an incoming notification for three seconds, a portion of your cognitive bandwidth remains tethered to that message for up to thirty minutes.</p><h2>The Three Pillars of Deep Work Architecture</h2><h3>1. The Bi-Daily 90-Minute Focus Fortress</h3><p>Align your most challenging analytical tasks with natural 90-minute ultradian cycles. Block One (08:30 - 10:00): Zero communication channels open.</p>`,
    views: 0,
    status: "published",
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-02T08:00:00.000Z"
  },
  {
    id: "post-5",
    slug: "digital-minimalism-reclaiming-focus",
    category: "Technology",
    categorySlug: "technology",
    title: "The Art of Digital Minimalism: Reclaiming Focus in an Always-On Era",
    seoTitle: "The Art of Digital Minimalism: Reclaim Focus & Clarity",
    metaDesc: "Reclaim your attention with digital minimalism. Learn practical philosophies, device decluttering protocols, and mindful tech habits for peace of mind.",
    date: "Aug 20, 2026",
    isoDate: "2026-08-20T08:00:00Z",
    readTime: "8 min read",
    wordsCount: 1320,
    author: {
      name: "Marcus Thorne",
      role: "Productivity Strategist & Tech Columnist",
      bio: "Marcus Thorne is a former systems architect turned cognitive workflow consultant. He helps remote professionals build deep focus systems and humane digital boundaries.",
      avatar: "assets/images/avatar-marcus.jpg"
    },
    image: "assets/images/trend-digital-minimalism.jpg",
    imageAlt: "Lush sunlit forest trail representing stillness, mental space, and freedom from digital clutter",
    tags: ["Technology", "Digital Minimalism", "Mindfulness", "Productivity"],
    summary: "Digital minimalism is not about abandoning modern technology; it is the art of aggressively selecting the tools that serve your deepest values while discarding the rest.",
    content: `<p class="lead">Technology was promised to liberate us—to automate tedious chores, connect us across oceans, and grant us effortless access to the sum of human wisdom. Instead, many of us find ourselves gripped by a compulsive twitch to refresh feeds, check metrics, and consume endless algorithmic streams that leave us drained, anxious, and cognitively scattered.</p><h2>What Digital Minimalism Truly Means</h2><p>Digital minimalism is a philosophy of technology use in which you focus your online time on a small number of carefully selected activities that strongly support things you value, happily missing out on everything else.</p>`,
    views: 0,
    status: "published",
    createdAt: "2026-08-20T08:00:00.000Z",
    updatedAt: "2026-08-20T08:00:00.000Z"
  },
  {
    id: "post-6",
    slug: "power-of-intentional-rest",
    category: "Lifestyle",
    categorySlug: "lifestyle",
    title: "The Power of Rest in a Busy World: Why Intentional Recovery Transforms Everything",
    seoTitle: "The Power of Rest: Why Intentional Recovery Transforms Us",
    metaDesc: "Discover why true rest goes beyond sleep. Explore the 7 types of rest, circadian restoration, and intentional recovery rituals for a revitalized life.",
    date: "Aug 30, 2026",
    isoDate: "2026-08-30T08:00:00Z",
    readTime: "8 min read",
    wordsCount: 1350,
    author: {
      name: "Elena Vance",
      role: "Senior Wellness & Lifestyle Editor",
      bio: "Elena Vance is a mindfulness researcher, certified somatic practitioner, and author of *The Quiet Horizoon*. She writes on mental health, intentional living, and emotional restoration.",
      avatar: "assets/images/avatar-elena.jpg"
    },
    image: "assets/images/thumb-rest-dog.jpg",
    imageAlt: "Cozy bedroom bathed in morning sunlight with soft linen blankets and a peaceful sleeping dog",
    tags: ["Rest", "Sleep Health", "Burnout Prevention", "Lifestyle"],
    summary: "We live in a culture that treats exhaustion as a badge of honor. Uncover the seven biological and sensory modes of rest required to truly revitalize your mind and body.",
    content: `<p class="lead">Modern society has turned hustle into a moral virtue and exhaustion into a status symbol. We boast of our packed calendars, brag about sixty-hour workweeks, and treat rest as an apologetic concession when our bodies finally collapse from depletion. Yet biological reality refuses to negotiate: chronic rest deficit silently destroys immune health, dulls creativity, and fractures emotional stability.</p><h2>Why Sleep Alone Is Not Enough</h2><p>Many of us have had the experience of sleeping for eight or nine hours, only to awaken feeling just as weary and depleted as the night before. This occurs because <strong>sleep and rest are not identical</strong>. Humans require seven distinct categories of rest: physical, mental, sensory, creative, emotional, social, and spiritual rest.</p>`,
    views: 0,
    status: "published",
    createdAt: "2026-08-30T08:00:00.000Z",
    updatedAt: "2026-08-30T08:00:00.000Z"
  }
];

let inMemoryDb = null;

function getActiveDbPath() {
  if (process.env.VERCEL) {
    const tmpPath = path.join('/tmp', 'db.json');
    if (fs.existsSync(tmpPath)) {
      return tmpPath;
    }
  }
  return DB_PATH;
}

function readDb() {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  const activePath = getActiveDbPath();
  if (!fs.existsSync(activePath) && !fs.existsSync(DB_PATH)) {
    const initialData = {
      posts: INITIAL_ARTICLES,
      categories: [
        { name: "Mindfulness", slug: "mindfulness" },
        { name: "Travel", slug: "travel" },
        { name: "Food", slug: "food" },
        { name: "Productivity", slug: "productivity" },
        { name: "Technology", slug: "technology" },
        { name: "Lifestyle", slug: "lifestyle" }
      ],
      authors: [
        {
          id: "elena",
          name: "Elena Vance",
          role: "Senior Wellness & Lifestyle Editor",
          bio: "Elena Vance is a mindfulness researcher, certified somatic practitioner, and author of The Quiet Horizoon.",
          avatar: "assets/images/avatar-elena.jpg"
        },
        {
          id: "marcus",
          name: "Marcus Thorne",
          role: "Productivity Strategist & Tech Columnist",
          bio: "Marcus Thorne is a former systems architect turned cognitive workflow consultant.",
          avatar: "assets/images/avatar-marcus.jpg"
        },
        {
          id: "sophia",
          name: "Sophia Lin",
          role: "Culinary Nutritionist & Slow Travel Writer",
          bio: "Sophia Lin is a culinary educator and travel essayist who has lived in six countries.",
          avatar: "assets/images/avatar-sophia.jpg"
        }
      ]
    };
    writeDb(initialData);
    inMemoryDb = initialData;
    return initialData;
  }

  try {
    const targetFile = fs.existsSync(activePath) ? activePath : DB_PATH;
    const raw = fs.readFileSync(targetFile, 'utf-8');
    inMemoryDb = JSON.parse(raw);
    return inMemoryDb;
  } catch (err) {
    console.error('Error reading db.json, returning empty store:', err);
    return { posts: [], categories: [], authors: [] };
  }
}

function writeDb(data) {
  inMemoryDb = data;
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem (e.g. Vercel serverless environment), fallback to /tmp
    try {
      const tmpPath = path.join('/tmp', 'db.json');
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (tmpErr) {
      console.warn('Could not write to /tmp, kept in memory:', tmpErr.message);
    }
  }
}

export function getAllPosts({ category, search, sort = 'newest', status } = {}) {
  const db = readDb();
  let posts = [...db.posts];

  if (status) {
    posts = posts.filter(p => p.status === status);
  }

  if (category && category !== 'all') {
    posts = posts.filter(p => (p.categorySlug || '').toLowerCase() === category.toLowerCase() || (p.category || '').toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    posts = posts.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.summary || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  if (sort === 'newest') {
    posts.sort((a, b) => new Date(b.createdAt || b.isoDate || b.date) - new Date(a.createdAt || a.isoDate || a.date));
  } else if (sort === 'oldest') {
    posts.sort((a, b) => new Date(a.createdAt || a.isoDate || a.date) - new Date(b.createdAt || b.isoDate || b.date));
  } else if (sort === 'views') {
    posts.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (sort === 'title') {
    posts.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  return posts;
}

export function getPostBySlug(slug) {
  const db = readDb();
  return db.posts.find(p => p.slug === slug);
}

export function getPostById(id) {
  const db = readDb();
  return db.posts.find(p => p.id === id);
}

export function createPost(postData) {
  const db = readDb();
  
  // Calculate reading time & word count if not provided
  const words = (postData.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.round(words / 200));

  const newPost = {
    id: `post-${Date.now()}`,
    slug: postData.slug,
    category: postData.category || 'Lifestyle',
    categorySlug: (postData.categorySlug || postData.category || 'lifestyle').toLowerCase().replace(/\s+/g, '-'),
    title: postData.title,
    seoTitle: postData.seoTitle || postData.title,
    metaDesc: postData.metaDesc || (postData.summary || '').slice(0, 155),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isoDate: new Date().toISOString(),
    readTime: `${readTimeMinutes} min read`,
    wordsCount: words,
    author: postData.author || {
      name: "The Horizoon Editorial Team",
      role: "Staff Writer",
      bio: "Editorial voice of The Horizoon bringing fresh perspectives on intentional living.",
      avatar: "assets/images/avatar-elena.jpg"
    },
    image: postData.image || "assets/images/featured-mindfulness.jpg",
    imageAlt: postData.imageAlt || postData.title,
    tags: Array.isArray(postData.tags) ? postData.tags : (postData.tags ? postData.tags.split(',').map(s => s.trim()) : []),
    summary: postData.summary || '',
    content: postData.content || '',
    views: 0,
    status: postData.status || 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.posts.unshift(newPost);
  writeDb(db);
  upsertPostInSupabase(newPost).catch(() => {});
  return newPost;
}

export function updatePost(id, updateData) {
  const db = readDb();
  const index = db.posts.findIndex(p => p.id === id || p.slug === id);
  if (index === -1) return null;

  const existing = db.posts[index];

  // Recalculate word count and read time if content changed
  let words = existing.wordsCount;
  let readTime = existing.readTime;
  if (updateData.content) {
    words = (updateData.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    readTime = `${Math.max(1, Math.round(words / 200))} min read`;
  }

  const updated = {
    ...existing,
    ...updateData,
    id: existing.id,
    views: existing.views,
    wordsCount: words,
    readTime: readTime,
    tags: Array.isArray(updateData.tags) ? updateData.tags : (updateData.tags ? updateData.tags.split(',').map(s => s.trim()) : existing.tags),
    updatedAt: new Date().toISOString()
  };

  db.posts[index] = updated;
  writeDb(db);
  upsertPostInSupabase(updated).catch(() => {});
  return updated;
}

export function deletePost(id) {
  const db = readDb();
  const initialLength = db.posts.length;
  db.posts = db.posts.filter(p => p.id !== id && p.slug !== id);
  if (db.posts.length !== initialLength) {
    writeDb(db);
    deletePostFromSupabase(id).catch(() => {});
    return true;
  }
  return false;
}

export function incrementPostViews(slug, clientIp = 'unknown') {
  const cacheKey = `${slug}_${clientIp}`;
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;

  // Simple IP debounce: 1 view per IP per post per 10 minutes
  if (recentViews.has(cacheKey)) {
    const lastTime = recentViews.get(cacheKey);
    if (now - lastTime < TEN_MINUTES) {
      const db = readDb();
      const p = db.posts.find(item => item.slug === slug);
      return p ? p.views : 0;
    }
  }

  recentViews.set(cacheKey, now);

  const db = readDb();
  const post = db.posts.find(p => p.slug === slug);
  if (post) {
    post.views = (post.views || 0) + 1;
    writeDb(db);
    incrementViewsInSupabase(slug, post.views).catch(() => {});
    return post.views;
  }
  return 0;
}

export function getStats() {
  const db = readDb();
  const totalPosts = db.posts.length;
  const totalPublished = db.posts.filter(p => p.status === 'published').length;
  const totalViews = db.posts.reduce((acc, p) => acc + (p.views || 0), 0);
  
  // Sort by popularity
  const topPosts = [...db.posts]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      views: p.views || 0,
      image: p.image
    }));

  return {
    totalPosts,
    totalPublished,
    totalViews,
    topPosts
  };
}

export function getCategories() {
  const db = readDb();
  return db.categories || [];
}

export function getAuthors() {
  const db = readDb();
  return db.authors || [];
}

export async function syncWithSupabase() {
  try {
    const isReady = await checkSupabaseStatus();
    if (!isReady) return false;

    const remote = await getPostsFromSupabase();
    if (remote && Array.isArray(remote) && remote.length > 0) {
      const db = readDb();
      const map = new Map();
      db.posts.forEach(p => map.set(p.slug, p));
      remote.forEach(p => map.set(p.slug, { ...map.get(p.slug), ...p }));
      db.posts = Array.from(map.values());
      writeDb(db);
      console.log(`⚡ Synced ${remote.length} articles from Supabase!`);
      return true;
    } else if (remote && remote.length === 0) {
      console.log('⚡ Supabase posts table is empty, auto-seeding default articles...');
      const db = readDb();
      for (const p of db.posts) {
        await upsertPostInSupabase(p);
      }
      console.log(`⚡ Seeded ${db.posts.length} articles into Supabase!`);
      return true;
    }
  } catch (err) {
    console.warn('Supabase sync warning:', err.message);
  }
  return false;
}
