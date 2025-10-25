import { useState, useCallback, useRef } from "react";

interface DirectionsResult {
  route: google.maps.DirectionsRoute | null;
  distance: number | null; // in meters
  duration: string | null;
  loading: boolean;
  error: string | null;
}

interface UseDirectionsOptions {
  origin: google.maps.LatLngLiteral | null;
  destination: google.maps.LatLngLiteral | null;
  travelMode: google.maps.TravelMode;
}

/**
 * Hook to fetch and cache directions from Google Maps Directions Service
 * Minimizes API calls by caching results
 */
export const useDirections = () => {
  const [result, setResult] = useState<DirectionsResult>({
    route: null,
    distance: null,
    duration: null,
    loading: false,
    error: null,
  });

  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const cache = useRef<Map<string, DirectionsResult>>(new Map());

  const getDirections = useCallback(
    async ({ origin, destination, travelMode }: UseDirectionsOptions) => {
      if (!origin || !destination) {
        setResult({
          route: null,
          distance: null,
          duration: null,
          loading: false,
          error: "Origin or destination not provided",
        });
        return;
      }

      // Create cache key
      const cacheKey = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}-${travelMode}`;

      // Check cache first
      if (cache.current.has(cacheKey)) {
        const cachedResult = cache.current.get(cacheKey)!;
        setResult(cachedResult);
        return;
      }

      setResult((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Initialize directions service if needed
        if (!directionsService.current) {
          directionsService.current = new google.maps.DirectionsService();
        }

        const request: google.maps.DirectionsRequest = {
          origin,
          destination,
          travelMode,
          // Optimize for cost: don't request alternatives
          provideRouteAlternatives: false,
        };

        const response = await directionsService.current.route(request);

        if (response.routes && response.routes.length > 0) {
          const route = response.routes[0];
          const leg = route.legs[0];

          const newResult: DirectionsResult = {
            route,
            distance: leg.distance?.value || null,
            duration: leg.duration?.text || null,
            loading: false,
            error: null,
          };

          // Cache the result
          cache.current.set(cacheKey, newResult);

          setResult(newResult);
        } else {
          throw new Error("No routes found");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get directions";
        const errorResult: DirectionsResult = {
          route: null,
          distance: null,
          duration: null,
          loading: false,
          error: errorMessage,
        };
        setResult(errorResult);
        console.error("Directions error:", error);
      }
    },
    []
  );

  const clearDirections = useCallback(() => {
    setResult({
      route: null,
      distance: null,
      duration: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...result,
    getDirections,
    clearDirections,
  };
};
