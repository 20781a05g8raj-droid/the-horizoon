import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FILE = path.join(__dirname, 'admin-auth.json');

// In-memory Session Storage: token -> { email, createdAt, expiresAt }
const activeSessions = new Map();

// In-memory Brute Force Protection: ip -> { count, firstAttempt, lockedUntil }
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lock
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hash a password using PBKDF2 with SHA-512 and a random salt
 */
function hashPassword(password, salt = null) {
  const passwordSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, passwordSalt, 100000, 64, 'sha512').toString('hex');
  return {
    salt: passwordSalt,
    hash: hash
  };
}

/**
 * Verify password against stored salt and hash using timingSafeEqual
 */
function verifyHash(password, salt, storedHash) {
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Timing-safe string comparison
 */
function timingSafeStringEqual(a, b) {
  try {
    const bufA = Buffer.from(String(a || ''));
    const bufB = Buffer.from(String(b || ''));
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

/**
 * Load admin credentials from admin-auth.json or .env
 */
export function getAdminCredentials() {
  if (fs.existsSync(AUTH_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      if (data && data.email && data.hash && data.salt) {
        return data;
      }
    } catch (e) {
      console.warn('Could not read admin-auth.json, falling back to .env:', e.message);
    }
  }

  // Fallback to environment variables
  const email = process.env.ADMIN_EMAIL || 'thehorizoon182@gmail.com';
  const rawPassword = process.env.ADMIN_PASSWORD || 'horizon@45';

  return {
    email,
    rawPassword
  };
}

/**
 * Save updated credentials to admin-auth.json
 */
export function saveAdminCredentials(email, newPassword) {
  const { salt, hash } = hashPassword(newPassword);
  const data = {
    email: email.trim().toLowerCase(),
    salt,
    hash,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

/**
 * Check if IP is currently locked out
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
    return {
      allowed: false,
      message: `Too many failed login attempts. Please wait ${minutesLeft} minute(s) before trying again.`
    };
  }

  // If lockout or attempt window expired, reset record
  if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(ip) {
  const now = Date.now();
  let record = failedAttempts.get(ip);
  if (!record || now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    record = { count: 1, firstAttempt: now, lockedUntil: null };
  } else {
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
    }
  }
  failedAttempts.set(ip, record);
}

/**
 * Reset failed attempts upon successful login
 */
function resetFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

/**
 * Main authenticate function:
 * 1. Checks rate limiting
 * 2. Tries Supabase Auth signInWithPassword
 * 3. Fallback checks with server-side secure credentials (.env or admin-auth.json)
 */
export async function authenticateAdmin({ email, password, ip = '127.0.0.1' }) {
  if (!email || !password) {
    return { success: false, status: 400, message: 'Email and password are required.' };
  }

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return { success: false, status: 429, message: rateCheck.message };
  }

  const cleanEmail = email.trim().toLowerCase();
  let authenticated = false;
  let authProvider = 'Secure Server Engine';

  // 1. Attempt Supabase Auth
  try {
    const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });
    if (sbData?.session?.access_token) {
      authenticated = true;
      authProvider = 'Supabase Cloud Auth';
    } else if (sbError) {
      // e.g. "Email not confirmed" or network issue - proceed to server check
    }
  } catch (sbErr) {
    // Supabase offline or unreachable - fallback to server verification
  }

  // 2. Server-side verification (if not already verified by Supabase)
  if (!authenticated) {
    const creds = getAdminCredentials();
    const targetEmail = (creds.email || '').trim().toLowerCase();

    if (timingSafeStringEqual(cleanEmail, targetEmail)) {
      if (creds.hash && creds.salt) {
        // Hashed PBKDF2 verification
        if (verifyHash(password, creds.salt, creds.hash)) {
          authenticated = true;
        }
      } else if (creds.rawPassword) {
        // Secure timing-safe raw comparison (e.g. from .env initial setup)
        if (timingSafeStringEqual(password, creds.rawPassword)) {
          authenticated = true;
          // Auto-upgrade to PBKDF2 salted hash in admin-auth.json
          try {
            saveAdminCredentials(targetEmail, password);
          } catch (e) {}
        }
      }
    }
  }

  if (authenticated) {
    resetFailedAttempts(ip);
    const session = createSession(cleanEmail);
    return {
      success: true,
      status: 200,
      token: session.token,
      email: session.email,
      expiresAt: session.expiresAt,
      provider: authProvider
    };
  }

  // Authentication failed
  recordFailedAttempt(ip);
  const remaining = MAX_ATTEMPTS - (failedAttempts.get(ip)?.count || 0);
  const warnMsg = remaining > 0 && remaining < 3
    ? ` Invalid email or password. (${remaining} attempt(s) remaining before temporary lockout)`
    : ' Invalid email or password.';

  return {
    success: false,
    status: 401,
    message: warnMsg
  };
}

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'thehorizoon-secure-session-salt-2026';

function signToken(email, expiresAt) {
  const data = `${email}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ email, expiresAt, sig })).toString('base64url');
}

function verifySignedToken(token) {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email || !parsed.expiresAt || !parsed.sig) return null;
    if (Date.now() > parsed.expiresAt) return null;

    const data = `${parsed.email}:${parsed.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    const bufA = Buffer.from(parsed.sig);
    const bufB = Buffer.from(expectedSig);
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return null;
    }
    return { token, email: parsed.email, createdAt: parsed.expiresAt - SESSION_LIFETIME_MS, expiresAt: parsed.expiresAt };
  } catch (e) {
    return null;
  }
}

/**
 * Creates a cryptographically signed session token
 */
export function createSession(email) {
  const now = Date.now();
  const expiresAt = now + SESSION_LIFETIME_MS;
  const token = signToken(email, expiresAt);
  const session = {
    token,
    email,
    createdAt: now,
    expiresAt: expiresAt
  };
  activeSessions.set(token, session);
  return session;
}

/**
 * Validates a Bearer token (supports both in-memory cache and signed HMAC verification across restarts)
 */
export function validateSession(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (session) {
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return null;
    }
    return session;
  }

  // Verify HMAC signed token (persists across server restarts and serverless lambdas)
  const verified = verifySignedToken(token);
  if (verified) {
    activeSessions.set(token, verified);
    return verified;
  }

  return null;
}

