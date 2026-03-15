import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, ExternalLink, TrendingDown, Trophy,
  RefreshCw, AlertCircle, MapPin, Navigation,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StoreResult {
  store: string;
  logo: string;
  url: string;
  price: number | null;
  unit: string;
  inStock: boolean;
  deliveryTime: string;
  deliveryFee: number;
  productName: string;
  error: string | null;
  redirectOnly: boolean;
}

interface RestockCompareDialogProps {
  item: { id: string; name: string } | null;
  open: boolean;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SCRAPER_URL = "http://localhost:3001";

const STORE_STYLE: Record<string, { emoji: string }> = {
  "Blinkit":           { emoji: "⚡" },
  "Zepto":             { emoji: "🟣" },
  "Swiggy Instamart":  { emoji: "🟠" },
  "DMart Ready":       { emoji: "🔵" },
};

// All 47 cities, alphabetically sorted
const CITIES = [
  { id: "agra",              name: "Agra" },
  { id: "ahmedabad",         name: "Ahmedabad" },
  { id: "amritsar",          name: "Amritsar" },
  { id: "aurangabad",        name: "Aurangabad" },
  { id: "bangalore",         name: "Bangalore" },
  { id: "bhopal",            name: "Bhopal" },
  { id: "bhubaneswar",       name: "Bhubaneswar" },
  { id: "chandigarh",        name: "Chandigarh" },
  { id: "chennai",           name: "Chennai" },
  { id: "coimbatore",        name: "Coimbatore" },
  { id: "delhi",             name: "Delhi" },
  { id: "faridabad",         name: "Faridabad" },
  { id: "ghaziabad",         name: "Ghaziabad" },
  { id: "gurgaon",           name: "Gurgaon" },
  { id: "guwahati",          name: "Guwahati" },
  { id: "hubli",             name: "Hubli" },
  { id: "hyderabad",         name: "Hyderabad" },
  { id: "indore",            name: "Indore" },
  { id: "jabalpur",          name: "Jabalpur" },
  { id: "jaipur",            name: "Jaipur" },
  { id: "jodhpur",           name: "Jodhpur" },
  { id: "kanpur",            name: "Kanpur" },
  { id: "kochi",             name: "Kochi" },
  { id: "kolkata",           name: "Kolkata" },
  { id: "kozhikode",         name: "Kozhikode" },
  { id: "lucknow",           name: "Lucknow" },
  { id: "ludhiana",          name: "Ludhiana" },
  { id: "madurai",           name: "Madurai" },
  { id: "mumbai",            name: "Mumbai" },
  { id: "mysore",            name: "Mysore" },
  { id: "nagpur",            name: "Nagpur" },
  { id: "nashik",            name: "Nashik" },
  { id: "noida",             name: "Noida" },
  { id: "patna",             name: "Patna" },
  { id: "pune",              name: "Pune" },
  { id: "rajkot",            name: "Rajkot" },
  { id: "ranchi",            name: "Ranchi" },
  { id: "surat",             name: "Surat" },
  { id: "thiruvananthapuram",name: "Thiruvananthapuram" },
  { id: "trichy",            name: "Trichy" },
  { id: "udaipur",           name: "Udaipur" },
  { id: "vadodara",          name: "Vadodara" },
  { id: "varanasi",          name: "Varanasi" },
  { id: "vijayawada",        name: "Vijayawada" },
  { id: "visakhapatnam",     name: "Visakhapatnam" },
  { id: "warangal",          name: "Warangal" },
];

// ─── Component ────────────────────────────────────────────────────────────────
const RestockCompareDialog = ({ item, open, onClose }: RestockCompareDialogProps) => {
  const [results, setResults] = useState<StoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // City state — persisted in localStorage
  const [city, setCity] = useState<string>(() => localStorage.getItem("grocero_city") || "");
  const [cityName, setCityName] = useState<string>(() => localStorage.getItem("grocero_city_name") || "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    try { return JSON.parse(localStorage.getItem("grocero_coords") || "null"); } catch { return null; }
  });

  // On open: auto-detect location if nothing saved yet
  useEffect(() => {
    if (open && !city && !coords) {
      detectLocation();
    }
  }, [open]);

