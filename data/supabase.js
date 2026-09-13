import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://inpwfukukgfjcphljoef.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_-VSOSEtSp60mgZvjBdAXQQ_mjLxJH8t';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

let isSupabaseAvailable = null;

function normalizePostFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    categorySlug: row.categoryslug || row.categorySlug || (row.category || '').toLowerCase().replace(/\s+/g, '-'),
    seoTitle: row.seotitle || row.seoTitle || row.title,
    metaDesc: row.metadesc || row.metaDesc || row.summary,
    summary: row.summary || '',
    content: row.content || '',
    image: row.image || 'assets/images/featured-mindfulness.jpg',
    imageAlt: row.imagealt || row.imageAlt || row.title,
    tags: Array.isArray(row.tags) ? row.tags : [],
    author: typeof row.author === 'string' ? JSON.parse(row.author) : (row.author || {}),
    views: Number(row.views) || 0,
    status: row.status || 'published',
    readTime: row.readtime || row.readTime || '8 min read',
    wordsCount: Number(row.wordscount || row.wordsCount) || 1000,
    date: row.date || '',
    isoDate: row.isodate || row.isoDate || row.createdat || row.createdAt,
    createdAt: row.createdat || row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedat || row.updatedAt || new Date().toISOString()
  };
}

/**
 * Checks if Supabase table 'posts' is ready
 */
export async function checkSupabaseStatus() {
  try {
    const { data, error } = await supabase.from('posts').select('id').limit(1);
    if (error) {
      isSupabaseAvailable = false;
      return false;
    }
    isSupabaseAvailable = true;
    return true;
  } catch (err) {
    isSupabaseAvailable = false;
    return false;
  }
}

/**
 * Fetch all posts from Supabase
 */
export async function getPostsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return null;
    }
    return (data || []).map(normalizePostFromDb);
  } catch (err) {
    console.warn('Supabase getPosts exception:', err.message);
    return null;
  }
}

/**
 * Insert or update post in Supabase
 */
export async function upsertPostInSupabase(post) {
  try {
    const row = {
      id: String(post.id),
      slug: post.slug,
      title: post.title,
      category: post.category || 'Lifestyle',
      categoryslug: (post.categorySlug || post.category || 'lifestyle').toLowerCase().replace(/\s+/g, '-'),
      seotitle: post.seoTitle || post.title,
      metadesc: post.metaDesc || post.summary,
      summary: post.summary || '',
      content: post.content || '',
      image: post.image || 'assets/images/featured-mindfulness.jpg',
      imagealt: post.imageAlt || post.title,
      tags: Array.isArray(post.tags) ? post.tags : [],
      author: post.author || {},
      views: post.views || 0,
      status: post.status || 'published',
      readtime: post.readTime || '8 min read',
      wordscount: post.wordsCount || 1000,
      date: post.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isodate: post.isoDate || post.createdAt || new Date().toISOString(),
      createdat: post.createdAt || new Date().toISOString(),
      updatedat: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('posts')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase upsert error:', error.message);
      return null;
    }
    return normalizePostFromDb(data);
  } catch (err) {
    console.warn('Supabase upsert exception:', err.message);
    return null;
  }
}

/**
 * Delete post from Supabase
 */
export async function deletePostFromSupabase(id) {
  try {
    const { error } = await supabase.from('posts').delete().eq('id', String(id));
    if (error) {
      console.warn('Supabase delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete exception:', err.message);
    return false;
  }
}

/**
 * Increment views in Supabase
 */
export async function incrementViewsInSupabase(slug, views) {
  try {
    const { error } = await supabase
      .from('posts')
      .update({ views })
      .eq('slug', slug);

    if (error) {
      console.warn('Supabase view update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

// ============================================================================
// Optional Additional Tables (Comments, Newsletter, Contact Inquiries)
// ============================================================================

export async function saveCommentInSupabase(comment) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        id: `comment-${Date.now()}`,
        post_slug: comment.postSlug || comment.slug,
        author_name: comment.authorName || comment.name,
        author_email: comment.authorEmail || comment.email || '',
        content: comment.content || comment.comment,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export async function getCommentsFromSupabase(slug) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_slug', slug)
      .order('created_at', { ascending: false });
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export async function saveNewsletterSubscriber(email, name = '') {
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .upsert({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        subscribed_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select()
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export async function saveContactMessage(msg) {
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name: msg.name,
        email: msg.email,
        subject: msg.subject || 'General Inquiry',
        message: msg.message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}
