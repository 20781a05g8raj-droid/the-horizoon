import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://inpwfukukgfjcphljoef.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_-VSOSEtSp60mgZvjBdAXQQ_mjLxJH8t';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

let isSupabaseAvailable = null;

/**
 * Checks if Supabase table 'posts' is ready
 */
export async function checkSupabaseStatus() {
  try {
    const { data, error } = await supabase.from('posts').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('⚡ Supabase connected, but table "posts" does not exist yet.');
      } else {
        console.warn('⚡ Supabase query warning:', error.message);
      }
      isSupabaseAvailable = false;
      return false;
    }
    isSupabaseAvailable = true;
    return true;
  } catch (err) {
    console.warn('⚡ Supabase network check failed:', err.message);
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
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return null;
    }
    return data;
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
      categorySlug: post.categorySlug || 'lifestyle',
      seoTitle: post.seoTitle || post.title,
      metaDesc: post.metaDesc || post.summary,
      summary: post.summary || '',
      content: post.content || '',
      image: post.image || 'assets/images/featured-mindfulness.jpg',
      imageAlt: post.imageAlt || post.title,
      tags: Array.isArray(post.tags) ? post.tags : [],
      author: post.author || {},
      views: post.views || 0,
      status: post.status || 'published',
      readTime: post.readTime || '8 min read',
      wordsCount: post.wordsCount || 1000,
      date: post.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isoDate: post.isoDate || post.createdAt || new Date().toISOString(),
      createdAt: post.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
    return data;
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
