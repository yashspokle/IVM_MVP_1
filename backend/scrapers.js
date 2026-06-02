let chromium;

try {
  chromium = require("playwright").chromium;
} catch (err) {
  console.error(
    "Playwright not available:",
    err.message
  );
}
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CITY_CONFIG = {
  // Maharashtra
  mumbai:       { lat: 19.0760, lng: 72.8777, pincode: "400001", name: "Mumbai" },
  pune:         { lat: 18.5204, lng: 73.8567, pincode: "411001", name: "Pune" },
  nagpur:       { lat: 21.1458, lng: 79.0882, pincode: "440001", name: "Nagpur" },
  nashik:       { lat: 19.9975, lng: 73.7898, pincode: "422001", name: "Nashik" },
  aurangabad:   { lat: 19.8762, lng: 75.3433, pincode: "431001", name: "Aurangabad" },
  // Delhi NCR
  delhi:        { lat: 28.6139, lng: 77.2090, pincode: "110001", name: "Delhi" },
  noida:        { lat: 28.5355, lng: 77.3910, pincode: "201301", name: "Noida" },
  gurgaon:      { lat: 28.4595, lng: 77.0266, pincode: "122001", name: "Gurgaon" },
  faridabad:    { lat: 28.4089, lng: 77.3178, pincode: "121001", name: "Faridabad" },
  ghaziabad:    { lat: 28.6692, lng: 77.4538, pincode: "201001", name: "Ghaziabad" },
  // Karnataka
  bangalore:    { lat: 12.9716, lng: 77.5946, pincode: "560001", name: "Bangalore" },
  mysore:       { lat: 12.2958, lng: 76.6394, pincode: "570001", name: "Mysore" },
  hubli:        { lat: 15.3647, lng: 75.1240, pincode: "580020", name: "Hubli" },
  // Telangana & AP
  hyderabad:    { lat: 17.3850, lng: 78.4867, pincode: "500001", name: "Hyderabad" },
  warangal:     { lat: 17.9784, lng: 79.5941, pincode: "506002", name: "Warangal" },
  visakhapatnam:{ lat: 17.6868, lng: 83.2185, pincode: "530001", name: "Visakhapatnam" },
  vijayawada:   { lat: 16.5062, lng: 80.6480, pincode: "520001", name: "Vijayawada" },
  // Tamil Nadu
  chennai:      { lat: 13.0827, lng: 80.2707, pincode: "600001", name: "Chennai" },
  coimbatore:   { lat: 11.0168, lng: 76.9558, pincode: "641001", name: "Coimbatore" },
  madurai:      { lat:  9.9252, lng: 78.1198, pincode: "625001", name: "Madurai" },
  trichy:       { lat: 10.7905, lng: 78.7047, pincode: "620001", name: "Trichy" },
  // Kerala
  kochi:        { lat:  9.9312, lng: 76.2673, pincode: "682001", name: "Kochi" },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366, pincode: "695001", name: "Thiruvananthapuram" },
  kozhikode:    { lat: 11.2588, lng: 75.7804, pincode: "673001", name: "Kozhikode" },
  // West Bengal
  kolkata:      { lat: 22.5726, lng: 88.3639, pincode: "700001", name: "Kolkata" },
  // Gujarat
  ahmedabad:    { lat: 23.0225, lng: 72.5714, pincode: "380001", name: "Ahmedabad" },
  surat:        { lat: 21.1702, lng: 72.8311, pincode: "395001", name: "Surat" },
  vadodara:     { lat: 22.3072, lng: 73.1812, pincode: "390001", name: "Vadodara" },
  rajkot:       { lat: 22.3039, lng: 70.8022, pincode: "360001", name: "Rajkot" },
  // Rajasthan
  jaipur:       { lat: 26.9124, lng: 75.7873, pincode: "302001", name: "Jaipur" },
  jodhpur:      { lat: 26.2389, lng: 73.0243, pincode: "342001", name: "Jodhpur" },
  udaipur:      { lat: 24.5854, lng: 73.7125, pincode: "313001", name: "Udaipur" },
  // MP
  bhopal:       { lat: 23.2599, lng: 77.4126, pincode: "462001", name: "Bhopal" },
  indore:       { lat: 22.7196, lng: 75.8577, pincode: "452001", name: "Indore" },
  jabalpur:     { lat: 23.1815, lng: 79.9864, pincode: "482001", name: "Jabalpur" },
  // UP
  lucknow:      { lat: 26.8467, lng: 80.9462, pincode: "226001", name: "Lucknow" },
  kanpur:       { lat: 26.4499, lng: 80.3319, pincode: "208001", name: "Kanpur" },
  agra:         { lat: 27.1767, lng: 78.0081, pincode: "282001", name: "Agra" },
  varanasi:     { lat: 25.3176, lng: 82.9739, pincode: "221001", name: "Varanasi" },
  // Punjab & Haryana
  chandigarh:   { lat: 30.7333, lng: 76.7794, pincode: "160001", name: "Chandigarh" },
  ludhiana:     { lat: 30.9010, lng: 75.8573, pincode: "141001", name: "Ludhiana" },
  amritsar:     { lat: 31.6340, lng: 74.8723, pincode: "143001", name: "Amritsar" },
  // Bihar & Jharkhand
  patna:        { lat: 25.5941, lng: 85.1376, pincode: "800001", name: "Patna" },
  ranchi:       { lat: 23.3441, lng: 85.3096, pincode: "834001", name: "Ranchi" },
  // Odisha
  bhubaneswar:  { lat: 20.2961, lng: 85.8245, pincode: "751001", name: "Bhubaneswar" },
  // Assam
  guwahati:     { lat: 26.1445, lng: 91.7362, pincode: "781001", name: "Guwahati" },
};

