import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { pool, runQuery, initSchema } from './db.js';

// Load local env files for development. Does not override existing process.env.
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const sessionSecret = process.env.SESSION_SECRET || 'dev-session-secret';

// Security: Validate session secret in production
if (process.env.NODE_ENV === 'production' && sessionSecret === 'dev-session-secret') {
  console.error('[SECURITY] WARNING: Using default session secret in production! Set SESSION_SECRET env var.');
  process.exit(1);
}
if (sessionSecret.length < 32) {
  console.warn('[SECURITY] Session secret should be at least 32 characters for security.');
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirect = process.env.GOOGLE_REDIRECT_URI; // e.g., https://flow-si70.onrender.com/api/auth/google/callback
const oauthClient = (googleClientId && googleClientSecret) ? new OAuth2Client({
  clientId: googleClientId,
  clientSecret: googleClientSecret,
  redirectUri: googleRedirect
}) : null;

// CORS configuration with whitelist
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL || 'https://flow-si70.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] Rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '512kb' }));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for AI endpoints (20 per 15 minutes)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please try again later.' }
});

// Minimal request logger for debugging prod vs. local flow
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl} ua=${req.get('user-agent')}`);
  next();
});

// HMAC-signed token (not JWT) for lightweight auth between client and API
const issueToken = (payload) => {
  const exp = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
  const data = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret).update(data).digest('base64url');
  return `${data}.${sig}`;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/login', (req, res) => {
  const { email, name = 'Flow User', avatarSeed = 'Felix', picture } = req.body || {};
  console.log('[api/login] hit', { email, name, avatarSeed });
  if (!email) return res.status(400).json({ error: 'email required' });

  const token = issueToken({ email, ts: Date.now() });
  const user = {
    name,
    email,
    avatarSeed,
    picture: picture || `https://api.dicebear.com/9.x/notionists/svg?seed=${avatarSeed}&backgroundColor=c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf`,
    isAuthenticated: true,
    isPremium: false,
    token
  };

  res.json({ user });
});

// Token middleware
// Verifies HMAC token and hydrates req.userToken
const verifyToken = (req, res, next) => {
  const auth = req.get('authorization') || '';
  const [, token] = auth.split(' ');
  if (!token) return res.status(401).json({ error: 'missing token' });
  const [data, sig] = token.split('.');
  if (!data || !sig) return res.status(401).json({ error: 'invalid token' });
  const expected = crypto.createHmac('sha256', sessionSecret).update(data).digest('base64url');
  if (expected !== sig) return res.status(401).json({ error: 'bad signature' });
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    
    // Check token expiration
    if (payload.exp && Date.now() > payload.exp) {
      return res.status(401).json({ error: 'token expired' });
    }
    
    req.userToken = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'token parse error' });
  }
};

// Ensure a user row exists and return DB row
const upsertUser = async ({ email, name, picture, avatarSeed }) => {
  const result = await runQuery(
    `insert into users (email, name, picture, avatar_seed)
     values ($1, $2, $3, $4)
     on conflict (email) do update set
       name = excluded.name,
       picture = coalesce(excluded.picture, users.picture),
       avatar_seed = coalesce(excluded.avatar_seed, users.avatar_seed),
       updated_at = now()
     returning *;`,
    [email, name, picture, avatarSeed]
  );
  return result.rows[0];
};

const defaultConfig = () => ({
  wearable_baselines: { sleep: 7.5, rhr: 65, hrv: 50 },
  manual_targets: { protein: 80, gut: 4, sun: 'Full', exercise: 'Medium' },
  streak_logic: { freezesAvailable: 2, lastFreezeReset: new Date().toISOString() }
});

const ensureConfig = async (userId) => {
  const existing = await runQuery('select * from user_config where user_id = $1', [userId]);
  if (existing.rows.length) return existing.rows[0];
  const cfg = defaultConfig();
  const inserted = await runQuery(
    `insert into user_config (user_id, wearable_baselines, manual_targets, streak_logic)
     values ($1, $2, $3, $4)
     returning *;`,
    [userId, cfg.wearable_baselines, cfg.manual_targets, cfg.streak_logic]
  );
  return inserted.rows[0];
};

