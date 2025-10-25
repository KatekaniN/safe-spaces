import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface RoutePolylineProps {
  route: google.maps.DirectionsRoute | null;
}

export const RoutePolyline = ({ route }: RoutePolylineProps) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !route) {
      // Clean up existing polyline if route is cleared
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // Extract path from route
    const path: google.maps.LatLng[] = [];
    route.legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        if (step.path) {
          path.push(...step.path);
        }
      });
    });

    // Create new polyline
    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#8764C1",
      strokeOpacity: 0.8,
      strokeWeight: 5,
      map,
      zIndex: 100,
    });

    // Cleanup function
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, route]);

  return null; // This component doesn't render anything in React, it manipulates the map directly
};
