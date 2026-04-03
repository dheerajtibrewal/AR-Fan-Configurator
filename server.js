import express from 'express';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Serve static assets from 'public' (where logo.png lives) and 'dist' (where built app lives)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist'))); 

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

const RECOMMENDATION_SCHEMA = {
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
          finish: { type: Type.STRING, enum: ["Matte", "Metallic", "Pearl"] },
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

app.post('/api/design-recommendations', async (req, res) => {
  try {
    const { imageBase64, mimeType, requestId, fingerprint } = req.body;
    
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing image data" });
    }

    // Pass IDs into the prompt to ensure the model acknowledges the unique request
    const promptContext = `
    INPUT CONTEXT:
    request_id: "${requestId}"
    image_fingerprint: "${fingerprint}"
    
    INSTRUCTION:
    Analyze this specific room image. Extract REAL colors from the walls/ceiling. 
    Do not default to presets. Echo the request_id.
    `;

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
        temperature: 0.5, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const json = JSON.parse(text);
    res.json(json);

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});