// Authenticated user + config
app.get('/api/me', verifyToken, async (req, res) => {
  try {
    const email = req.userToken.email;
    const userRow = await runQuery('select * from users where email = $1', [email]);
    if (!userRow.rows.length) return res.status(404).json({ error: 'user not found' });
    const user = userRow.rows[0];
    
    // Check if user should be premium (environment override)
    const premiumEmails = (process.env.PREMIUM_EMAILS || '').split(',').map(e => e.trim());
    const isPremium = !!user.is_premium || premiumEmails.includes(email);
    
    const cfg = await ensureConfig(user.id);
    const histCount = await runQuery('select count(*)::int as c from history where user_id = $1', [user.id]);
    console.log('[api/me] user', email, 'history_count', histCount.rows[0]?.c ?? 0, 'premium', isPremium);
    res.json({ user: { ...user, is_premium: isPremium }, config: cfg });
  } catch (e) {
    console.error('[api/me] error', e);
    res.status(500).json({ error: 'failed to load profile' });
  }
});

app.put('/api/config', verifyToken, async (req, res) => {
  try {
    const email = req.userToken.email;
    const { wearable_baselines, manual_targets, streak_logic } = req.body || {};
    const userRow = await runQuery('select * from users where email = $1', [email]);
    if (!userRow.rows.length) return res.status(404).json({ error: 'user not found' });
    const userId = userRow.rows[0].id;
    const updated = await runQuery(
      `insert into user_config (user_id, wearable_baselines, manual_targets, streak_logic)
       values ($1, $2, $3, $4)
       on conflict (user_id) do update set
         wearable_baselines = excluded.wearable_baselines,
         manual_targets = excluded.manual_targets,
         streak_logic = excluded.streak_logic,
         updated_at = now()
       returning *;`,
      [userId, wearable_baselines, manual_targets, streak_logic]
    );
    res.json({ config: updated.rows[0] });
  } catch (e) {
    console.error('[api/config] error', e);
    res.status(500).json({ error: 'failed to save config' });
  }
});

// History endpoints
app.get('/api/history', verifyToken, async (req, res) => {
  try {
    const email = req.userToken.email;
    const limit = Math.min(Number(req.query.limit) || 90, 180);
    const userRow = await runQuery('select id from users where email = $1', [email]);
    if (!userRow.rows.length) return res.status(404).json({ error: 'user not found' });
    const userId = userRow.rows[0].id;
    const hist = await runQuery(
      'select id, date, payload from history where user_id = $1 order by date desc limit $2',
      [userId, limit]
    );
    console.log('[api/history] user', email, 'rows', hist.rows.length);
    res.json({ history: hist.rows.map(r => ({ id: r.id, ...r.payload, date: r.date.toISOString().split('T')[0] })) });
  } catch (e) {
    console.error('[api/history] error', e);
    res.status(500).json({ error: 'failed to load history' });
  }
});

app.put('/api/history/:date', verifyToken, async (req, res) => {
  try {
    const email = req.userToken.email;
    const { date } = req.params;
    const entry = req.body;
    
    // Validate date format (YYYY-MM-DD) to prevent SQL injection
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Validate date is actually valid
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date value' });
    }
    
    // Validate entry payload
    if (!entry || typeof entry !== 'object') {
      return res.status(400).json({ error: 'Invalid entry payload' });
    }
    
    // Validate payload size (prevent DOS)
    const payloadSize = JSON.stringify(entry).length;
    if (payloadSize > 50000) {
      return res.status(400).json({ error: 'Payload too large' });
    }
    
    // Sanitize entry to prevent XSS
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/[<>]/g, '').substring(0, 1000);
    };
    
    if (entry.symptomName) {
      entry.symptomName = sanitizeString(entry.symptomName);
    }
    
    const userRow = await runQuery('select id from users where email = $1', [email]);
    if (!userRow.rows.length) return res.status(404).json({ error: 'user not found' });
    const userId = userRow.rows[0].id;
    const upserted = await runQuery(
      `insert into history (user_id, date, payload)
       values ($1, $2, $3)
       on conflict (user_id, date) do update set
         payload = excluded.payload,
         updated_at = now()
       returning id, date, payload`,
      [userId, date, entry]
    );
    const row = upserted.rows[0];
    res.json({ entry: { id: row.id, ...row.payload, date: row.date.toISOString().split('T')[0] } });
  } catch (e) {
    console.error('[api/history put] error', e);
    res.status(500).json({ error: 'failed to save entry' });
  }
});

