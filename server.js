import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 4000;
const sessionSecret = process.env.SESSION_SECRET || 'dev-session-secret';

app.use(cors());
app.use(express.json({ limit: '512kb' }));

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

app.listen(port, () => {
  console.log(`Flow API listening on :${port}`);
});
