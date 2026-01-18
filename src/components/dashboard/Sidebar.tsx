"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as turf from "@turf/turf";
import { analyzeRooftop, calculateSolarData } from "@/lib/api";
import { useStore } from "@/store/useStore";

export default function Sidebar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; place_name: string; center: [number, number] }>
  >([]);
  const viewState = useStore((state) => state.viewState);
  const markerPosition = useStore((state) => state.markerPosition);
  const analysisStatus = useStore((state) => state.analysisStatus);
  const analysisSource = useStore((state) => state.analysisSource);
  const setScanning = useStore((state) => state.setScanning);
  const setResults = useStore((state) => state.setResults);
  const setManualResults = useStore((state) => state.setManualResults);
  const drawMode = useStore((state) => state.drawMode);
  const drawPoints = useStore((state) => state.drawPoints);
  const setDrawMode = useStore((state) => state.setDrawMode);
  const undoDrawPoint = useStore((state) => state.undoDrawPoint);
  const clearDraw = useStore((state) => state.clearDraw);
  const setDrawPolygon = useStore((state) => state.setDrawPolygon);
  const setFlyToTarget = useStore((state) => state.setFlyToTarget);

  const handleAnalyze = async () => {
    if (analysisStatus === "scanning" || analysisSource === "manual") return;
    setScanning(true);

    const targetLat = markerPosition?.lat ?? viewState.latitude;
    const targetLng = markerPosition?.lng ?? viewState.longitude;

    const result = await analyzeRooftop(targetLat, targetLng);
    setResults(result.solarData, result.polygon);
  };

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const handler = window.setTimeout(async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query.trim()
        )}.json?autocomplete=true&limit=5&access_token=${token}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          setSuggestions([]);
          return;
        }
        const data = await response.json();
        setSuggestions(data.features ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(handler);
    };
  }, [query]);

  const handleFinishPolygon = () => {
    if (drawPoints.length < 3) return;

    const ring = [...drawPoints, drawPoints[0]].map((point) => [
      point.lng,
      point.lat,
    ]);
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    };
    const areaSqM = turf.area(polygon);
    const solarData = calculateSolarData(areaSqM);

    setDrawPolygon(polygon, areaSqM);
    setManualResults(solarData, polygon);
    setDrawMode(false);
  };

  return (
    <aside className="fixed left-4 top-4 bottom-4 z-30 w-[320px] rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
      <div className="flex h-full flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold text-white">Sol-Scout Pro</h1>
          <p className="text-xs text-slate-400">Digital solar feasibility triage</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">Address</label>
          <div className="relative">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search address..."
            />
            {suggestions.length > 0 && (
              <div className="absolute z-40 mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/95 shadow-lg">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                    onClick={() => {
                      const [lng, lat] = suggestion.center;
                      setQuery(suggestion.place_name);
                      setSuggestions([]);
                      useStore.getState().setMarkerPosition({ lat, lng });
                      const targetZoom = viewState.zoom > 16 ? viewState.zoom : 19;
                      setFlyToTarget({ lat, lng, zoom: targetZoom });
                    }}
                  >
                    {suggestion.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          size="lg"
          className="mt-auto w-full bg-orange-500 text-white hover:bg-orange-600"
          onClick={handleAnalyze}
          disabled={analysisStatus === "scanning" || analysisSource === "manual"}
        >
          {analysisStatus === "scanning"
            ? "Scanning..."
            : analysisSource === "manual"
              ? "Manual Polygon Active"
              : "Analyze Rooftop"}
        </Button>

        <div className="mt-2 space-y-2">
          <Button
            variant={drawMode ? "secondary" : "outline"}
            className="w-full"
            onClick={() => setDrawMode(!drawMode)}
          >
            {drawMode ? "Drawing: Click to add points" : "Manual Draw Polygon"}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={undoDrawPoint}>
              Undo
            </Button>
            <Button variant="outline" onClick={clearDraw}>
              Clear
            </Button>
            <Button
              onClick={handleFinishPolygon}
              disabled={drawPoints.length < 3}
            >
              Finish
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
