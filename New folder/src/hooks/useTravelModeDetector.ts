import { useState, useEffect, useRef } from "react";

type TravelMode = "WALKING" | "DRIVING" | "TRANSIT";

interface TravelModeDetectorResult {
  travelMode: TravelMode;
  speed: number | null; // meters per second
  isMoving: boolean;
}

/**
 * Detects travel mode based on user's speed
 * Walking: 0-2 m/s (0-7.2 km/h)
 * Driving: >2 m/s (>7.2 km/h)
 */
export const useTravelModeDetector = (
  userLocation: google.maps.LatLngLiteral | null
): TravelModeDetectorResult => {
  const [travelMode, setTravelMode] = useState<TravelMode>("WALKING");
  const [speed, setSpeed] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const previousLocation = useRef<google.maps.LatLngLiteral | null>(null);
  const previousTime = useRef<number | null>(null);

  useEffect(() => {
    if (!userLocation) return;

    const currentTime = Date.now();

    if (previousLocation.current && previousTime.current) {
      const timeDiff = (currentTime - previousTime.current) / 1000; // seconds

      if (timeDiff > 0) {
        // Calculate distance using Haversine formula
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (previousLocation.current.lat * Math.PI) / 180;
        const φ2 = (userLocation.lat * Math.PI) / 180;
        const Δφ =
          ((userLocation.lat - previousLocation.current.lat) * Math.PI) / 180;
        const Δλ =
          ((userLocation.lng - previousLocation.current.lng) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const calculatedSpeed = distance / timeDiff; // m/s
        setSpeed(calculatedSpeed);

        // Determine if moving (speed > 0.5 m/s = ~1.8 km/h)
        const moving = calculatedSpeed > 0.5;
        setIsMoving(moving);

        // Determine travel mode based on speed
        if (moving) {
          if (calculatedSpeed < 2) {
            // Less than 7.2 km/h - Walking
            setTravelMode("WALKING");
          } else if (calculatedSpeed < 8) {
            // 7.2-28.8 km/h - Could be cycling or slow driving, use DRIVING
            setTravelMode("DRIVING");
          } else {
            // Greater than 28.8 km/h - Definitely driving or transit
            setTravelMode("DRIVING");
          }
        }
      }
    }

    previousLocation.current = userLocation;
    previousTime.current = currentTime;
  }, [userLocation]);

  return { travelMode, speed, isMoving };
};
