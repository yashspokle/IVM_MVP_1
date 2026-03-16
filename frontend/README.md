IVMS — Inventory Management System
A smart, local-first grocery inventory manager with real-time price comparison, AI-powered voice commands, and expiry tracking.

Overview
IVMS helps you track what you have at home, get alerted when things are running low or about to expire, and restock at the best price across major quick-commerce platforms — all from a single interface. Voice commands let you update your inventory hands-free in English, Hindi, or Hinglish.

Features
Inventory Management

Add, remove, and update items manually or via voice
Track quantity, category, expiry date, and source per item
Low stock alerts (configurable threshold)
Expiry alerts — warns 3 days before and flags expired items
Search and filter across all items

Voice Commands (AI-powered)

Speak naturally in English, Hindi, or Hinglish
Browser converts speech to text, AI parses intent
Supports add, remove, and restock commands
Understands brand names, Hindi terms, casual phrasing, and relative dates
Examples:

"Add 2 packets of Maggi"
"Maine doodh khatam kar diya" (I finished the milk)
"Add atta, expires in 3 months"
"Restock paneer from Zepto"
"Order maggi on Blinkit"



Real-time Price Comparison

Scrapes live prices from Blinkit and Zepto
Redirect links to Swiggy Instamart and DMart Ready
Shows product name, price, delivery fee, and ETA per store
Highlights best deal automatically
City selector with 47 Indian cities
5-minute cache to avoid redundant scrapes

Tech Stack
Frontend
TechnologyPurposeReact + TypeScriptUI frameworkViteBuild tool and dev serverTailwind CSSStylingshadcn/uiComponent librarydate-fnsDate handlingReact Router v6RoutingWeb Speech APIBrowser speech-to-text
Backend (Scraper Server)
TechnologyPurposeNode.js + ExpressAPI serverPlaywright (Chromium)Headless browser scrapingAnthropic APIAI voice command parsingdotenvEnvironment variable management

Project Structure
├── Basic_MVP_0.1 - Test/          # React frontend
│   └── src/
│       ├── components/
│       │   ├── inventory/
│       │   │   ├── InventoryDashboard.tsx
│       │   │   ├── RestockCompareDialog.tsx
│       │   │   └── VoiceControl.tsx
│       │   └── ...
│       ├── hooks/
│       │   └── use-voice-recognition.ts
│       └── types/
│           └── grocero.ts
│
└── scraper-server/                 # Node.js backend
    ├── server.js                   # Express API + voice proxy
    ├── scrapers.js                 # Playwright scrapers
    ├── package.json
    └── .env                        # API keys (not committed)

Setup
Prerequisites

Node.js v18+
Chrome or Edge (for voice commands)

Frontend
bashcd "Basic_MVP_0.1 - Test"
npm install
npm run dev
App runs at http://localhost:8080
Scraper Server
bashcd scraper-server
npm install
npx playwright install chromium
Create a .env file:
ANTHROPIC_API_KEY=sk-ant-...your_key_here
Start the server:
bashnpm start
Server runs at http://localhost:3001

API Reference
MethodEndpointDescriptionGET/api/healthServer health checkGET/api/prices/:item?city=mumbaiScrape live prices for an itemGET/api/prices/:item?lat=X&lng=YAuto-detect nearest city from coordinatesGET/api/citiesList all supported citiesPOST/api/voiceParse voice transcript via AI
Voice endpoint request body
json{
  "transcript": "add 2 maggi expires in 3 days",
  "inventoryNames": ["Maggi", "Milk", "Eggs"]
}
Voice endpoint response
json{
  "type": "add",
  "name": "Maggi",
  "quantity": 2,
  "expiry": "2026-03-17",
  "category": "snacks"
}

Supported Stores
StoreMethodNotesBlinkitLive scrapePrices fetched in real-timeZeptoLive scrapePrices fetched in real-timeSwiggy InstamartRedirectOpens search in browser tabDMart ReadyRedirectOpens search in browser tab

Voice Command Reference
IntentExampleAdd item"Add 2 litres of milk"Add with expiry"Add paneer, expires in 5 days"Add in Hindi"Ek kg chawal daalo"Remove item"Remove 1 apple"Remove in Hindi"Maine doodh khatam kar diya"Restock (compare)"Restock maggi"Restock (direct)"Order maggi from Blinkit"Restock in Hindi"Zepto se paneer mangao"

Supported Cities
Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Nagpur, Ahmedabad, Surat, Jaipur, Lucknow, Chandigarh, Indore, Bhopal, Patna, Vadodara, Coimbatore, Kochi, Thiruvananthapuram, Visakhapatnam, and 26 more.

Notes

The scraper server must be running for price comparison and voice features to work
Voice commands require Chrome or Edge (Web Speech API)
Scraped prices may vary slightly from what you see on the actual app
The .env file should never be committed to version control
