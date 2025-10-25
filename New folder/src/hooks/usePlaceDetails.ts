import { useEffect, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export type PlaceDetails = {
  name?: string;
  address?: string;
  phoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  openNow?: boolean;
  todaysHours?: string;
  nextChangeLabel?: string; // e.g., "Closes in 2h 10m" or "Opens in 45m"
};

export const usePlaceDetails = (placeId?: string | null) => {
  const placesLib = useMapsLibrary("places");
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDetails = async () => {
      if (!placeId || !placesLib) return;
      setLoading(true);
      setError(null);

      try {
        // Prefer the new Places v3 API if available
        const Place = (placesLib as any).Place as any;
        let gotUseful = false;

        if (Place) {
          try {
            const place = new Place({ id: placeId });
            await place.fetchFields({
              fields: [
                "displayName",
                "formattedAddress",
                "nationalPhoneNumber",
                "internationalPhoneNumber",
                "websiteUri",
                "rating",
                "userRatingCount",
                "businessStatus",
                "regularOpeningHours",
                "currentOpeningHours",
                "utcOffsetMinutes",
              ],
            });

            if (!cancelled) {
              // Derive today's hours from weekdayDescriptions if present
              let todaysHours: string | undefined;
              const weekdayDescriptions: string[] | undefined =
                (place.regularOpeningHours &&
                  (place.regularOpeningHours
                    .weekdayDescriptions as string[])) ||
                undefined;
              if (weekdayDescriptions && weekdayDescriptions.length) {
                const offsetMin: number = place.utcOffsetMinutes ?? 0;
                const dayIndex = getPlaceDayIndex(offsetMin); // 0=Sunday
                const dayNames = [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ];
                const todayName = dayNames[dayIndex];
                const match = weekdayDescriptions.find((line) =>
                  line.startsWith(todayName)
                );
                if (match) {
                  const parts = match.split(": ");
                  if (parts.length > 1) todaysHours = parts.slice(1).join(": ");
                }
              }

              const d: PlaceDetails = {
                name: place.displayName || undefined,
                address: place.formattedAddress || undefined,
                phoneNumber: place.nationalPhoneNumber || undefined,
                internationalPhoneNumber:
                  place.internationalPhoneNumber || undefined,
                websiteUri: place.websiteUri || undefined,
                rating:
                  typeof place.rating === "number" ? place.rating : undefined,
                userRatingCount:
                  typeof place.userRatingCount === "number"
                    ? place.userRatingCount
                    : undefined,
                businessStatus: place.businessStatus || undefined,
                openNow: place.currentOpeningHours
                  ? !!place.currentOpeningHours.openNow
                  : undefined,
                todaysHours,
                nextChangeLabel: computeNextChangeLabelFromV3(
                  place,
                  place.utcOffsetMinutes ?? 0
                ),
              };

              // Consider it useful if we got at least one of the key fields
              if (
                d.address ||
                d.phoneNumber ||
                typeof d.openNow === "boolean"
              ) {
                setDetails(d);
                gotUseful = true;
              }
            }
          } catch (e) {
            // fall through to legacy service
          }
        }

        // Fallback: legacy PlacesService.getDetails (widely supported)
        if (!gotUseful && (google as any)?.maps?.places?.PlacesService) {
          await new Promise<void>((resolve) => {
            const svc = new (google.maps.places as any).PlacesService(
              document.createElement("div")
            );
            const req: any = {
              placeId,
              fields: [
                "name",
                "formatted_address",
                "formatted_phone_number",
                "international_phone_number",
                "website",
                "rating",
                "user_ratings_total",
                "business_status",
                "opening_hours",
                "utc_offset_minutes",
              ],
            };

            svc.getDetails(req, (res: any, status: any) => {
              if (cancelled) return resolve();
              if (status === google.maps.places.PlacesServiceStatus.OK && res) {
                let todaysHours: string | undefined;
                const weekdayText: string[] | undefined =
                  res.opening_hours?.weekday_text;
                if (weekdayText && weekdayText.length) {
                  const offsetMin: number = res.utc_offset_minutes ?? 0;
                  // weekday_text is Monday-first; convert Sunday-first index to Monday-first
                  const placeDay = getPlaceDayIndex(offsetMin); // 0=Sunday
                  const mondayFirstIndex = (placeDay + 6) % 7;
                  const todayLine = weekdayText[mondayFirstIndex];
                  const parts = todayLine?.split(": ");
                  if (parts && parts.length > 1)
                    todaysHours = parts.slice(1).join(": ");
                }

                const d: PlaceDetails = {
                  name: res.name,
                  address: res.formatted_address,
                  phoneNumber: res.formatted_phone_number,
                  internationalPhoneNumber: res.international_phone_number,
                  websiteUri: res.website,
                  rating: res.rating,
                  userRatingCount: res.user_ratings_total,
                  businessStatus: res.business_status,
                  openNow:
                    typeof res.opening_hours?.isOpen === "function"
                      ? res.opening_hours.isOpen()
                      : res.opening_hours?.open_now,
                  todaysHours,
                  nextChangeLabel: computeNextChangeLabelFromLegacy(
                    res.opening_hours,
                    res.utc_offset_minutes ?? 0
                  ),
                };
                setDetails(d);
              }
              resolve();
            });
          });
        }
      } catch (e: any) {
        console.error("Failed to fetch place details", e);
        setError(e?.message || "Failed to fetch place details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setDetails(null);
    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [placeId, placesLib]);

  return { details, loading, error };
};

// ---------- helpers for next-change label ----------

// pad2 helper kept previously; remove to avoid unused warnings

function minutesToLabel(totalMin: number): string {
  if (totalMin <= 0) return "now";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// V3: currentOpeningHours/regularOpeningHours may have periods with open/close hour/minute and day
function computeNextChangeLabelFromV3(
  place: any,
  utcOffsetMinutes: number
): string | undefined {
  const oh = place?.currentOpeningHours || place?.regularOpeningHours;
  const periods = oh?.periods as any[] | undefined;
  if (!periods || !periods.length) return undefined;

  // Build list of [openMin, closeMin] for a whole week
  const blocks: Array<{ open: number; close: number | null }> = [];
  for (const p of periods) {
    const openDay = p?.open?.day ?? p?.openDay;
    const openHour = p?.open?.hour ?? p?.openHour;
    const openMinute = p?.open?.minute ?? p?.openMinute ?? 0;
    const closeDay = p?.close?.day ?? p?.closeDay;
    const closeHour = p?.close?.hour ?? p?.closeHour;
    const closeMinute = p?.close?.minute ?? p?.closeMinute ?? 0;
    if (typeof openDay !== "number" || typeof openHour !== "number") continue;
    const openMin = openDay * 1440 + openHour * 60 + (openMinute || 0);
    const hasClose =
      typeof closeDay === "number" && typeof closeHour === "number";
    const closeMin = hasClose
      ? closeDay * 1440 + closeHour * 60 + (closeMinute || 0)
      : null; // null means 24h open
    blocks.push({ open: openMin, close: closeMin });
  }

  return computeNextChangeGeneric(
    blocks,
    !!place?.currentOpeningHours?.openNow,
    utcOffsetMinutes
  );
}

// Legacy opening_hours: { open_now: boolean, periods: [{ open:{day,time}, close:{day,time}}] }
function computeNextChangeLabelFromLegacy(
  opening_hours?: any,
  utcOffsetMinutes: number = 0
): string | undefined {
  if (!opening_hours) return undefined;
  const periods = opening_hours.periods as any[] | undefined;
  if (!periods || !periods.length) return undefined;
  const blocks: Array<{ open: number; close: number | null }> = [];
  for (const p of periods) {
    const open = p.open;
    const close = p.close;
    if (!open) continue;
    const openDay = open.day;
    const openTime: string | undefined = open.time;
    if (typeof openDay !== "number" || !openTime) continue;
    const oh = parseInt(openTime.slice(0, 2), 10);
    const om = parseInt(openTime.slice(2, 4), 10);
    const openMin = openDay * 1440 + oh * 60 + om;

    let closeMin: number | null = null;
    if (
      close &&
      typeof close.day === "number" &&
      typeof close.time === "string"
    ) {
      const ch = parseInt(close.time.slice(0, 2), 10);
      const cm = parseInt(close.time.slice(2, 4), 10);
      closeMin = close.day * 1440 + ch * 60 + cm;
    }
    blocks.push({ open: openMin, close: closeMin });
  }

  const openNow =
    typeof opening_hours.isOpen === "function"
      ? opening_hours.isOpen()
      : opening_hours.open_now;
  return computeNextChangeGeneric(blocks, !!openNow, utcOffsetMinutes);
}

function computeNextChangeGeneric(
  blocks: Array<{ open: number; close: number | null }>,
  openNow: boolean,
  utcOffsetMinutes: number = 0
): string | undefined {
  if (!blocks.length) return undefined;
  // current minutes in week (0..10080)
  const now = new Date();
  const currentUTC =
    now.getUTCDay() * 1440 + now.getUTCHours() * 60 + now.getUTCMinutes();
  const week = 7 * 1440;
  const current = (((currentUTC + utcOffsetMinutes) % week) + week) % week;

  // Normalize blocks so close < open means crossing week boundary; add variants +week for wrap-around
  const ranges: Array<{ open: number; close: number | null }> = [];
  for (const b of blocks) {
    if (b.close !== null && b.close < b.open) {
      // crosses midnight/week
      ranges.push({ open: b.open, close: b.close + week });
      ranges.push({ open: b.open - week, close: b.close });
    } else {
      ranges.push(b);
      if (b.close !== null)
        ranges.push({ open: b.open + week, close: b.close + week });
    }
  }

  let deltaMin: number | null = null;
  let type: "opens" | "closes" | null = null;

  if (openNow) {
    // find the next closing time after now
    for (const r of ranges) {
      if (r.close === null) continue; // 24h open
      if (current < r.close && current >= r.open) {
        const d = r.close - current;
        if (deltaMin === null || d < deltaMin) {
          deltaMin = d;
          type = "closes";
        }
      }
    }
  } else {
    // find the next opening time after now
    for (const r of ranges) {
      if (current < r.open) {
        const d = r.open - current;
        if (deltaMin === null || d < deltaMin) {
          deltaMin = d;
          type = "opens";
        }
      }
    }
  }

  if (deltaMin === null || type === null) return undefined;
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} in ${minutesToLabel(
    deltaMin
  )}`;
}

// Compute place-local day index (0=Sunday) using the place's UTC offset
function getPlaceDayIndex(utcOffsetMinutes: number): number {
  const now = new Date();
  const currentUTC =
    now.getUTCDay() * 1440 + now.getUTCHours() * 60 + now.getUTCMinutes();
  const week = 7 * 1440;
  const current = (((currentUTC + utcOffsetMinutes) % week) + week) % week;
  return Math.floor(current / 1440);
}
