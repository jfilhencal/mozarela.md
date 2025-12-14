import express from "express";
import cors from "cors";
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import db from "./database.js"; // now valid

const app = express();
// If running behind a reverse proxy (nginx in front of the client), enable trust proxy
// Set to 1 to trust only the first proxy (nginx)
app.set('trust proxy', 1);
// Security
app.use(helmet());
app.use(compression());
// Logging
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.LOG_FORMAT || 'combined'));
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limiter for admin endpoints
const adminLimiter = rateLimit({
  windowMs: Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.ADMIN_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later' }
});

// Login rate limiter to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts, please try again later' }
});
const allowedOrigin = process.env.API_ALLOWED_ORIGIN || process.env.VITE_CLIENT_ORIGIN || '';
if (allowedOrigin) app.use(cors({ origin: allowedOrigin, credentials: true })); else app.use(cors({ origin: true, credentials: true }));
// cookie parser so we can read session cookies
app.use(cookieParser());
app.use(express.json());
// Ensure required tables exist
const ensureSchema = async () => {
  // Generic items table (legacy)
  await db.run(
    `CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )`
  );

  await db.run(
    `CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      data TEXT,
      timestamp INTEGER
    )`
  );

  await db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      fullName TEXT,
      clinicName TEXT,
      data TEXT,
      isAdmin INTEGER DEFAULT 0
    )`
  );

  await db.run(
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT,
      createdAt INTEGER,
      expiresAt INTEGER,
      csrfToken TEXT,
      lastUsedAt INTEGER
    )`
  );
  
  // Add missing columns to existing tables (for backwards compatibility)
  try {
    await db.run('ALTER TABLE sessions ADD COLUMN expiresAt INTEGER');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.run('ALTER TABLE sessions ADD COLUMN csrfToken TEXT');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.run('ALTER TABLE sessions ADD COLUMN lastUsedAt INTEGER');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.run('ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists
  }
  
  // Create indexes for better query performance
  try {
    await db.run('CREATE INDEX IF NOT EXISTS idx_cases_timestamp ON cases(timestamp DESC)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_isAdmin ON users(isAdmin)');
  } catch (e) {
    console.error('Warning: Failed to create indexes:', e.message);
  }
};

// Items (legacy)
app.get("/api/items", async (req, res) => {
  const result = await db.all("SELECT * FROM items");
  res.json(result);
});

app.post("/api/items", async (req, res) => {
  const { name } = req.body;
  await db.run("INSERT INTO items (name) VALUES (?)", [name]);
  res.json({ success: true });
});

// Cases
app.get('/api/cases', validateSession, async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Filter cases by userId using JSON_EXTRACT
    const rows = await db.all(
      'SELECT id, data, timestamp FROM cases WHERE JSON_EXTRACT(data, "$.userId") = ? ORDER BY timestamp DESC',
      [userId]
    );
    const cases = rows.map(r => {
      try {
        const parsed = JSON.parse(r.data);
        // Check if parsed already has the correct SavedCase structure (with nested 'data' property)
        if (parsed.data && typeof parsed.data === 'object') {
          // New format: { id, timestamp, userId, data: {...}, results: {...} }
          // Return as-is, ensuring id and timestamp from row are used
          return { ...parsed, id: r.id, timestamp: r.timestamp };
        } else {
          // Old format: entire case data is flattened
          // Wrap it in the expected structure
          return { id: r.id, timestamp: r.timestamp, data: parsed };
        }
      } catch (e) {
        console.error('Failed to parse case data:', e, 'data:', r.data);
        return { id: r.id, timestamp: r.timestamp, error: 'Failed to parse data' };
      }
    });
    res.set('Content-Type', 'application/json');
    res.json(cases);
  } catch (e) {
    console.error('GET /api/cases error:', e);
    res.set('Content-Type', 'application/json');
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/cases', validateSession, requireCsrf, async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const c = req.body; // expect a SavedCase with id, timestamp, data, results
    const id = c.id || randomUUID();
    const timestamp = c.timestamp || Date.now();
    
    // Ensure the case is associated with the current user
    const caseWithUser = { ...c, id, timestamp, userId };
    const data = JSON.stringify(caseWithUser);
    
    await db.run('INSERT OR REPLACE INTO cases (id, data, timestamp) VALUES (?, ?, ?)', [id, data, timestamp]);
    res.json({ success: true, id });
  } catch (e) {
    console.error('POST /api/cases error:', e);
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/cases/:id', validateSession, requireCsrf, async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    
    // Only allow users to delete their own cases
    const existing = await db.all('SELECT data FROM cases WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const caseData = JSON.parse(existing[0].data);
    if (caseData.userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own cases' });
    }
    
    await db.run('DELETE FROM cases WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/cases error:', e);
    res.status(500).json({ error: String(e) });
  }
});

