import { useRef, useEffect, useState, useCallback } from "react";
import {
  Pin,
  AdvancedMarker,
  Map,
  MapCameraChangedEvent,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import { useGeolocation } from "../hooks/useGeolocation";
import { UserLocationMarker } from "./UserLocationMarker";
import { LocationControls } from "./LocationControls";
import { PlaceInfoCard } from "./PlaceInfoCard";
import { RoutePolyline } from "./RoutePolyline";
import { useDirections } from "../hooks/useDirections";
import { useTravelModeDetector } from "../hooks/useTravelModeDetector";
import { usePlaceDetails } from "../hooks/usePlaceDetails";

export const PLACE_TYPES = [
  "hospital",
  "police",
  "pharmacy",
  "restaurant",
  "cafe",
  "bar",
  "park",
  "transit_station",
  "lodging",
  // additional types used by need mapping
  "library",
  "shopping_mall",
  "university",
  "train_station",
  "bus_station",
  "subway_station",
  "place_of_worship",
  // L2 additions
  "doctor",
  "fire_station",
  "car_repair",
  "gas_station",
  "parking",
  "embassy",
];

type Poi = {
  key: string;
  location: google.maps.LatLngLiteral;
  type: string;
  name: string;
  placeId?: string;
};

const PoiMarkers = (props: {
  pois: Poi[];
  onPoiSelect: (poi: Poi) => void;
  selectedPoiKey: string | null;
}) => {
  const map = useMap();
  const [markers, setMarkers] = useState<{ [key: string]: Marker }>({});
  const clusterer = useRef<MarkerClusterer | null>(null);
  const markerRefCallbacks = useRef<{
    [key: string]: (marker: Marker | null) => void;
  }>({});

  useEffect(() => {
    if (!map) return;
    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({
        map,
        renderer: {
          render: ({ count, position }) => {
            const color = "#EC96BE";
            const svg = `
              <svg fill="${color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="50" height="50">
                <circle cx="120" cy="120" opacity=".6" r="70" />
                <circle cx="120" cy="120" opacity=".3" r="90" />
                <circle cx="120" cy="120" opacity=".2" r="110" />
              </svg>
            `;

            return new google.maps.marker.AdvancedMarkerElement({
              position,
              content: (() => {
                const div = document.createElement("div");
                div.innerHTML = svg;
                const label = document.createElement("div");
                label.style.cssText = `
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  color: white;
                  font-weight: bold;
                  font-size: 14px;
                `;
                label.textContent = String(count);
                div.style.position = "relative";
                div.appendChild(label);
                return div;
              })(),
              zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
            });
          },
        },
      });
    }
  }, [map]);

  useEffect(() => {
    clusterer.current?.clearMarkers();
    clusterer.current?.addMarkers(Object.values(markers));
  }, [markers]);

  const setMarkerRef = useCallback((marker: Marker | null, key: string) => {
    setMarkers((prev) => {
      const existingMarker = prev[key];

      if (marker) {
        if (existingMarker === marker) {
          return prev;
        }

        return { ...prev, [key]: marker };
      }

      if (!existingMarker) {
        return prev;
      }

      const nextMarkers = { ...prev };
      delete nextMarkers[key];
      return nextMarkers;
    });
  }, []);

  const getMarkerRef = useCallback(
    (key: string) => {
      if (!markerRefCallbacks.current[key]) {
        markerRefCallbacks.current[key] = (marker: Marker | null) =>
          setMarkerRef(marker, key);
      }

      return markerRefCallbacks.current[key];
    },
    [setMarkerRef]
  );

  // click handler that selects the POI for navigation
  const handleClick = useCallback(
    (poi: Poi) => {
      if (!map) return;
      console.log("marker clicked:", poi.name, poi.location);
      map.panTo(poi.location);
      props.onPoiSelect(poi);
    },
    [map, props]
  );

  return (
    <>
      {props.pois.map((poi: Poi) => {
        const isSelected = poi.key === props.selectedPoiKey;
        return (
          <AdvancedMarker
            key={poi.key}
            position={poi.location}
            ref={getMarkerRef(poi.key)}
            clickable={true}
            onClick={() => handleClick(poi)}
          >
            <Pin
              background={isSelected ? "#EC96BE" : "#8764C1"}
              glyphColor={isSelected ? "#8764C1" : "#EC96BE"}
              borderColor={"#87A5DC"}
              scale={isSelected ? 1.3 : 1}
            />
          </AdvancedMarker>
        );
      })}
    </>
  );
};

