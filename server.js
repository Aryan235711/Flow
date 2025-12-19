import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 4000;
const sessionSecret = process.env.SESSION_SECRET || 'dev-session-secret';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirect = process.env.GOOGLE_REDIRECT_URI; // e.g., https://flow-si70.onrender.com/auth/callback
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

app.get('/api/auth/google/start', (req, res) => {
  if (!oauthClient) {
    return res.status(500).send('OAuth not configured');
  }

  const base = `${req.protocol}://${req.get('host')}`;
  const redirectUri = googleRedirect || `${base}/auth/callback`;
  const state = Buffer.from(JSON.stringify({ redirectUri })).toString('base64url');

   console.log('[auth/start] base', base, 'redirectUri', redirectUri, 'googleRedirectEnv', googleRedirect);

  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: redirectUri,
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
    const parsedState = state ? JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8')) : {};
    const redirectUri = parsedState.redirectUri || googleRedirect || `${req.protocol}://${req.get('host')}/auth/callback`;
    console.log('[auth/callback] using redirectUri', redirectUri, 'googleRedirectEnv', googleRedirect);

    const { tokens } = await oauthClient.getToken({ code, redirect_uri: redirectUri });
    const idToken = tokens.id_token;
    if (!idToken) throw new Error('Missing id_token');

    const ticket = await oauthClient.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name || 'Flow User';
    const picture = payload?.picture;
    const avatarSeed = 'Felix';

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
    const dest = `${redirectUri}?auth_payload=${payloadB64}`;
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

app.listen(port, () => {
  console.log(`Flow API listening on :${port}`);
  console.log('[startup] GOOGLE_REDIRECT_URI', googleRedirect, 'GOOGLE_CLIENT_ID set?', !!googleClientId);
});