// Users
app.post('/api/users', async (req, res) => {
  const user = req.body;
  const id = user.id || randomUUID();
  const data = JSON.stringify(user);
  try {
    await db.run('INSERT INTO users (id, email, password, fullName, clinicName, data) VALUES (?, ?, ?, ?, ?, ?)', [id, user.email, user.password, user.fullName, user.clinicName, data]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const id = req.params.id;
  const user = req.body;
  const data = JSON.stringify(user);
  try {
    await db.run('UPDATE users SET email = ?, password = ?, fullName = ?, clinicName = ?, data = ? WHERE id = ?', [user.email, user.password, user.fullName, user.clinicName, data, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.get('/api/users/:id', async (req, res) => {
  const id = req.params.id;
  const rows = await db.all('SELECT data FROM users WHERE id = ?', [id]);
  if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
  const u = JSON.parse(rows[0].data);
  if (u.password) delete u.password;
  res.json(u);
});

app.get('/api/users', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email query required' });
  const rows = await db.all('SELECT data FROM users WHERE email = ?', [email]);
  if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
  const u = JSON.parse(rows[0].data);
  if (u.password) delete u.password;
  res.json(u);
});

// Auth: register & login
app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, password, clinicName } = req.body || {};
  if (!email || !password || !fullName) return res.status(400).json({ error: 'fullName, email and password required' });

  // Check existing
  const existing = await db.all('SELECT id FROM users WHERE email = ?', [email]);
  if (existing && existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

  const id = randomUUID();
  const hashed = await bcrypt.hash(password, 10);
  const userObj = { id, email, fullName, clinicName };
  const data = JSON.stringify(userObj);

  try {
    await db.run('INSERT INTO users (id, email, password, fullName, clinicName, data) VALUES (?, ?, ?, ?, ?, ?)', [id, email, hashed, fullName, clinicName, data]);
    // create session with expiry and set httpOnly cookie
    const token = randomUUID();
    const createdAt = Date.now();
    const ttlMs = Number(process.env.SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);
    const expiresAt = createdAt + ttlMs;
    const csrfToken = randomUUID();
    await db.run('INSERT INTO sessions (token, userId, createdAt, expiresAt, csrfToken, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?)', [token, id, createdAt, expiresAt, csrfToken, createdAt]);
    // cookie options
  const cookieOpts = { httpOnly: true, sameSite: process.env.COOKIE_SAMESITE || 'lax' };
  // If running behind a proxy and serving TLS, set COOKIE_SECURE=true in env
  if (process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false')) cookieOpts['secure'] = true;
    res.cookie('session_token', token, { ...cookieOpts, maxAge: ttlMs });
    // return csrf token for client to use in X-CSRF-Token header
    userObj.isAdmin = false; // New users are not admin by default
    res.json({ success: true, expiresAt, csrfToken, user: userObj });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const rows = await db.all('SELECT id, password, data, isAdmin FROM users WHERE email = ?', [email]);
  if (!rows || rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

  const row = rows[0];
  // Stored password may sometimes be non-string (due to earlier imports or malformed writes).
  // Guard and attempt to recover a usable hash from the row or the JSON 'data' field.
  let storedHash = row.password;
  if (typeof storedHash !== 'string') {
    try {
      const parsed = row.data ? JSON.parse(row.data) : {};
      if (parsed && typeof parsed.password === 'string') {
        storedHash = parsed.password;
      } else {
        console.error('Login: stored password is not a string and no parsed password found', { row });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (e) {
      console.error('Login: failed to parse row.data to recover password hash', e, { row });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  }

  const ok = await bcrypt.compare(password, storedHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const userObj = JSON.parse(row.data || '{}');
  if (userObj.password) delete userObj.password;
  // Add isAdmin field from the separate column
  userObj.isAdmin = row.isAdmin === 1;

  const token = randomUUID();
  const createdAt = Date.now();
  const ttlMs = Number(process.env.SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);
  const expiresAt = createdAt + ttlMs;
  const csrfToken = randomUUID();
  await db.run('INSERT INTO sessions (token, userId, createdAt, expiresAt, csrfToken, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?)', [token, row.id, createdAt, expiresAt, csrfToken, createdAt]);
  const cookieOpts = { httpOnly: true, sameSite: process.env.COOKIE_SAMESITE || 'lax' };
  if (process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false')) cookieOpts['secure'] = true;
  res.cookie('session_token', token, { ...cookieOpts, maxAge: ttlMs });
  res.json({ expiresAt, csrfToken, user: userObj });
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.cookies?.session_token || req.headers['x-session-token'];
    if (token) {
      await db.run('DELETE FROM sessions WHERE token = ?', [token]);
    }
    res.clearCookie('session_token');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Sessions
app.post('/api/sessions', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const token = randomUUID();
  const createdAt = Date.now();
  const ttlMs = Number(process.env.SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);
  const expiresAt = createdAt + ttlMs;
  await db.run('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)', [token, userId, createdAt, expiresAt]);
  res.json({ token, expiresAt });
});

app.get('/api/sessions/:token', async (req, res) => {
  const token = req.params.token;
  const rows = await db.all('SELECT token, userId, createdAt, expiresAt FROM sessions WHERE token = ?', [token]);
  if (!rows || rows.length === 0) return res.status(404).json({ error: 'Session not found' });
  const s = rows[0];
  if (s.expiresAt && Date.now() > s.expiresAt) {
    await db.run('DELETE FROM sessions WHERE token = ?', [token]);
    return res.status(404).json({ error: 'Session expired' });
  }
  res.json(s);
});

app.delete('/api/sessions/:token', async (req, res) => {
  const token = req.params.token;
  await db.run('DELETE FROM sessions WHERE token = ?', [token]);
  res.json({ success: true });
});

// Refresh/extend session expiration
app.post('/api/sessions/refresh', validateSession, async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'No active session' });
    
    const ttlMs = Number(process.env.SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);
    const newExpiresAt = Date.now() + ttlMs;
    
    await db.run('UPDATE sessions SET expiresAt = ?, lastUsedAt = ? WHERE token = ?', [newExpiresAt, Date.now(), token]);
    
    res.json({ success: true, expiresAt: newExpiresAt });
  } catch (e) {
    console.error('Session refresh error:', e);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

// Session validation middleware (can be applied to protected routes)
async function validateSession(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.cookies?.session_token || req.query.token || req.headers['x-session-token']);
    if (!token) return res.status(401).json({ error: 'Missing session token' });
    const rows = await db.all('SELECT token, userId, createdAt, expiresAt FROM sessions WHERE token = ?', [token]);
    if (!rows || rows.length === 0) return res.status(401).json({ error: 'Session not found' });
    const s = rows[0];
    if (s.expiresAt && Date.now() > s.expiresAt) {
      await db.run('DELETE FROM sessions WHERE token = ?', [token]);
      return res.status(401).json({ error: 'Session expired' });
    }
    // Update last used timestamp for session activity tracking
    await db.run('UPDATE sessions SET lastUsedAt = ? WHERE token = ?', [Date.now(), token]);
    req.session = { token: s.token, userId: s.userId };
    next();
  } catch (e) {
    next(e);
  }
};

// CSRF protection middleware: requires X-CSRF-Token header to match session.csrfToken
async function requireCsrf(req, res, next) {
  try {
    const token = req.cookies?.session_token || req.headers['x-session-token'] || req.query.token;
    if (!token) return res.status(401).json({ error: 'Missing session token' });
    const header = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    if (!header) return res.status(403).json({ error: 'Missing CSRF token' });
    const rows = await db.all('SELECT csrfToken FROM sessions WHERE token = ?', [token]);
    if (!rows || rows.length === 0) return res.status(401).json({ error: 'Session not found' });
    const s = rows[0];
    if (!s.csrfToken || header !== s.csrfToken) return res.status(403).json({ error: 'Invalid CSRF token' });
    next();
  } catch (e) {
    next(e);
  }
};

// Admin protection middleware: requires user to be admin
async function requireAdmin(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    
    const rows = await db.all('SELECT isAdmin, data FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = rows[0];
    const isAdmin = user.isAdmin === 1 || user.isAdmin === true;
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (e) {
    console.error('requireAdmin error:', e);
    next(e);
  }
};

// Current user endpoint
app.get('/api/me', validateSession, async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(404).json({ error: 'Not found' });
    const rows = await db.all('SELECT data, isAdmin FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = JSON.parse(rows[0].data);
    if (u.password) delete u.password;
    // Add isAdmin field from the separate column
    u.isAdmin = rows[0].isAdmin === 1;
    res.json(u);
  } catch (e) {
    console.error('Get current user error:', e);
    res.status(500).json({ error: 'Failed to retrieve user information' });
  }
});

// Export / Import
app.get('/api/export', async (req, res) => {
  const cases = await db.all('SELECT data FROM cases');
  const users = await db.all('SELECT data FROM users');

  res.json({
    version: 1,
    timestamp: Date.now(),
    data: {
      cases: cases.map(r => JSON.parse(r.data)),
      users: users.map(r => JSON.parse(r.data))
    }
  });
});

// ==================== ADMIN ENDPOINTS ====================

// Admin: Get statistics
app.get('/api/admin/stats', adminLimiter, validateSession, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await db.all('SELECT COUNT(*) as count FROM users');
    const totalCases = await db.all('SELECT COUNT(*) as count FROM cases');
    const totalSessions = await db.all('SELECT COUNT(*) as count FROM sessions');
    const recentCases = await db.all('SELECT id, timestamp, data FROM cases ORDER BY timestamp DESC LIMIT 10');
    const recentUsers = await db.all('SELECT id, email, fullName, clinicName FROM users ORDER BY id DESC LIMIT 10');

    res.json({
      users: {
        total: totalUsers[0]?.count || 0,
        recent: recentUsers
      },
      cases: {
        total: totalCases[0]?.count || 0,
        recent: recentCases.map(c => ({
          id: c.id,
          timestamp: c.timestamp,
          preview: JSON.parse(c.data || '{}')
        }))
      },
      sessions: {
        total: totalSessions[0]?.count || 0
      }
    });
  } catch (e) {
    console.error('Admin stats error:', e);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// Admin: Download database backup
app.get('/api/admin/backup', adminLimiter, validateSession, requireAdmin, async (req, res) => {
  try {
    const dbFile = process.env.DATABASE_FILE || path.resolve(process.cwd(), 'database.db');
    
    if (!fs.existsSync(dbFile)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const filename = `mozarela-backup-${Date.now()}.db`;
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(dbFile);
    fileStream.pipe(res);
  } catch (e) {
    console.error('Backup error:', e);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Admin: Get all cases with user info
app.get('/api/admin/cases', validateSession, requireAdmin, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        cases.id, 
        cases.data, 
        cases.timestamp,
        users.email,
        users.fullName
      FROM cases
      LEFT JOIN users ON JSON_EXTRACT(cases.data, '$.userId') = users.id
      ORDER BY cases.timestamp DESC
    `);
    
    const cases = rows.map(r => {
      try {
        const parsed = JSON.parse(r.data || '{}');
        const caseData = parsed.data || {};
        return {
          id: r.id,
          timestamp: r.timestamp,
          userEmail: r.email,
          userFullName: r.fullName,
          userId: parsed.userId,
          analysisMode: caseData.analysisMode || 'Unknown',
          patientName: caseData.patientName,
          species: caseData.species,
          data: caseData,
          results: parsed.results
        };
      } catch (e) {
        return { id: r.id, error: 'Failed to parse' };
      }
    });
    
    res.json(cases);
  } catch (e) {
    console.error('Admin get cases error:', e);
    res.status(500).json({ error: 'Failed to retrieve cases' });
  }
});

// Admin: Get all users
app.get('/api/admin/users', validateSession, requireAdmin, async (req, res) => {
  try {
    const rows = await db.all('SELECT id, email, fullName, clinicName, isAdmin FROM users ORDER BY email');
    res.json(rows);
  } catch (e) {
    console.error('Admin get users error:', e);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Admin: Delete user
app.delete('/api/admin/users/:id', adminLimiter, validateSession, requireAdmin, requireCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting yourself
    if (req.session?.userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete user's sessions
    await db.run('DELETE FROM sessions WHERE userId = ?', [id]);
    
    // Delete user's cases
    await db.run('DELETE FROM cases WHERE JSON_EXTRACT(data, "$.userId") = ?', [id]);
    
    // Delete user
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (e) {
    console.error('Admin delete user error:', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Admin: Delete case
app.delete('/api/admin/cases/:id', adminLimiter, validateSession, requireAdmin, requireCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM cases WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Admin delete case error:', e);
    res.status(500).json({ error: 'Failed to delete case' });
  }
});

// Admin: Toggle user admin status
app.patch('/api/admin/users/:id/toggle-admin', adminLimiter, validateSession, requireAdmin, requireCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent modifying yourself
    if (req.session?.userId === id) {
      return res.status(400).json({ error: 'Cannot modify your own admin status' });
    }
    
    const rows = await db.all('SELECT isAdmin FROM users WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentStatus = rows[0].isAdmin;
    const newStatus = currentStatus === 1 ? 0 : 1;
    
    await db.run('UPDATE users SET isAdmin = ? WHERE id = ?', [newStatus, id]);
    
    res.json({ success: true, isAdmin: newStatus === 1 });
  } catch (e) {
    console.error('Admin toggle admin error:', e);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

// ==================== END ADMIN ENDPOINTS ====================

// AI Proxy endpoint - server-side only. Forwards a simple prompt to the provider.
// Multer for file uploads (in-memory)
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/analyze', validateSession, requireCsrf, upload.array('files'), async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(501).json({ error: 'Server AI key not configured' });

    const { prompt, model: clientModel } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    // Define primary and fallback models
    const primaryModel = 'models/gemini-2.5-flash';
    const fallbackModel = 'models/gemini-2.0-flash';

    // Build generative parts: files first, then prompt text
    const parts = [];
    const files = req.files || [];
    for (const f of files) {
      const buf = f.buffer;
      const b64 = buf.toString('base64');
      parts.push({
        inlineData: {
          data: b64,
          mimeType: f.mimetype
        }
      });
    }
    parts.push({ text: prompt });

    const genAI = new GoogleGenerativeAI(apiKey);
    let result;

    try {
      // First, try the primary model
      console.log('AI proxy: using primary model', primaryModel);
      const model = genAI.getGenerativeModel({
        model: primaryModel,
        generationConfig: { responseMimeType: 'application/json' }
      });
      result = await model.generateContent(parts);
    } catch (err) {
      const errorString = String(err);
      // If the primary model is overloaded (503), try the fallback
      if (errorString.includes('503') || errorString.includes('Service Unavailable')) {
        console.warn('Primary model overloaded, trying fallback:', fallbackModel);
        try {
          const model = genAI.getGenerativeModel({
            model: fallbackModel,
            generationConfig: { responseMimeType: 'application/json' }
          });
          result = await model.generateContent(parts);
        } catch (fallbackErr) {
          // If the fallback also fails, throw that error
          console.error('Fallback model also failed:', fallbackErr);
          throw fallbackErr;
        }
      } else {
        // For any other error, re-throw it
        throw err;
      }
    }
    const response = result.response;
    const text = response.text();

    console.log('AI result:', text);

    if (text) {
      // If AI returns JSON text, try to parse, otherwise return raw text
      try {
        const parsed = JSON.parse(text);
        console.log('Parsed AI response:', JSON.stringify(parsed, null, 2));
        return res.json({ parsed });
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', e);
        return res.json({ text });
      }
    }

    console.warn('AI returned no text');
    res.json({ text: '' });
  } catch (e) {
    console.error('AI proxy error', e);
    res.status(500).json({ error: String(e) });
  }
});
// End AI proxy

app.post('/api/import', requireCsrf, async (req, res) => {
  const backup = req.body;
  if (!backup || !backup.data) return res.status(400).json({ error: 'Invalid backup' });

  const txPromises = [];
  if (backup.data.users) {
    for (const u of backup.data.users) {
      const id = u.id || randomUUID();
      const data = JSON.stringify(u);
      txPromises.push(db.run('INSERT OR REPLACE INTO users (id, email, password, fullName, clinicName, data) VALUES (?, ?, ?, ?, ?, ?)', [id, u.email, u.password, u.fullName, u.clinicName, data]));
    }
  }

  if (backup.data.cases) {
    for (const c of backup.data.cases) {
      const id = c.id || randomUUID();
      const timestamp = c.timestamp || Date.now();
      const data = JSON.stringify({ ...c, id });
      txPromises.push(db.run('INSERT OR REPLACE INTO cases (id, data, timestamp) VALUES (?, ?, ?)', [id, data, timestamp]));
    }
  }

  try {
    await Promise.all(txPromises);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// List available models for the current API key (diagnostic endpoint)
app.get('/api/models', async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(501).json({ error: 'Server AI key not configured' });

    // The SDK doesn't expose listModels, so we use fetch directly.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('Error listing models:', data);
      return res.status(response.status).json(data);
    }

    // Filter for models that support 'generateContent' and are not legacy.
    const availableModels = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        name: m.name,
        displayName: m.displayName,
        description: m.description,
        version: m.version,
      }));

    res.json({ models: availableModels });
  } catch (e) {
    console.error('Error in /api/models:', e);
    res.status(500).json({ error: String(e) });
  }
});

// Health check
app.get('/_health', (req, res) => res.json({ ok: true, now: Date.now() }));

// Serve client build if present (useful in single-host deploys)
const clientDist = path.resolve(process.cwd(), '..', 'Client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    // let API routes pass through
    if (req.path.startsWith('/api') || req.path.startsWith('/_')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Auto-create admin user if it doesn't exist
async function ensureAdminUser() {
  try {
    const adminEmail = 'jfilhencal@gmail.com';
    const adminPassword = 'das_iscas';
    const adminFullName = 'Jorge Almeida';
    
    // Check if admin exists
    const existingAdmin = await db.all('SELECT * FROM users WHERE email = ?', [adminEmail]);
    
    if (existingAdmin.length === 0) {
      console.log('🔧 Creating default admin user...');
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const userId = randomUUID();
      
      // Create user data object
      const userData = {
        fullName: adminFullName,
        clinicName: 'Admin',
        caseHistory: []
      };
      
      await db.run(
        `INSERT INTO users (id, email, password, fullName, clinicName, data, isAdmin) 
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [userId, adminEmail, passwordHash, adminFullName, 'Admin', JSON.stringify(userData)]
      );
      console.log(`✅ Admin user created: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log('✓ Admin user already exists');
    }
  } catch (error) {
    console.error('⚠️  Failed to ensure admin user:', error.message);
  }
}

// Cleanup expired sessions periodically
const cleanupExpiredSessions = async () => {
  try {
    const now = Date.now();
    const result = await db.run('DELETE FROM sessions WHERE expiresAt IS NOT NULL AND expiresAt < ?', [now]);
    if (result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} expired session(s)`);
    }
  } catch (e) {
    console.error('Session cleanup error:', e);
  }
};

// Start server after ensuring schema
// Always use port 3001 for API (nginx will proxy from Railway's PORT)
const PORT = Number(process.env.API_PORT || 3001);
let server = null;
ensureSchema().then(async () => {
  await ensureAdminUser();
  
  // Run initial cleanup
  await cleanupExpiredSessions();
  
  // Schedule periodic cleanup (every hour)
  const cleanupInterval = setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
  
  server = app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

  // graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    try {
      if (cleanupInterval) clearInterval(cleanupInterval);
      if (server) server.close();
      // close DB connection if available
      if (db && typeof db.close === 'function') await db.close();
      process.exit(0);
    } catch (e) {
      console.error('Error during shutdown', e);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

}).catch(err => {
  console.error('Failed to ensure DB schema', err);
  process.exit(1);
});