// ─── Shared single browser instance ──────────────────────────────────────────
let sharedBrowser = null;

async function getBrowser() {
  if (!chromium) {
    throw new Error("SCRAPER_UNAVAILABLE");
  }

  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    try {
      sharedBrowser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });
    } catch (err) {
      console.error(
        "Browser launch failed:",
        err.message
      );

      throw new Error("SCRAPER_UNAVAILABLE");
    }
  }

  return sharedBrowser;
}

async function newStealthPage(browser, city) {
  const cfg = CITY_CONFIG[city] || CITY_CONFIG.mumbai;
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
viewport: {
  width: 768,
  height: 1024,
},
    locale: "en-IN",
    geolocation: { latitude: cfg.lat, longitude: cfg.lng },
    permissions: ["geolocation"],
    extraHTTPHeaders: { "Accept-Language": "en-IN,en;q=0.9" },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  return { page, context, cfg };
}

function makeResult(store, logo, url, overrides = {}) {
  return {
    store, logo, url,
    price: null, unit: "", inStock: false,
    deliveryTime: "—", deliveryFee: 0,
    productName: "", imageUrl: "",
    error: null, redirectOnly: false,
    ...overrides,
  };
}

// ─── Blinkit parser ───────────────────────────────────────────────────────────
// Confirmed text pattern from debug:
// [Name]\n[unit]\n₹[price]\n[₹orig]\nADD\n[X% OFF]\n[X MINS]
// We split on ADD, each block before ADD = one product
function parseBlinkit(fullText) {
  // Blinkit shows "Showing results for" after the location gate — start from there
  const anchor = fullText.indexOf("Showing results for");
  const text = anchor > -1 ? fullText.slice(anchor) : fullText;

  const blocks = text.split(/\bADD\b/).map(b => b.trim()).filter(b => b.length > 5);
  const results = [];

  const NOISE = /^(\d+\s*MINS?|AD|Sponsored|\d+%\s*OFF|11\s*MINS|8\s*MINS|10\s*MINS)$/i;
  const UNIT_RE = /^\d+\.?\d*\s*(ml|ltr|litre|kg|g|gm|L|pcs|pack|x\s*\d+)/i;

  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    // All ₹ prices — filter realistic grocery range
    const prices = [...block.matchAll(/₹\s*([\d,]+)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, "")))
      .filter(p => p >= 10 && p <= 5000);

    if (!prices.length) continue;

    // Use lowest (discounted) price
    const price = Math.min(...prices);

    // Unit line: matches weight/volume
    const unitLine = lines.find(l => UNIT_RE.test(l) && l.length < 30) || "";

    // Name: longest meaningful line — not price, not unit, not UI noise
    const nameLine = lines
      .filter(l =>
        l.length > 6 && l.length < 120 &&
        !l.match(/₹/) &&
        !NOISE.test(l) &&
        !UNIT_RE.test(l)
      )
      .sort((a, b) => b.length - a.length)[0] || "";

    if (price && nameLine) {
      results.push({ price, unit: unitLine, productName: nameLine });
    }
  }

  return results;
}

