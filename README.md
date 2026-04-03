# Fan Configurator + AI Room Stylist

**Customize in 3D. Get AI color recommendations for your space. Place it in AR.**

---

## 🎯 Features

1. **3D Customization** — Interact with a high-fidelity 3D fan model, switching colors and finishes (Matte, Metallic, Pearl) in real-time
2. **AI Room Analysis** — Upload a photo of your room; Gemini AI reads dominant tones, lighting, and architectural style
3. **Personalized Color Recommendations** — AI suggests best configurations for your specific space across three design tiers:
   - **Blend**: Finish that matches your ceiling or walls
   - **Balanced**: Tone that harmonizes with furniture and accents
   - **Accent**: Bold contrast that makes the fan a design statement
4. **AR Placement** — Place the AI-recommended configuration on your actual ceiling via phone camera (iOS Quick Look + Android Scene Viewer)
5. **Shareable Config** — URL hash saves exact configuration for sharing

---

## 💡 The AI Layer

Most product configurators show you options. This one tells you which option is RIGHT for your specific room.

The core loop:
1. Customize your fan in 3D
2. Upload your room photo
3. Get AI-suggested color configs that suit YOUR space
4. Place it on your actual ceiling via AR before deciding

The AI analyzes your actual living space — reading dominant tones, lighting conditions, and architectural style — then recommends the exact fan finish and color that will look best, whether you want it to blend in or make a bold design statement.

---

## 🛠 Tech Stack

**Frontend**
- React 19 + TypeScript
- Tailwind CSS
- Google model-viewer
- Framer Motion
- Vite

**Backend**
- Node.js + Express 5
- Proxy architecture for secure API calls

**AI**
- Gemini Flash (multimodal)
- Analyzes room images, returns structured JSON recommendations
- System-prompted as interior design assistant

**3D Assets**
- GLB/gLTF for web rendering
- USDZ for iOS AR Quick Look

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. **Run locally**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center"><img src="" width="200"/><br/><em>Landing Page</em></td>
    <td align="center"><img src="" width="200"/><br/><em>3D Configurator</em></td>
    <td align="center"><img src="" width="200"/><br/><em>Room Photo Upload</em></td>
  </tr>
  <tr>
    <td align="center"><img src="" width="200"/><br/><em>AI Recommendations</em></td>
    <td align="center"><img src="" width="200"/><br/><em>AR Placement</em></td>
    <td></td>
  </tr>
</table>

---

## 📖 How It Works

1. **Step 1: Choose Your Fan** — Explore the 3D model, rotate and inspect every detail
2. **Step 2: Personalize** — Either manually select colors/finishes OR upload a room photo for AI analysis
3. **Step 3: Visualize & Decide** — Use AR to see how the configuration looks in your actual space before committing

---

## 📝 Footer

Built as a creative technology POC exploring AI-powered 3D commerce and augmented reality retail experiences.
