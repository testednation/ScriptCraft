import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Runtime Environment constraint: Dev server must run on port 3000.
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3000) : 3000;

app.use(express.json({ limit: '30mb' }));

// Initialize Gemini SDK with server-side key
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API endpoint: Analyze handwriting sample (photo or crop)
app.post('/api/analyze-handwriting', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data' });
    }

    if (!ai) {
      return res.status(500).json({
        error: 'Gemini API is not configured on this server. Please check GEMINI_API_KEY.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are a master typographer, font designer, and handwriting analyst (familiar with the r/Handwriting community, calligraphy, Spencerian script, Palmer method, and architectural drafting).
Analyze this handwriting sample. Return a JSON object with:
1. "styleName": A creative, evocative name for this handwriting style (e.g., "Midnight Drafter", "Spirited Cursive", "Cafe Sans", "Architect Mono").
2. "penmanshipClass": One of ["Cursive / Script", "Architectural Print", "Casual Monoline", "Chiseled Italic / Calligraphy", "Minimalist Print", "Fast Shorthand"].
3. "characteristics":
   - "slantDegrees": Estimated slant in degrees (-15 to 35, positive is right-slanted).
   - "strokeWeight": One of ["Ultra-Light", "Light", "Medium", "Bold", "Variable / Flex"].
   - "xHeightRatio": Percentage of cap height that represents lowercase x-height (usually 40 to 65).
   - "spacing": One of ["Tight", "Balanced", "Wide"].
   - "loopiness": One of ["Angular", "Moderate", "High / Flourished"].
4. "communityFeedback": A warm, constructive 2-3 sentence review in the spirit of r/Handwriting (praising distinctive strengths like ascender rhythm or baseline control, with 1 gentle tip for consistent letterforms).
5. "suggestedPen": Best simulated pen tool (e.g. "0.38mm Gel Rollerball", "Fountain Pen (Fine Nib)", "0.5mm Drafting Fineliner", "Chisel Edge Calligraphy Nib").
6. "detectedLetters": An array of any prominent letters visible in the sample that stand out (e.g., ["A", "g", "t", "y", "S"]).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, data: parsed });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
    console.error('Error analyzing handwriting:', err);
    return res.status(500).json({ error: errorMsg });
  }
});

// API endpoint: Ask Gemini for creative font pangrams or handwriting tips
app.post('/api/penmanship-tips', async (req, res) => {
  try {
    const { styleType, targetChar } = req.body;
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API not configured' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Provide 3 short, expert calligraphy / typography tips for drawing the glyph "${targetChar || 'a'}" in "${styleType || 'natural handwriting'}" style. Include common pitfalls, proportion guide, and stroke sequence. Keep it concise in JSON format: { "tips": ["...", "...", "..."], "keyTechnique": "..." }`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    return res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to get tips';
    return res.status(500).json({ error: errorMsg });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`ScriptCraft server running at http://localhost:${PORT}`);
  });
}

startServer();