  // Fetch when dialog opens and we already have a location
  useEffect(() => {
    if (open && item && (city || coords)) {
      doFetch(item.name);
    }
  }, [open, item]);

  // ── Location detection ──────────────────────────────────────────────────────
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported — please select city manually.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        setCity("");
        setCityName("");
        localStorage.setItem("grocero_coords", JSON.stringify(newCoords));
        localStorage.removeItem("grocero_city");
        localStorage.removeItem("grocero_city_name");
        setLocating(false);
        if (item && open) fetchWithCoords(item.name, newCoords);
      },
      () => {
        setLocating(false);
        setLocationError("Location denied — please select your city below.");
      },
      { timeout: 8000 }
    );
  }, [item, open]);

  // ── City dropdown change ────────────────────────────────────────────────────
  const handleCityChange = (newCityId: string) => {
    const found = CITIES.find(c => c.id === newCityId);
    setCity(newCityId);
    setCityName(found?.name || newCityId);
    setCoords(null);
    localStorage.setItem("grocero_city", newCityId);
    localStorage.setItem("grocero_city_name", found?.name || newCityId);
    localStorage.removeItem("grocero_coords");
    if (item) fetchWithCity(item.name, newCityId);
  };

  // ── Fetch helpers ───────────────────────────────────────────────────────────
  const doFetch = (itemName: string) => {
    if (coords) fetchWithCoords(itemName, coords);
    else if (city) fetchWithCity(itemName, city);
  };

  const fetchWithCoords = async (itemName: string, c: { lat: number; lng: number }) => {
    await callApi(
      `${SCRAPER_URL}/api/prices/${encodeURIComponent(itemName)}?lat=${c.lat}&lng=${c.lng}`
    );
  };

  const fetchWithCity = async (itemName: string, cityKey: string) => {
    await callApi(
      `${SCRAPER_URL}/api/prices/${encodeURIComponent(itemName)}?city=${cityKey}`
    );
  };

  const callApi = async (url: string) => {
    setLoading(true);
    setResults([]);
    setServerError(null);
    setCached(false);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${res.status}`);
      }
      const data = await res.json();
      setResults(data.results || []);
      setCached(data.cached || false);
      // Update city name if server resolved from coords
      if (data.cityName && !cityName) setCityName(data.cityName);
      if (data.city && !city) setCity(data.city);
    } catch (err: any) {
      const msg = err?.message || "";
      setServerError(msg.includes("fetch") || msg.includes("Failed to fetch") ? "not_running" : msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const scrapedResults = results.filter(r => !r.redirectOnly && r.price !== null);
  const redirectResults = results.filter(r => r.redirectOnly);
  const cheapest = scrapedResults.length
    ? scrapedResults.reduce((a, b) => (a.price! < b.price! ? a : b))
    : null;

  const displayCity = cityName || (city ? CITIES.find(c => c.id === city)?.name : "");
  const hasLocation = !!(city || coords);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize">
            🛒 Restock: {item?.name}
          </DialogTitle>
          <DialogDescription>Compare live prices across quick-commerce stores</DialogDescription>
        </DialogHeader>

        {/* ── Location bar ── */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-700 font-medium flex-1 truncate">
              {displayCity ? `Delivering to: ${displayCity}` : "Set your delivery location"}
            </span>
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100 flex-shrink-0"
              onClick={detectLocation}
              disabled={locating || loading}
            >
              {locating
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Navigation className="h-3 w-3" />}
              <span className="ml-1">{locating ? "Detecting…" : "Use my location"}</span>
            </Button>
          </div>

          <Select value={city} onValueChange={handleCityChange} disabled={loading || locating}>
            <SelectTrigger className="h-8 text-sm border-emerald-200 bg-white">
              <SelectValue placeholder="Or pick city manually…" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {CITIES.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {locationError && (
            <p className="text-xs text-orange-600">{locationError}</p>
          )}
        </div>

        {/* ── No location yet ── */}
        {!hasLocation && !locating && (
          <div className="text-center py-8 space-y-2">
            <MapPin className="h-10 w-10 mx-auto text-emerald-200" />
            <p className="text-sm text-muted-foreground">
              Allow location access or select a city to see prices
            </p>
          </div>
        )}

        {/* ── Server offline ── */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
              <AlertCircle className="h-4 w-4" />
              {serverError === "not_running" ? "Scraper server is offline" : serverError}
            </div>
            {serverError === "not_running" && (
              <p className="text-xs text-red-600 font-mono bg-red-100 rounded p-2 leading-5">
                cd scraper-server<br />npm start
              </p>
            )}
            <Button size="sm" variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => item && doFetch(item.name)}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-muted-foreground">
              Scraping live prices{displayCity ? ` in ${displayCity}` : ""}…
            </p>
            <p className="text-xs text-muted-foreground">Takes 15–30 seconds</p>
          </div>
        )}

        {/* ── Results ── */}
        {!loading && !serverError && results.length > 0 && (
          <div className="space-y-3">

            {/* Best deal banner */}
            {cheapest && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                <Trophy className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">
                    Best deal: {STORE_STYLE[cheapest.store]?.emoji} {cheapest.store}
                  </p>
                  <p className="text-xs text-emerald-600">
                    ₹{cheapest.price}
                    {cheapest.deliveryFee > 0
                      ? ` + ₹${cheapest.deliveryFee} delivery = ₹${cheapest.price! + cheapest.deliveryFee} total`
                      : " · Free delivery"}
                  </p>
                  {cheapest.productName && (
                    <p className="text-xs text-emerald-500 truncate mt-0.5">{cheapest.productName}</p>
                  )}
                </div>
                {cached && (
                  <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200 flex-shrink-0">
                    Cached
                  </Badge>
                )}
              </div>
            )}

            {/* Scraped price table */}
            {scrapedResults.length > 0 && (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-4 bg-gray-50 px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <span className="col-span-1">Store</span>
                  <span className="text-center">Price</span>
                  <span className="text-center">Delivery</span>
                  <span className="text-center">ETA</span>
                </div>

                {scrapedResults.map((store, idx) => {
                  const isCheapest = cheapest?.store === store.store;
                  const style = STORE_STYLE[store.store];
                  return (
                    <div key={store.store}
                      className={[
                        "grid grid-cols-4 items-center px-4 py-3 transition-colors",
                        idx < scrapedResults.length - 1 ? "border-b border-gray-50" : "",
                        isCheapest ? "bg-emerald-50/60" : "hover:bg-gray-50/60",
                      ].join(" ")}
                    >
                      {/* Store name */}
                      <div className="col-span-1 flex items-center gap-1.5 min-w-0">
                        <span className="text-base flex-shrink-0">{style?.emoji || "🏪"}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 leading-tight truncate">
                            {store.store}
                          </p>
                          {store.unit && (
                            <p className="text-[10px] text-gray-400 truncate">{store.unit}</p>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-center">
                        <span className={`font-bold text-sm ${isCheapest ? "text-emerald-700" : "text-gray-800"}`}>
                          ₹{store.price}
                        </span>
                        {isCheapest && (
                          <div className="text-[9px] text-emerald-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                            <TrendingDown className="h-2.5 w-2.5" /> LOWEST
                          </div>
                        )}
                      </div>

                      {/* Delivery fee */}
                      <div className="text-center">
                        {store.deliveryFee === 0
                          ? <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Free</Badge>
                          : <span className="text-xs text-gray-600">₹{store.deliveryFee}</span>
                        }
                      </div>

                      {/* ETA + Buy */}
                      <div className="text-center flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500">{store.deliveryTime}</span>
                        <a href={store.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline"
                            className="h-6 text-[10px] px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                            Buy <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Redirect-only stores */}
            {redirectResults.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
                  Also check on
                </p>
                <div className="flex flex-wrap gap-2">
                  {redirectResults.map(store => {
                    const style = STORE_STYLE[store.store];
                    return (
                      <a key={store.store} href={store.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"
                          className="h-8 text-xs border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 gap-1.5">
                          <span>{style?.emoji || "🏪"}</span>
                          <span>{store.store}</span>
                          <span className="text-gray-400 text-[10px]">{store.deliveryTime}</span>
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </Button>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-muted-foreground">* Prices scraped live · may vary</p>
              <Button size="sm" variant="ghost"
                className="h-6 text-[10px] text-muted-foreground hover:text-emerald-700"
                onClick={() => item && doFetch(item.name)}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RestockCompareDialog;