const PlacesFetcher = ({
  onPlacesFound,
  center,
  shouldFetch,
  types,
  openNow,
}: {
  onPlacesFound: (places: Poi[]) => void;
  center: google.maps.LatLngLiteral;
  shouldFetch: boolean;
  types: string[];
  openNow?: boolean;
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const lastFetchCenter = useRef<google.maps.LatLngLiteral | null>(null);
  const lastFetchKey = useRef<string | null>(null);

  // Helper function to calculate distance between two points in meters
  const calculateDistance = (
    point1: google.maps.LatLngLiteral,
    point2: google.maps.LatLngLiteral
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  useEffect(() => {
    if (!map || !placesLib || !shouldFetch) return;

    // Build a fetch signature that includes center (rounded), types and openNow
    const roundedLat = Math.round(center.lat * 1000) / 1000;
    const roundedLng = Math.round(center.lng * 1000) / 1000;
    const key = `${roundedLat},${roundedLng}|${types.join(",")}|${
      openNow ? "1" : "0"
    }`;

    // If key hasn't changed and movement is <25km, skip fetch
    if (lastFetchCenter.current && lastFetchKey.current === key) {
      const distance = calculateDistance(center, lastFetchCenter.current);
      if (distance < 25000) {
        return;
      }
    }

    let cancelled = false;

    const fetchPlaces = async () => {
      try {
        const Place = placesLib.Place;

        const hasV3Nearby = !!Place?.searchNearby;

        // Larger radius to cover more area (100km)
        const circleRestriction: google.maps.CircleLiteral = {
          center,
          radius: 100000, // 80km radius
        };
        const fields: string[] = [
          "id",
          "location",
          "displayName",
          "types",
          "currentOpeningHours",
        ];

        console.log(`Fetching places around: ${center.lat}, ${center.lng}`);

        const placeBuckets = await Promise.all(
          types.map(async (type) => {
            // Try v3 first
            if (hasV3Nearby) {
              try {
                const { places } = await Place.searchNearby({
                  locationRestriction: circleRestriction,
                  includedPrimaryTypes: [type],
                  maxResultCount: 20,
                  fields,
                  // @ts-ignore openNow is supported in Places searchNearby
                  openNow: !!openNow,
                });

                let results = (places || []).map((place: any) => ({
                  key: `${type}-${
                    place.id || place.displayName || crypto.randomUUID()
                  }`,
                  location: (() => {
                    const location = place.location;
                    if (!location) return center;
                    if (location instanceof google.maps.LatLng)
                      return location.toJSON();
                    return location;
                  })(),
                  type,
                  name: place.displayName || "Unknown",
                  placeId: place.id || undefined,
                }));
                // Filter by openNow if requested and we have the field
                if (openNow) {
                  results = (places || [])
                    .filter((p: any) => p.currentOpeningHours?.openNow === true)
                    .map((place: any) => ({
                      key: `${type}-${
                        place.id || place.displayName || crypto.randomUUID()
                      }`,
                      location: (() => {
                        const location = place.location;
                        if (!location) return center;
                        if (location instanceof google.maps.LatLng)
                          return location.toJSON();
                        return location;
                      })(),
                      type,
                      name: place.displayName || "Unknown",
                      placeId: place.id || undefined,
                    }));
                }
                if (results.length) return results;
                // fall through to legacy if empty
              } catch (error) {
                console.warn(
                  `v3 nearby failed for ${type}, falling back to legacy`,
                  error
                );
              }
            }

            // Legacy fallback (PlacesService.nearbySearch) – limited to 50km
            return await new Promise<Poi[]>((resolve) => {
              try {
                const svc = new (google.maps.places as any).PlacesService(
                  document.createElement("div")
                );
                svc.nearbySearch(
                  {
                    location: center,
                    radius: 50000, // legacy max
                    type,
                    openNow: !!openNow,
                  },
                  (res: any[], status: any) => {
                    if (
                      status !== google.maps.places.PlacesServiceStatus.OK ||
                      !Array.isArray(res)
                    ) {
                      resolve([]);
                      return;
                    }
                    const filtered = openNow
                      ? res.filter((p: any) => p.opening_hours?.open_now)
                      : res;
                    resolve(
                      filtered.slice(0, 20).map((p: any) => ({
                        key: `${type}-${
                          p.place_id || p.name || crypto.randomUUID()
                        }`,
                        location: p.geometry?.location?.toJSON?.() || center,
                        type,
                        name: p.name || "Unknown",
                        placeId: p.place_id,
                      }))
                    );
                  }
                );
              } catch (e) {
                console.error(`Legacy nearby failed for ${type}`, e);
                resolve([]);
              }
            });
          })
        );

        if (!cancelled) {
          lastFetchCenter.current = center;
          lastFetchKey.current = key;
          const flat = placeBuckets.flat();
          // Sort by type priority (order of provided types) then distance
          const typeIndex = (t: string) => Math.max(0, types.indexOf(t));
          const sorted = flat
            .map((p) => ({
              p,
              d: calculateDistance(center, p.location),
              ti: typeIndex(p.type),
            }))
            .sort((a, b) => (a.ti !== b.ti ? a.ti - b.ti : a.d - b.d))
            .map((x) => x.p);
          onPlacesFound(sorted);
        }
      } catch (error) {
        console.error("Failed to fetch places", error);
      }
    };

    fetchPlaces();

    return () => {
      cancelled = true;
    };
  }, [map, placesLib, center, shouldFetch, onPlacesFound, types, openNow]);

  return null;
};

export const SafeSpacesMap = ({
  allowedTypes,
  openNow,
}: {
  allowedTypes?: string[];
  openNow?: boolean;
}) => {
  const [places, setPlaces] = useState<Poi[]>([]);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({
    lat: -26.195246,
    lng: 28.034088,
  });
  const [hasInitializedLocation, setHasInitializedLocation] = useState(false);
  const [isFollowMode, setIsFollowMode] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const shouldAutoSelect = useRef(true);

  const map = useMap();

  // Get user's location
  const {
    location: userLocation,
    error: locationError,
    loading: locationLoading,
    requestPermission,
  } = useGeolocation({
    enableHighAccuracy: true,
    watch: true,
  });

  // Detect travel mode based on speed
  const { travelMode } = useTravelModeDetector(userLocation);

  // Directions hook
  const { route, distance, duration, getDirections, clearDirections } =
    useDirections();

  // Place details for selected POI
  const { details: selectedDetails, loading: detailsLoading } = usePlaceDetails(
    selectedPoi?.placeId || null
  );

  // Update map center when user location is first obtained
  useEffect(() => {
    if (userLocation && !hasInitializedLocation && map) {
      setMapCenter(userLocation);
      setHasInitializedLocation(true);

      // Smoothly pan to user location with a nice zoom level
      map.panTo(userLocation);
      map.setZoom(15);

      console.log("User location obtained:", userLocation);
    }
  }, [userLocation, hasInitializedLocation, map]);

  // Follow mode: Auto-center on user location as they move
  useEffect(() => {
    if (userLocation && hasInitializedLocation && isFollowMode && map) {
      // Smoothly pan to user's new location
      map.panTo(userLocation);

      // Update center for places refetch check
      setMapCenter(userLocation);
    }
  }, [userLocation, hasInitializedLocation, isFollowMode, map]);

  // Update map center when user moves significantly (for refetching places)
  // Only applies when NOT in follow mode
  useEffect(() => {
    if (userLocation && hasInitializedLocation && !isFollowMode) {
      // Calculate distance from current map center
      const calculateDistance = (
        point1: google.maps.LatLngLiteral,
        point2: google.maps.LatLngLiteral
      ): number => {
        const R = 6371e3;
        const φ1 = (point1.lat * Math.PI) / 180;
        const φ2 = (point2.lat * Math.PI) / 180;
        const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
        const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
      };

      const distance = calculateDistance(userLocation, mapCenter);

      // If user moved more than 25km, update center for places refetch
      if (distance > 25000) {
        setMapCenter(userLocation);
      }
    }
  }, [userLocation, mapCenter, hasInitializedLocation, isFollowMode]);

  // Log location errors
  useEffect(() => {
    if (locationError) {
      console.error("Geolocation error:", locationError);
    }
  }, [locationError]);

  // Toggle follow mode
  const handleToggleFollowMode = useCallback(() => {
    setIsFollowMode((prev) => {
      const newFollowMode = !prev;

      // If enabling follow mode, immediately center on user location
      if (newFollowMode && userLocation && map) {
        map.panTo(userLocation);
        setMapCenter(userLocation);
      }

      return newFollowMode;
    });
  }, [userLocation, map]);

  // Re-center on user location
  const handleRecenter = useCallback(() => {
    if (userLocation && map) {
      map.panTo(userLocation);
      map.setZoom(15);
      setMapCenter(userLocation);
    }
  }, [userLocation, map]);

  // Handle POI selection
  const handlePoiSelect = useCallback((poi: Poi) => {
    setSelectedPoi(poi);
    // Disable follow mode when selecting a destination
    setIsFollowMode(false);
  }, []);

  // Auto-select top pick when results arrive (first item after sorting)
  useEffect(() => {
    if (!selectedPoi && places.length > 0 && map && shouldAutoSelect.current) {
      setSelectedPoi(places[0]);
      map.panTo(places[0].location);
      shouldAutoSelect.current = false;
    }
  }, [places, selectedPoi, map]);

  // Handle navigation toggle
  const handleNavigate = useCallback(() => {
    if (!selectedPoi || !userLocation) return;

    if (isNavigating) {
      // Stop navigation
      setIsNavigating(false);
      clearDirections();
    } else {
      // Start navigation
      setIsNavigating(true);
      getDirections({
        origin: userLocation,
        destination: selectedPoi.location,
        travelMode: travelMode as google.maps.TravelMode,
      });
    }
  }, [
    selectedPoi,
    userLocation,
    isNavigating,
    travelMode,
    getDirections,
    clearDirections,
  ]);

  // Handle closing info card
  const handleCloseInfoCard = useCallback(() => {
    setSelectedPoi(null);
    setIsNavigating(false);
    clearDirections();
    // prevent auto-reselect after user dismisses
    shouldAutoSelect.current = false;
  }, [clearDirections]);

  // Update directions when user location changes during navigation
  useEffect(() => {
    if (isNavigating && selectedPoi && userLocation) {
      // Recalculate route as user moves
      getDirections({
        origin: userLocation,
        destination: selectedPoi.location,
        travelMode: travelMode as google.maps.TravelMode,
      });
    }
  }, [userLocation, isNavigating, selectedPoi, travelMode, getDirections]);

  // Re-enable auto-select when filters change (new need/types or openNow)
  useEffect(() => {
    shouldAutoSelect.current = true;
  }, [openNow, allowedTypes && allowedTypes.join(",")]);

  return (
    <>
      <PlacesFetcher
        onPlacesFound={setPlaces}
        center={mapCenter}
        shouldFetch={true}
        types={allowedTypes && allowedTypes.length ? allowedTypes : PLACE_TYPES}
        openNow={openNow}
      />
      <PoiMarkers
        pois={places}
        onPoiSelect={handlePoiSelect}
        selectedPoiKey={selectedPoi?.key || null}
      />

      {/* Show user location marker if available */}
      {userLocation && <UserLocationMarker position={userLocation} />}

      {/* Show route polyline when navigating */}
      {isNavigating && route && <RoutePolyline route={route} />}

      {/* Location controls */}
      <LocationControls
        isFollowMode={isFollowMode}
        onToggleFollowMode={handleToggleFollowMode}
        onRecenter={handleRecenter}
        hasLocation={!!userLocation}
        isLoading={locationLoading}
        error={locationError}
        onRequestPermission={requestPermission}
      />

      {/* Place info card when POI is selected */}
      {selectedPoi && userLocation && (
        <PlaceInfoCard
          placeName={selectedPoi.name}
          placeType={selectedPoi.type}
          placeLocation={selectedPoi.location}
          userLocation={userLocation}
          onNavigate={handleNavigate}
          onClose={handleCloseInfoCard}
          distance={distance || undefined}
          duration={duration || undefined}
          isNavigating={isNavigating}
          loadingDetails={detailsLoading}
          isOpen={selectedDetails?.openNow}
          todaysHours={selectedDetails?.todaysHours}
          phoneNumber={selectedDetails?.phoneNumber}
          address={selectedDetails?.address}
          nextChangeLabel={selectedDetails?.nextChangeLabel}
        />
      )}
    </>
  );
};

export const SafeSpacesMapWrapper = ({
  allowedTypes,
  openNow,
}: {
  allowedTypes?: string[];
  openNow?: boolean;
}) => {
  return (
    <Map
      defaultZoom={13}
      mapId="7b19dfb1c51c3fd7b868ac32"
      defaultCenter={{ lat: -26.195246, lng: 28.034088 }}
      style={{ width: "100%", height: "100%" }}
      onCameraChanged={(ev: MapCameraChangedEvent) =>
        console.log(
          "camera changed:",
          ev.detail.center,
          "zoom:",
          ev.detail.zoom
        )
      }
    >
      <SafeSpacesMap allowedTypes={allowedTypes} openNow={openNow} />
    </Map>
  );
};
