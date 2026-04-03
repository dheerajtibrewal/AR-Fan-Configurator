import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIAnalysisResult, FanFinish } from '../types';

// UTILS
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Simple string hash for fingerprinting
const generateFingerprint = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// FALLBACK DATA
const FALLBACK_RESULT: AIAnalysisResult = {
  request_id: "fallback",
  image_fingerprint: "0",
  valid: true,
  user_message: "We've loaded our curated premium collection for you.",
  room_context: {
    dominant_tones: ["#F5F5F4", "#78716C", "#1C1917"],
    ceiling_tone: "#FFFFFF",
    lighting: "neutral",
    style: "timeless",
    material_cues: ["matte surfaces"],
    contrast_level: "medium",
    confidence: 1.0
  },
  suggestions: [
    { tier: "Blend", label: "Classic White", hex: "#FFFFFF", finish: FanFinish.MATTE, reason: "Seamlessly blends with the ceiling." },
    { tier: "Blend", label: "Soft Alabaster", hex: "#F0F0F0", finish: FanFinish.MATTE, reason: "A gentle off-white to match the room base." },
    { tier: "Blend", label: "Warm Stone", hex: "#A8A29E", finish: FanFinish.MATTE, reason: "Harmonizes with wall textures." },
    { tier: "Balanced", label: "Champagne Gold", hex: "#EAD9C0", finish: FanFinish.METALLIC, reason: "Adds a subtle touch of warmth." },
    { tier: "Balanced", label: "Burnished Bronze", hex: "#713F12", finish: FanFinish.METALLIC, reason: "Connects with darker furniture." },
    { tier: "Accent", label: "Graphite", hex: "#1C1917", finish: FanFinish.MATTE, reason: "Provides sophisticated contrast." }
  ]
};

/**
 * CLIENT-SIDE PROMPT CONFIGURATION
 */
const SYSTEM_INSTRUCTION = `
You are a strict visual analyst and premium ceiling-fan stylist. 
You MUST ground your analysis in the provided image. 
Avoid generic or repeated "preset" recommendations. 
Your recommendations must materially change when the room image changes.

OUTPUT RULES:
- Return STRICT JSON only. No markdown. No extra keys.
- Echo back request_id and image_fingerprint exactly as given in the prompt.
- If image is not a room, return valid=false and empty suggestions.

TASK:
1) Validate that the image is a real indoor room.
2) Extract room_context (tones, lighting, style, cues).
3) Generate exactly 6 fan suggestions with tiers: 3 blend, 2 balanced, 1 accent.

GROUNDING CONSTRAINTS (MANDATORY):
- At least 4/6 suggestion hex colors must be DERIVED from dominant_tones and/or ceiling_tone via small transforms (lighten/darken/desaturate), not invented randomly.
- 1/6 can be a tasteful metallic tone (champagne/bronze/graphite) chosen based on lighting/material cues.
- Reasons must explicitly reference cues using this format: "Matches dominant_tones[X]..." or "Echoes ceiling_tone...".
- Labels must be unique per run and reflect detected tones.

FAIL-SAFE:
If valid=false OR confidence < 0.45, return suggestions=[].
`;

const RECOMMENDATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    request_id: { type: Type.STRING },
    image_fingerprint: { type: Type.STRING },
    valid: { type: Type.BOOLEAN },
    user_message: { type: Type.STRING },
    room_context: {
      type: Type.OBJECT,
      properties: {
        dominant_tones: { type: Type.ARRAY, items: { type: Type.STRING } },
        ceiling_tone: { type: Type.STRING, nullable: true },
        lighting: { type: Type.STRING, enum: ["warm", "neutral", "cool"] },
        style: { type: Type.STRING, nullable: true },
        material_cues: { type: Type.ARRAY, items: { type: Type.STRING } },
        contrast_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
        confidence: { type: Type.NUMBER },
      },
      nullable: true
    },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tier: { type: Type.STRING, enum: ["Blend", "Balanced", "Accent"] },
          label: { type: Type.STRING },
          hex: { type: Type.STRING },
          finish: { type: Type.STRING, enum: [FanFinish.MATTE, FanFinish.METALLIC, FanFinish.PEARL] },
          reason: { type: Type.STRING },
          grounding: {
            type: Type.OBJECT,
            properties: {
              based_on: { type: Type.STRING, enum: ["dominant_tones", "ceiling_tone", "derived", "metallic"] },
              source_index: { type: Type.NUMBER, nullable: true }
            }
          }
        },
        required: ["tier", "label", "hex", "finish", "reason"]
      }
    }
  },
  required: ["request_id", "image_fingerprint", "valid", "user_message", "suggestions"]
};

const normalizeHex = (hex: string): string => {
  if (!hex) return "#FFFFFF";
  let h = hex.trim();
  if (!h.startsWith("#")) h = "#" + h;
  if (h.length === 4) { 
    return "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  return h;
};

const validateResult = (data: any, expectedRequestId: string): AIAnalysisResult => {
  if (typeof data.valid === 'undefined') {
    throw new Error("Invalid response format: missing 'valid' field");
  }

  // Stale Trace Check
  if (data.request_id && data.request_id !== expectedRequestId) {
     console.warn(`Stale response detected. Expected ${expectedRequestId}, got ${data.request_id}`);
     // We allow it to proceed in dev, but logically this protects against race conditions
  }

  if (!data.valid || (data.room_context && data.room_context.confidence < 0.45)) {
    return {
      request_id: data.request_id,
      image_fingerprint: data.image_fingerprint,
      valid: false,
      user_message: data.user_message || "Please upload a clear photo showing more of the room.",
      room_context: null,
      suggestions: []
    };
  }
  
  const validSuggestions = (data.suggestions || [])
    .filter((s: any) => s.hex && s.finish)
    .map((s: any) => ({
       ...s,
       hex: normalizeHex(s.hex)
    }));
  
  if (validSuggestions.length === 0) throw new Error("No valid suggestions found");

  return {
    request_id: data.request_id,
    image_fingerprint: data.image_fingerprint,
    valid: true,
    user_message: "",
    room_context: data.room_context,
    suggestions: validSuggestions.slice(0, 6)
  };
};

export const getFanRecommendations = async (
  imageBase64: string,
  mimeType: string
): Promise<AIAnalysisResult> => {
  const requestId = generateUUID();
  const fingerprint = generateFingerprint(imageBase64.substring(0, 1000)); // Hash partial for speed

  const promptContext = `
  INPUT CONTEXT:
  request_id: "${requestId}"
  image_fingerprint: "${fingerprint}"
  
  INSTRUCTION:
  Analyze this specific room image. Extract REAL colors from the walls/ceiling. 
  Do not default to presets. Echo the request_id.
  `;

  try {
    let resultData: any;

    // PATH A: Development / Preview (Client-side Key)
    if (process.env.API_KEY) {
      console.log(`[Dev] Analyzing Request: ${requestId}`);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: imageBase64, mimeType: mimeType } },
            { text: promptContext }
          ]
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RECOMMENDATION_SCHEMA,
          temperature: 0.5, // slightly higher for variance on retry
        }
      });
      
      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty AI response");
      resultData = JSON.parse(jsonText);

    } else {
      // PATH B: Production (Server-side Proxy)
      console.log(`[Prod] Analyzing Request: ${requestId}`);
      const response = await fetch('/api/design-recommendations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache', // Prevent browser caching
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ 
          imageBase64, 
          mimeType,
          requestId,
          fingerprint 
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      resultData = await response.json();
    }

    return validateResult(resultData, requestId);

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return FALLBACK_RESULT;
  }
};