/**
 * Destroys an active session token
 */
export function destroySession(token) {
  if (!token) return false;
  return activeSessions.delete(token);
}

/**
 * Updates admin email and/or password after verifying current password
 */
export async function changeCredentials({ currentPassword, newEmail, newPassword }) {
  if (!currentPassword) {
    return { success: false, status: 400, message: 'Current password is required to make changes.' };
  }

  const creds = getAdminCredentials();
  let currentValid = false;

  if (creds.hash && creds.salt) {
    currentValid = verifyHash(currentPassword, creds.salt, creds.hash);
  } else if (creds.rawPassword) {
    currentValid = timingSafeStringEqual(currentPassword, creds.rawPassword);
  }

  if (!currentValid) {
    return { success: false, status: 401, message: 'Incorrect current password.' };
  }

  const targetEmail = (newEmail && newEmail.trim()) ? newEmail.trim().toLowerCase() : creds.email;
  const targetPassword = (newPassword && newPassword.trim()) ? newPassword.trim() : currentPassword;

  if (targetPassword.length < 6) {
    return { success: false, status: 400, message: 'New password must be at least 6 characters long.' };
  }

  saveAdminCredentials(targetEmail, targetPassword);

  // Also attempt updating in Supabase Auth if applicable
  try {
    await supabase.auth.updateUser({
      email: targetEmail,
      password: targetPassword
    });
  } catch (e) {}

  return {
    success: true,
    status: 200,
    email: targetEmail,
    message: 'Admin security credentials updated successfully!'
  };
}
