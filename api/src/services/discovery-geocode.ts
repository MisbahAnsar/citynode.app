export type GeocodeResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: "not_found" | "unavailable" };

type CacheEntry = { latitude: number; longitude: number; expiresAt: number };

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "citynode.app/discovery-geocode (https://github.com/NEARBuilders/citynode.app; geocode)";
const MIN_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cache = new Map<string, CacheEntry>();
let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

function normalizeLocation(location: string) {
  return location.trim().replace(/\s+/g, " ").toLowerCase();
}

function clampLatitude(value: number) {
  return Math.min(85, Math.max(-85, value));
}

function clampLongitude(value: number) {
  return Math.min(180, Math.max(-180, value));
}

function readCache(key: string): GeocodeResult | null {
  const cached = cache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) return null;
  return { ok: true, latitude: cached.latitude, longitude: cached.longitude };
}

async function waitForRateLimit() {
  const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

async function requestNominatim(location: string): Promise<GeocodeResult> {
  const key = normalizeLocation(location);
  if (!key) return { ok: false, reason: "not_found" };

  const hit = readCache(key);
  if (hit) return hit;

  const run = queue.then(async () => {
    const cached = readCache(key);
    if (cached) return cached;

    await waitForRateLimit();
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", location.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { ok: false as const, reason: "unavailable" as const };
    const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const first = rows[0];
    const latitude = first?.lat !== undefined ? Number(first.lat) : Number.NaN;
    const longitude = first?.lon !== undefined ? Number(first.lon) : Number.NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false as const, reason: "not_found" as const };
    }
    const result = {
      ok: true as const,
      latitude: clampLatitude(latitude),
      longitude: clampLongitude(longitude),
    };
    cache.set(key, {
      latitude: result.latitude,
      longitude: result.longitude,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return result;
  });

  queue = run.then(
    () => undefined,
    () => undefined,
  );
  try {
    return await run;
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function shouldGeocodeProfile(input: {
  location: string;
  latitude: number | null;
  longitude: number | null;
  geocodedLocation?: string | null;
}) {
  const location = input.location.trim();
  if (!location) return false;
  const hasCoords = input.latitude !== null && input.longitude !== null;
  const geocodedFor = input.geocodedLocation?.trim() || null;
  if (!hasCoords) return true;
  if (geocodedFor === null) return false;
  return geocodedFor !== location;
}

export async function geocodeLocation(location: string): Promise<GeocodeResult> {
  return requestNominatim(location);
}

export function resetGeocodeStateForTests() {
  cache.clear();
  lastRequestAt = 0;
  queue = Promise.resolve();
}