// ─── Zepto parser ─────────────────────────────────────────────────────────────
// Confirmed text pattern from debug:
// ADD\n₹[price]\n[₹orig ₹X OFF]\n[Name]\n[unit e.g. "1 pack (500 ml)"]\n[rating]\n[reviews]
function parseZepto(fullText) {
  // Start after header noise
  const anchor = fullText.indexOf('Showing results for "');
  const text = anchor > -1 ? fullText.slice(anchor) : fullText;

  const blocks = text.split(/\bADD\b/).map(b => b.trim()).filter(b => b.length > 5);
  const results = [];

  const NOISE = /^(Premium|Full Cream|Toned|Skimmed|Organic|OFF|\d+\s*OFF)$/i;
  const UNIT_RE = /\d+\s*(pack|ml|ltr|litre|kg|g|gm|L|pcs|piece)/i;
  const RATING_RE = /^\d+\.\d+$/;
  const REVIEW_RE = /^\([\d.]+[kKmM]?\)$/;

  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    const prices = [...block.matchAll(/₹\s*([\d,]+)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, "")))
      .filter(p => p >= 5 && p <= 5000);

    if (!prices.length) continue;
    const price = Math.min(...prices);

    // Unit: "1 pack (500 ml)" style
    const unitLine = lines.find(l => UNIT_RE.test(l) && l.length < 40) || "";

    // Name: not a price, not a rating, not a review count, not a unit, meaningful length
    const nameLine = lines
      .filter(l =>
        l.length > 8 && l.length < 120 &&
        !l.match(/₹/) &&
        !NOISE.test(l) &&
        !RATING_RE.test(l) &&
        !REVIEW_RE.test(l) &&
        !UNIT_RE.test(l)
      )
      .sort((a, b) => b.length - a.length)[0] || "";

    if (price && nameLine) {
      results.push({ price, unit: unitLine, productName: nameLine });
    }
  }

  return results;
}

