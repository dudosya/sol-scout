"use client";

import { useEffect, useRef } from "react";
import Map, {
  Layer,
  Marker,
  MapMouseEvent,
  MapRef,
  Source,
} from "react-map-gl/mapbox";
import { useStore } from "@/store/useStore";

const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

export default function MapView() {
  const mapRef = useRef<MapRef | null>(null);
  const viewState = useStore((state) => state.viewState);
  const markerPosition = useStore((state) => state.markerPosition);
  const setMarkerPosition = useStore((state) => state.setMarkerPosition);
  const detectedPolygon = useStore((state) => state.detectedPolygon);
  const drawMode = useStore((state) => state.drawMode);
  const drawPoints = useStore((state) => state.drawPoints);
  const drawPolygon = useStore((state) => state.drawPolygon);
  const addDrawPoint = useStore((state) => state.addDrawPoint);
  const flyToTarget = useStore((state) => state.flyToTarget);
  const setFlyToTarget = useStore((state) => state.setFlyToTarget);

  const handleMove = (evt: { viewState: typeof viewState }) => {
    useStore.getState().setViewState(evt.viewState);
  };

  const handleClick = (evt: MapMouseEvent) => {
    const { lng, lat } = evt.lngLat;
    if (drawMode) {
      addDrawPoint({ lat, lng });
      return;
    }
    setMarkerPosition({ lat, lng });

    const currentZoom = viewState.zoom;
    const targetZoom = currentZoom > 16 ? currentZoom : 19;

    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: targetZoom,
      duration: 1500,
      essential: true,
    });
  };

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;

    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: flyToTarget.zoom,
      duration: 1500,
      essential: true,
    });
    setFlyToTarget(null);
  }, [flyToTarget, setFlyToTarget]);

  return (
    <div className="absolute inset-0 h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        latitude={viewState.latitude}
        longitude={viewState.longitude}
        zoom={viewState.zoom}
        pitch={viewState.pitch}
        bearing={viewState.bearing}
        onMove={handleMove}
        onClick={handleClick}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        {detectedPolygon && !drawPolygon && (
          <Source id="roof-data" type="geojson" data={detectedPolygon}>
            <Layer
              id="roof-fill"
              type="fill"
              paint={{
                "fill-color": "#06b6d4",
                "fill-opacity": 0.5,
                "fill-outline-color": "#00ffff",
              }}
            />
            <Layer
              id="roof-outline"
              type="line"
              paint={{
                "line-color": "#00ffff",
                "line-width": 2,
              }}
            />
          </Source>
        )}
        {drawPolygon && (
          <Source id="manual-roof" type="geojson" data={drawPolygon}>
            <Layer
              id="manual-fill"
              type="fill"
              paint={{
                "fill-color": "#f97316",
                "fill-opacity": 0.35,
                "fill-outline-color": "#fb923c",
              }}
            />
            <Layer
              id="manual-outline"
              type="line"
              paint={{
                "line-color": "#fb923c",
                "line-width": 2,
              }}
            />
          </Source>
        )}
        {drawPoints.length > 1 && (
          <Source
            id="draw-line"
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: drawPoints.map((point) => [point.lng, point.lat]),
              },
            }}
          >
            <Layer
              id="draw-line-layer"
              type="line"
              paint={{
                "line-color": "#f97316",
                "line-width": 2,
              }}
            />
          </Source>
        )}
        {drawPoints.length > 0 && (
          <Source
            id="draw-points"
            type="geojson"
            data={{
              type: "FeatureCollection",
              features: drawPoints.map((point) => ({
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: [point.lng, point.lat],
                },
              })),
            }}
          >
            <Layer
              id="draw-points-layer"
              type="circle"
              paint={{
                "circle-color": "#f97316",
                "circle-radius": 5,
                "circle-stroke-color": "#111827",
                "circle-stroke-width": 1,
              }}
            />
          </Source>
        )}
        {markerPosition && (
          <Marker latitude={markerPosition.lat} longitude={markerPosition.lng}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C8.13401 2 5 5.13401 5 9C5 13.9706 12 22 12 22C12 22 19 13.9706 19 9C19 5.13401 15.866 2 12 2Z"
                fill="#ef4444"
              />
              <circle cx="12" cy="9" r="2.5" fill="#fff" />
            </svg>
          </Marker>
        )}
      </Map>
    </div>
  );
}