app.delete('/api/history/:date', verifyToken, async (req, res) => {
  try {
    const email = req.userToken.email;
    const { date } = req.params;
    
    // Validate date format to prevent SQL injection
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const userRow = await runQuery('select id from users where email = $1', [email]);
    if (!userRow.rows.length) return res.status(404).json({ error: 'user not found' });
    const userId = userRow.rows[0].id;
    await runQuery('delete from history where user_id = $1 and date = $2', [userId, date]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api/history delete] error', e);
    res.status(500).json({ error: 'failed to delete entry' });
  }
});

app.get('/api/auth/google/start', (req, res) => {
  if (!oauthClient) {
    return res.status(500).send('OAuth not configured');
  }

  const base = `${req.protocol}://${req.get('host')}`;
  const clientRedirect = req.query.redirect_uri || `${base}/auth/callback`;
  const authRedirectUri = googleRedirect || `${base}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ clientRedirect })).toString('base64url');

  console.log('[auth/start] base', base, 'clientRedirect', clientRedirect, 'authRedirectUri', authRedirectUri, 'googleRedirectEnv', googleRedirect);

  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: authRedirectUri,
    state
  });
  console.log('[auth/start] redirecting to Google', url);
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  if (!oauthClient) return res.status(500).send('OAuth not configured');
  const { code, state } = req.query;
  console.log('[auth/callback] received', { code: !!code, state });
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    const parsedState = state ? JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8')) : {};
    const clientRedirect = parsedState.clientRedirect || `${base}/auth/callback`;
    const authRedirectUri = googleRedirect || `${base}/api/auth/google/callback`;
    console.log('[auth/callback] using authRedirectUri', authRedirectUri, 'clientRedirect', clientRedirect, 'googleRedirectEnv', googleRedirect);

    const { tokens } = await oauthClient.getToken({ code, redirect_uri: authRedirectUri });
    const idToken = tokens.id_token;
    if (!idToken) throw new Error('Missing id_token');

    const ticket = await oauthClient.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name || 'Flow User';
    const picture = payload?.picture;
    const avatarSeed = 'Felix';

    // Ensure user exists in DB and fetch premium flag
    const dbUser = await upsertUser({ email, name, picture, avatarSeed });
    
    // Check if user should be premium (environment override)
    const premiumEmails = (process.env.PREMIUM_EMAILS || '').split(',').map(e => e.trim());
    const isPremium = !!dbUser?.is_premium || premiumEmails.includes(email);

    const token = issueToken({ email, ts: Date.now() });
    const user = {
      name,
      email,
      avatarSeed,
      picture,
      isAuthenticated: true,
      isPremium: isPremium,
      token
    };

    const payloadB64 = Buffer.from(JSON.stringify(user)).toString('base64url');
    const dest = `${clientRedirect}?auth_payload=${payloadB64}`;
    console.log('[auth/callback] success for', email, 'redirecting to', dest);
    return res.redirect(dest);
  } catch (err) {
    console.error('[api/auth/google/callback] error', err);
    return res.status(500).send('OAuth error');
  }
});

app.post('/api/insight', aiLimiter, verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'API key missing' });
    }

    const {
      history = [],
      config,
      userProfile,
      processedInsights,
      dataSummary
    } = req.body || {};

    if (!Array.isArray(history) || !config) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Enhanced prompt using comprehensive data
    const prompt = `
      NEURAL ANALYSIS ENGINE - COMPREHENSIVE BIOMETRIC ASSESSMENT

      USER PROFILE:
      - Name: ${userProfile?.name || 'User'}
      - Premium Status: ${userProfile?.isPremium ? 'Active' : 'Standard'}
      - Days Active: ${userProfile?.daysActive || 0}

      DATA SUMMARY:
      - Total Historical Entries: ${dataSummary?.totalEntries || 0}
      - Sampled Entries: ${dataSummary?.sampledEntries || 0}
      - Date Range: ${dataSummary?.dateRange ? `${dataSummary.dateRange.oldest} to ${dataSummary.dateRange.newest}` : 'N/A'}

      HEALTH METRICS (30-DAY AVERAGE):
      - Sleep Quality: ${processedInsights?.healthMetrics?.averages?.sleep?.toFixed(1) || 'N/A'}h
      - HRV Score: ${processedInsights?.healthMetrics?.averages?.hrv?.toFixed(1) || 'N/A'}ms
      - Protein Intake: ${processedInsights?.healthMetrics?.averages?.protein?.toFixed(0) || 'N/A'}g

      TRENDS (7-DAY):
      - Sleep Trend: ${processedInsights?.healthMetrics?.trends?.sleep?.toFixed(1) || 'N/A'}h
      - HRV Trend: ${processedInsights?.healthMetrics?.trends?.hrv?.toFixed(1) || 'N/A'}ms

      CONSISTENCY METRICS:
      - Sleep Consistency: ${processedInsights?.healthMetrics?.consistency?.sleep?.toFixed(1) || 'N/A'}%

      SYMPTOM ANALYSIS:
      - Symptom Frequency: ${processedInsights?.healthMetrics?.symptoms?.frequency?.toFixed(1) || 'N/A'}%

      NEURAL PLASTICITY INDICATORS:
      - Memory Consolidation: ${processedInsights?.healthMetrics?.neuralPlasticity?.memoryConsolidation?.toFixed(1) || 'N/A'}%
      - Synaptic Plasticity: ${processedInsights?.healthMetrics?.neuralPlasticity?.synapticPlasticity?.toFixed(1) || 'N/A'}%
      - Cognitive Reserve: ${processedInsights?.healthMetrics?.neuralPlasticity?.cognitiveReserve?.toFixed(1) || 'N/A'}%
      - Overall Neural Health: ${processedInsights?.healthMetrics?.neuralPlasticity?.overall?.toFixed(1) || 'N/A'}%

      VITALITY METRICS:
      - Biological Age Estimate: ${processedInsights?.healthMetrics?.vitality?.biologicalAge?.toFixed(1) || 'N/A'} years
      - Aging Factor: ${processedInsights?.healthMetrics?.vitality?.agingFactor?.toFixed(2) || 'N/A'}x
      - Health Score: ${processedInsights?.healthMetrics?.vitality?.healthScore?.toFixed(1) || 'N/A'}%

      CURRENT STREAK: ${processedInsights?.streak || 0} days

      USER CONFIGURATION:
      - Sleep Target: ${config.wearableBaselines?.sleep}h
      - Baseline HRV: ${config.wearableBaselines?.hrv}ms
      - RHR Goal: ${config.wearableBaselines?.rhr}bpm
      - Protein Target: ${config.manualTargets?.protein}g

      RECENT TELEMETRY SAMPLE:
      ${JSON.stringify(history.slice(-7), null, 2)}

      TASK:
      Provide 1 specific, actionable metabolic optimization insight based on comprehensive biometric analysis.
      Focus on neural plasticity, vitality trends, and symptom correlations.
      Keep it to exactly 2 sentences. Use clinical, high-performance tone.
      Prioritize insights that leverage the neural plasticity and vitality data.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
        systemInstruction: 'You are the Flow System AI, a high-performance biological telemetry analyst specializing in neural plasticity and metabolic optimization. Your output is clinical, precise, data-driven, and devoid of fluff. Focus on actionable insights that integrate neural health, vitality metrics, and long-term biological optimization.'
      }
    });

    const text = response.text || 'Comprehensive biometric analysis indicates metabolic stability. Neural plasticity markers suggest optimal cognitive performance protocols are maintained.';
    res.json({ insight: text });
  } catch (err) {
    console.error('Insight error', err);
    res.status(500).json({ error: 'Insight generation failed' });
  }
});

// Serve built client (Render single service). Place after API routes.
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Flow API listening on :${port}`);
    console.log('[startup] GOOGLE_REDIRECT_URI', googleRedirect, 'GOOGLE_CLIENT_ID set?', !!googleClientId);
    if (process.env.DATABASE_URL) {
      initSchema().catch(err => console.error('[startup] schema init failed', err));
    } else {
      console.warn('[startup] DATABASE_URL not set; persistence disabled');
    }
  });
  
  // Graceful shutdown: close DB pool on SIGTERM
  process.on('SIGTERM', async () => {
    console.log('[shutdown] SIGTERM received, closing DB pool...');
    await pool.end();
    console.log('[shutdown] DB pool closed');
    process.exit(0);
  });
}

export { app, issueToken, verifyToken };
