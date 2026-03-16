require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { scrapeAll, CITY_CONFIG, findNearestCity } = require("./scrapers");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith("http://localhost")) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json());

// ─── In-memory cache (5 min TTL) ─────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// ─── GET /api/prices/:itemName ────────────────────────────────────────────────
app.get("/api/prices/:itemName", async (req, res) => {
  const itemName = decodeURIComponent(req.params.itemName).trim().toLowerCase();
  if (!itemName) return res.status(400).json({ error: "Item name required" });

  let cityKey = (req.query.city || "").toLowerCase();
  if (!CITY_CONFIG[cityKey]) {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    cityKey = (!isNaN(lat) && !isNaN(lng)) ? findNearestCity(lat, lng) : "mumbai";
  }

  const cacheKey = `${itemName}:${cityKey}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[CACHE HIT] ${cacheKey}`);
    return res.json({ results: cached.data, cached: true, city: cityKey, cityName: CITY_CONFIG[cityKey]?.name });
  }

  console.log(`[SCRAPING] ${cacheKey}`);
  try {
    const results = await scrapeAll(itemName, cityKey);
    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    res.json({ results, cached: false, city: cityKey, cityName: CITY_CONFIG[cityKey]?.name });
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    res.status(500).json({ error: "Scraping failed", message: err.message });
  }
});

// ─── POST /api/voice ──────────────────────────────────────────────────────────
// Parses voice transcript using GitHub Models (gpt-4o-mini)
app.post("/api/voice", async (req, res) => {
  const { transcript, inventoryNames = [] } = req.body;
  if (!transcript) return res.status(400).json({ error: "transcript required" });

  const today = new Date().toISOString().split("T")[0];
  const safeTranscript = transcript.replace(/"/g, "'");

  const prompt = `You are a grocery inventory voice assistant. Parse this voice command into a JSON action.

Today's date: ${today}
User's current inventory: ${inventoryNames.length ? inventoryNames.join(", ") : "(empty)"}

Voice command: "${safeTranscript}"

Return ONLY valid JSON (no markdown, no code fences, no explanation). Use one of these 4 formats:

ADD item: {"type":"add","name":"<properly capitalized>","quantity":<number>,"expiry":"<YYYY-MM-DD or null>","category":"<fruits|vegetables|dairy|meat|seafood|grains|snacks|beverages|condiments|frozen|other>"}
REMOVE item: {"type":"remove","name":"<item name>","quantity":<number>}
RESTOCK item: {"type":"restock","name":"<item name>","store":"<Blinkit or Zepto or Swiggy Instamart or DMart Ready or null>"}
UNKNOWN: {"type":"unknown","transcript":"${safeTranscript}"}

Rules:
- quantity defaults to 1 if not mentioned
- expiry: compute YYYY-MM-DD from relative dates. null if not mentioned.
- store must be exactly: Blinkit, Zepto, Swiggy Instamart, DMart Ready, or null
- Hindi/Hinglish: doodh=Milk, anda=Egg, aata=Atta, chawal=Rice, daal=Dal, namak=Salt, cheeni=Sugar, tel=Oil, pyaaz=Onion, tamatar=Tomato, maggi=Maggi
- "I finished the milk"=remove, "ran out of eggs"=remove, "get some apples"=restock, "bought bread"=add
- Match item names to inventory list when similar`;

  try {
    const apiKey = process.env.GITHUB_TOKEN;
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error(`[VOICE API ERROR] ${JSON.stringify(data.error)}`);
      return res.json({ type: "unknown", transcript });
    }

    const text = (data.choices?.[0]?.message?.content || "")
      .trim()
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    console.log(`[VOICE] "${transcript}" → ${JSON.stringify(parsed)}`);
    res.json(parsed);
  } catch (err) {
    console.error(`[VOICE ERROR] ${err.message}`);
    res.json({ type: "unknown", transcript });
  }
});

// ─── GET /api/cities ──────────────────────────────────────────────────────────

// POST /api/chat - AI grocery chat assistant (Gemini free tier)
app.post('/api/chat', async (req, res) => {
  const { messages = [], inventory = [] } = req.body;
  if (!messages.length) return res.status(400).json({ error: 'messages required' });

  const inventorySummary = inventory.length
    ? inventory.map(i => i.name + ' (qty:' + i.quantity + (i.expiry_date ? ', expires:' + i.expiry_date : '') + ')').join(', ')
    : 'empty';

  // Build GitHub Models messages — system prompt as first user turn
  const systemTurn = 'You are a smart grocery assistant. Current inventory: ' + inventorySummary + '. Help manage groceries, suggest recipes, identify low stock, track expiry dates. Be friendly, concise, and practical.';
  const contents = [
    { role: 'user', parts: [{ text: systemTurn }] },
    { role: 'model', parts: [{ text: 'Got it! I am your grocery assistant. How can I help?' }] },
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  try {
    const apiKey = process.env.GITHUB_TOKEN;
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemTurn },
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    if (data.error) {
      console.error('[CHAT API ERROR]', data.error.message);
      return res.status(500).json({ error: data.error.message });
    }
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not process that.';
    res.json({ reply });
  } catch (err) {
    console.error('[CHAT ERROR]', err.message);
    res.status(500).json({ error: 'Chat failed' });
  }
});

app.get("/api/cities", (_, res) => {
  const cities = Object.entries(CITY_CONFIG)
    .map(([id, c]) => ({ id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json({ cities });
});

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`\n🛒 Grocero Scraper running on http://localhost:${PORT}`);
  console.log(`   GET  /api/prices/:item?city=mumbai`);
  console.log(`   POST /api/voice  { transcript, inventoryNames[] }`);
  console.log(`   GET  /api/cities`);
  console.log(`   GET  /api/health\n`);
});