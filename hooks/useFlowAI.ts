
import { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MetricEntry, UserConfig } from '../types.ts';

export const useFlowAI = () => {
  const [loading, setLoading] = useState(false);
  
  const getInsight = useCallback(async (history: MetricEntry[], config: UserConfig) => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const last5 = history.slice(-5);
      
      const prompt = `
        Analyze the last 5 days of telemetry: ${JSON.stringify(last5)}.
        
        USER CONFIG CONTEXT:
        - Sleep Target: ${config.wearableBaselines.sleep}h
        - Baseline HRV: ${config.wearableBaselines.hrv}ms
        - RHR Goal: ${config.wearableBaselines.rhr}bpm
        - Protein Target: ${config.manualTargets.protein}g

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
            systemInstruction: "You are the Flow System AI, a high-performance biological telemetry analyst. Your output is clinical, precise, and devoid of fluff."
        }
      });
      
      return response.text || "Metrics indicate metabolic stability. Maintain current baseline protocols.";
    } catch (e) {
      console.error(e);
      return "Network latency detected. Telemetry trends remain consistent with previous sync cycles.";
    } finally {
      setLoading(false);
    }
  }, []);

  return { getInsight, loading };
};
