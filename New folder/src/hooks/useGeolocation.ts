import { useState, useEffect, useRef, useCallback } from "react";

interface GeolocationState {
  location: google.maps.LatLngLiteral | null;
  error: string | null;
  loading: boolean;
  accuracy: number | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

interface UseGeolocationReturn extends GeolocationState {
  requestPermission: () => void;
}

export const useGeolocation = (
  options: UseGeolocationOptions = {}
): UseGeolocationReturn => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = true,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
    accuracy: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const [shouldRequest, setShouldRequest] = useState(true);

  const requestPermission = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setShouldRequest(true);
  }, []);

  useEffect(() => {
    if (!shouldRequest) return;

    if (!navigator.geolocation) {
      setState({
        location: null,
        error: "Geolocation is not supported by your browser",
        loading: false,
        accuracy: null,
      });
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        error: null,
        loading: false,
        accuracy: position.coords.accuracy,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = "An unknown error occurred";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            "Please allow location access in your browser settings to see safe spaces near you.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
      }

      setState({
        location: null,
        error: errorMessage,
        loading: false,
        accuracy: null,
      });
      setShouldRequest(false);
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    if (watch) {
      // Use watchPosition for continuous tracking
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    } else {
      // Use getCurrentPosition for one-time location
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    }

    // Cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enableHighAccuracy, timeout, maximumAge, watch, shouldRequest]);

  return { ...state, requestPermission };
};
