import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 4000;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY is not set. /api/insight will return 500.');
}

app.use(cors());
app.use(express.json({ limit: '512kb' }));

app.post('/api/insight', async (req, res) => {
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
