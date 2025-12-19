import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenAI } from '@google/genai';
import { pool, runQuery, initSchema } from './db.js';

const app = express();
const port = process.env.PORT || 4000;
const sessionSecret = process.env.SESSION_SECRET || 'dev-session-secret';
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

app.use(cors());
app.use(express.json({ limit: '512kb' }));

// Minimal request logger for debugging prod vs. local flow
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl} ua=${req.get('user-agent')}`);
  next();
});

// HMAC-signed token (not JWT) for lightweight auth between client and API
const issueToken = (payload) => {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
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
    req.userToken = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
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
    const cfg = await ensureConfig(user.id);
    const histCount = await runQuery('select count(*)::int as c from history where user_id = $1', [user.id]);
    console.log('[api/me] user', email, 'history_count', histCount.rows[0]?.c ?? 0);
    res.json({ user, config: cfg });
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
      'select date, payload from history where user_id = $1 order by date desc limit $2',
      [userId, limit]
    );
    console.log('[api/history] user', email, 'rows', hist.rows.length);
    res.json({ history: hist.rows.map(r => ({ ...r.payload, date: r.date.toISOString().split('T')[0] })) });
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
    const userRow = await runQuery('select id from users where email = $1', [email]);
    if (!userRow.rows.length) return res.status(404).json({ error: 'user not found' });
    const userId = userRow.rows[0].id;
    const upserted = await runQuery(
      `insert into history (user_id, date, payload)
       values ($1, $2, $3)
       on conflict (user_id, date) do update set
         payload = excluded.payload,
         updated_at = now()
       returning date, payload;`,
      [userId, date, entry]
    );
    const row = upserted.rows[0];
    res.json({ entry: { ...row.payload, date: row.date.toISOString().split('T')[0] } });
  } catch (e) {
    console.error('[api/history put] error', e);
    res.status(500).json({ error: 'failed to save entry' });
  }
});

app.delete('/api/history/:date', verifyToken, async (req, res) => {
  try {
    const email = req.userToken.email;
    const { date } = req.params;
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

    // Ensure user exists in DB
    await upsertUser({ email, name, picture, avatarSeed });

    const token = issueToken({ email, ts: Date.now() });
    const user = {
      name,
      email,
      avatarSeed,
      picture,
      isAuthenticated: true,
      isPremium: false,
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

app.post('/api/insight', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'API key missing' });
    }
    const { history = [], config } = req.body || {};
    if (!Array.isArray(history) || !config) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const last5 = history.slice(-5);

    const prompt = `
      Analyze the last 5 days of telemetry: ${JSON.stringify(last5)}.
      USER CONFIG CONTEXT:
      - Sleep Target: ${config.wearableBaselines?.sleep}h
      - Baseline HRV: ${config.wearableBaselines?.hrv}ms
      - RHR Goal: ${config.wearableBaselines?.rhr}bpm
      - Protein Target: ${config.manualTargets?.protein}g
      TASK:
      Provide 1 specific metabolic optimization insight based on deviations.
      Keep it to exactly 2 sentences. Use a clinical, high-performance tone.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
        systemInstruction: 'You are the Flow System AI, a high-performance biological telemetry analyst. Your output is clinical, precise, and devoid of fluff.'
      }
    });

    const text = response.text || 'Metrics indicate metabolic stability. Maintain current baseline protocols.';
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
}

export { app, issueToken, verifyToken };
