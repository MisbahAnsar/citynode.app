import { afterEach, describe, expect, it, vi } from "vitest";
import {
  geocodeLocation,
  resetGeocodeStateForTests,
  shouldGeocodeProfile,
} from "../../src/services/discovery-geocode";

afterEach(() => {
  resetGeocodeStateForTests();
  vi.unstubAllGlobals();
});

describe("shouldGeocodeProfile", () => {
  it("geocodes when location is set and coordinates are empty", () => {
    expect(
      shouldGeocodeProfile({
        location: "Karachi",
        latitude: null,
        longitude: null,
        geocodedLocation: null,
      }),
    ).toBe(true);
  });

  it("preserves manually entered coordinates", () => {
    expect(
      shouldGeocodeProfile({
        location: "Karachi",
        latitude: 24.86,
        longitude: 67.01,
        geocodedLocation: null,
      }),
    ).toBe(false);
  });

  it("re-geocodes when the location changes after a prior geocode", () => {
    expect(
      shouldGeocodeProfile({
        location: "Lahore",
        latitude: 24.86,
        longitude: 67.01,
        geocodedLocation: "Karachi",
      }),
    ).toBe(true);
  });

  it("skips when coordinates already match the geocoded location", () => {
    expect(
      shouldGeocodeProfile({
        location: "Karachi",
        latitude: 24.86,
        longitude: 67.01,
        geocodedLocation: "Karachi",
      }),
    ).toBe(false);
  });
});

describe("geocodeLocation", () => {
  it("returns coordinates from Nominatim and caches them", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "24.86", lon: "67.01" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await geocodeLocation("Karachi");
    const second = await geocodeLocation("Karachi");

    expect(first).toEqual({ ok: true, latitude: 24.86, longitude: 67.01 });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      "User-Agent": expect.stringContaining("citynode.app/discovery-geocode"),
    });
  });

  it("returns not_found when Nominatim has no match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    );
    expect(await geocodeLocation("nowhere-land-xyz")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("returns unavailable when Nominatim errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => [],
      }),
    );
    expect(await geocodeLocation("Karachi")).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("rate-limits distinct Nominatim lookups to at most ~1 request/sec", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "1", lon: "2" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const started = Date.now();
    await geocodeLocation("Place A");
    await geocodeLocation("Place B");
    const elapsed = Date.now() - started;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(elapsed).toBeGreaterThanOrEqual(1100);
    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.headers).toMatchObject({
        "User-Agent": expect.stringContaining("citynode.app/discovery-geocode"),
      });
    }
  });

  it("serves concurrent identical lookups from cache without a second request", async () => {
    let resolveFetch!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = geocodeLocation("Karachi");
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const second = geocodeLocation("Karachi");
    resolveFetch({
      ok: true,
      json: async () => [{ lat: "24.86", lon: "67.01" }],
    });

    expect(await first).toEqual({ ok: true, latitude: 24.86, longitude: 67.01 });
    expect(await second).toEqual({ ok: true, latitude: 24.86, longitude: 67.01 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
