export type NeedKey =
  // Level 1
  | "call_charge_wifi"
  | "escort_transport"
  | "basic_comfort"
  | "minor_medical"
  | "talk_report"
  // Level 2
  | "police_security"
  | "hospital_emergency"
  | "urgent_care"
  | "fire_rescue"
  | "roadside_assist";

// Ordered type lists indicate priority for ranking (earlier = higher priority)
export const NEED_TYPE_MAP: Record<
  NeedKey,
  { types: string[]; keywords?: string[] }
> = {
  call_charge_wifi: {
    types: ["library", "cafe", "shopping_mall", "university"],
    keywords: ["wifi", "charging", "phone"],
  },
  escort_transport: {
    types: [
      "police",
      "hospital",
      "shopping_mall",
      "train_station",
      "bus_station",
      "transit_station",
      "subway_station",
    ],
    keywords: ["security", "escort", "help desk"],
  },
  basic_comfort: {
    types: [
      "library",
      "shopping_mall",
      "place_of_worship",
      "cafe",
      "lodging",
      "restaurant",
      "park",
    ],
    keywords: ["restroom", "tea", "water"],
  },
  minor_medical: {
    types: ["pharmacy", "hospital"],
    keywords: ["first aid"],
  },
  talk_report: {
    types: ["police", "hospital", "university", "shopping_mall", "lodging"],
    keywords: ["security", "front desk", "reception"],
  },
  // Level 2 mappings
  police_security: {
    types: ["police"],
    keywords: ["police", "station", "security"],
  },
  hospital_emergency: {
    types: ["hospital"],
    keywords: ["emergency", "ER", "trauma"],
  },
  urgent_care: {
    types: ["hospital", "doctor", "pharmacy"],
    keywords: ["clinic", "urgent care", "minor injury"],
  },
  fire_rescue: {
    types: ["fire_station", "police"],
    keywords: ["fire", "rescue", "accident"],
  },
  roadside_assist: {
    types: ["car_repair", "gas_station", "parking"],
    keywords: ["tow truck", "roadside assistance", "towing"],
  },
};

export function getTypesForNeed(need?: string | null): string[] | null {
  if (!need) return null;
  const key = need as NeedKey;
  const entry = NEED_TYPE_MAP[key];
  return entry ? entry.types : null;
}