// ─── Blinkit scraper ──────────────────────────────────────────────────────────
async function scrapeBlinkit(itemName, city) {
  const cfg = CITY_CONFIG[city] || CITY_CONFIG.mumbai;
  const result = makeResult("Blinkit", "⚡",
    `https://blinkit.com/s/?q=${encodeURIComponent(itemName)}`,
    { deliveryTime: "10 mins", deliveryFee: 25 }
  );

  const browser = await getBrowser();
  let context;
  try {
    const { page, context: ctx } = await newStealthPage(browser, city);
    context = ctx;

    // Set pincode in localStorage BEFORE navigating so Blinkit picks it up
    await page.goto("https://blinkit.com", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.evaluate((pincode) => {
      try {
        localStorage.setItem("userPincode", pincode);
        localStorage.setItem("selected_gr_address_id", pincode);
        localStorage.setItem("userLocation", JSON.stringify({ pincode }));
      } catch (e) {}
    }, cfg.pincode);

    // Now navigate to search
    await page.goto(`https://blinkit.com/s/?q=${encodeURIComponent(itemName)}`, {
      waitUntil: "domcontentloaded", timeout: 25000,
    });
await Promise.race([
  page.waitForLoadState("networkidle"),
  page.waitForTimeout(1500),
]);
    const text = await page.evaluate(() => document.body.innerText);
    const products = parseBlinkit(text);

    if (products.length > 0) {
      // Take first result (most relevant by Blinkit's ranking)
      Object.assign(result, { ...products[0], inStock: true });
    } else {
      // Fallback to redirect — still useful, opens Blinkit search for the item
      result.redirectOnly = true;
      result.inStock = true;
      result.error = "redirect";
    }
  } catch (err) {
    result.redirectOnly = true;
    result.inStock = true;
    result.error = "redirect";
  } finally {
    if (context) await context.close();
  }
  return result;
}

// ─── Zepto scraper ────────────────────────────────────────────────────────────
async function scrapeZepto(itemName, city) {
  const result = makeResult("Zepto", "🟣",
    `https://www.zeptonow.com/search?query=${encodeURIComponent(itemName)}`,
    { deliveryTime: "10 mins", deliveryFee: 20 }
  );

  const browser = await getBrowser();
  let context;
  try {
    const { page, context: ctx } = await newStealthPage(browser, city);
    context = ctx;
    await page.goto(`https://www.zeptonow.com/search?query=${encodeURIComponent(itemName)}`, {
      waitUntil: "domcontentloaded", timeout: 25000,
    });
    await Promise.race([
  page.waitForLoadState("networkidle"),
  page.waitForTimeout(1500),
]);

    const text = await page.evaluate(() => document.body.innerText);
    const products = parseZepto(text);

    if (products.length > 0) {
      Object.assign(result, { ...products[0], inStock: true });
    } else {
      result.redirectOnly = true;
      result.inStock = true;
      result.error = "redirect";
    }
  } catch (err) {
    result.redirectOnly = true;
    result.inStock = true;
    result.error = "redirect";
  } finally {
    if (context) await context.close();
  }
  return result;
}

// ─── Swiggy Instamart — redirect only (blocks headless) ──────────────────────
function scrapeSwiggy(itemName, city) {
  return Promise.resolve(makeResult("Swiggy Instamart", "🟠",
    `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(itemName)}`,
    { deliveryTime: "15 mins", deliveryFee: 30, redirectOnly: true, inStock: true, error: "redirect" }
  ));
}

// ─── DMart Ready — redirect only (inconsistent JS rendering) ─────────────────
function scrapeDMart(itemName, city) {
  return Promise.resolve(makeResult("DMart Ready", "🔵",
    `https://www.dmart.in/search?q=${encodeURIComponent(itemName)}`,
    { deliveryTime: "Same day", deliveryFee: 0, redirectOnly: true, inStock: true, error: "redirect" }
  ));
}

// ─── Find nearest city from coordinates ──────────────────────────────────────
function findNearestCity(lat, lng) {
  let nearest = "mumbai";
  let minDist = Infinity;
  for (const [key, cfg] of Object.entries(CITY_CONFIG)) {
    const d = Math.sqrt(Math.pow(cfg.lat - lat, 2) + Math.pow(cfg.lng - lng, 2));
    if (d < minDist) { minDist = d; nearest = key; }
  }
  return nearest;
}

// ─── Scrape all 4 stores in parallel ─────────────────────────────────────────
async function scrapeAll(itemName, city) {
  const resolvedCity = city || "mumbai";
  const cacheKey = `${itemName}_${resolvedCity}`;

const cached = CACHE.get(cacheKey);

if (
  cached &&
  Date.now() - cached.time < CACHE_TTL
) {
  return cached.data;
}
  console.log(`  Scraping "${itemName}" for city: ${CITY_CONFIG[resolvedCity]?.name || resolvedCity}`);
 try {
  await getBrowser();
} catch (err) {
  console.error("Price scraper unavailable:", err.message);

  return [
    {
      store: "Blinkit",
      logo: "⚡",
      redirectOnly: true,
      inStock: true,
      error: "Price comparison unavailable",
      url: `https://blinkit.com/s/?q=${encodeURIComponent(itemName)}`
    },
    {
      store: "Zepto",
      logo: "🟣",
      redirectOnly: true,
      inStock: true,
      error: "Price comparison unavailable",
      url: `https://www.zeptonow.com/search?query=${encodeURIComponent(itemName)}`
    },
    {
      store: "Swiggy Instamart",
      logo: "🟠",
      redirectOnly: true,
      inStock: true,
      error: "Price comparison unavailable",
      url: `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(itemName)}`
    },
    {
      store: "DMart Ready",
      logo: "🔵",
      redirectOnly: true,
      inStock: true,
      error: "Price comparison unavailable",
      url: `https://www.dmart.in/search?q=${encodeURIComponent(itemName)}`
    }
  ];
}

  const [r1, r2, r3, r4] = await Promise.allSettled([
    scrapeBlinkit(itemName, resolvedCity),
    scrapeZepto(itemName, resolvedCity),
    scrapeSwiggy(itemName, resolvedCity),
    scrapeDMart(itemName, resolvedCity),
  ]);

  const final = [r1, r2, r3, r4].map(r =>
    r.status === "fulfilled" ? r.value : { store: "Unknown", redirectOnly: true, error: r.reason?.message }
  );

  final.forEach(r => {
    if (r.redirectOnly) console.log(`  [${r.store}] → redirect only`);
    else console.log(`  [${r.store}] ₹${r.price} | ${r.unit} | ${r.productName}`);
  });
CACHE.set(cacheKey, {
  data: final,
  time: Date.now(),
});
  return final;
}

module.exports = { scrapeAll, CITY_CONFIG, findNearestCity };