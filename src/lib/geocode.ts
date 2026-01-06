// Reverse geocoding helper using Google Maps Geocoding API (client-side)
// Requires VITE_GOOGLE_MAPS_API_KEY in environment (already used by MapView)

export type ReverseGeocodeResult = {
  formattedAddress: string;
  placeId?: string;
};

export async function reverseGeocode(coords: {
  lat: number;
  lng: number;
}): Promise<ReverseGeocodeResult | null> {
  try {
    const key = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as
      | string
      | undefined;
    if (!key) return null;
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${coords.lat},${coords.lng}`);
    url.searchParams.set("key", key);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const first = (data?.results || [])[0];
    if (!first) return null;
    return {
      formattedAddress: first.formatted_address as string,
      placeId: first.place_id as string,
    };
  } catch {
    return null;
  }
}

// Forward geocoding: address/place text -> coordinates using Google Geocoding API
export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress?: string;
  placeId?: string;
};

export async function geocodePlace(
  query: string
): Promise<GeocodeResult | null> {
  try {
    const key = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as
      | string
      | undefined;
    if (!key) return null;
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("region", "za");
    url.searchParams.set("key", key);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const first = (data?.results || [])[0];
    if (!first) return null;
    const loc = first.geometry?.location;
    if (!loc) return null;
    return {
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: first.formatted_address as string,
      placeId: first.place_id as string,
    };
  } catch {
    return null;
  }
}
