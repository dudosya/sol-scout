import { create } from "zustand";

export interface SolarData {
  roofAreaSqM: number;
  systemSizeKw: number;
  annualEnergy: number;
  savings: number;
  co2: number;
  roiYears: number;
  panelCount: number;
}

export interface AppState {
  viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  setViewState: (view: {
    latitude: number;
    longitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  }) => void;

  markerPosition: { lat: number; lng: number } | null;
  setMarkerPosition: (pos: { lat: number; lng: number } | null) => void;

  analysisStatus: "idle" | "scanning" | "success" | "error";
  analysisSource: "ai" | "manual" | null;
  solarData: SolarData | null;
  detectedPolygon: any | null;

  drawMode: boolean;
  drawPoints: Array<{ lat: number; lng: number }>;
  drawPolygon: any | null;
  drawAreaSqM: number | null;
  flyToTarget: { lat: number; lng: number; zoom: number } | null;

  setScanning: (status: boolean) => void;
  setResults: (data: SolarData, polygon: any) => void;
  setManualResults: (data: SolarData, polygon: any) => void;
  setDrawMode: (enabled: boolean) => void;
  addDrawPoint: (point: { lat: number; lng: number }) => void;
  undoDrawPoint: () => void;
  clearDraw: () => void;
  setDrawPolygon: (polygon: any, areaSqM: number | null) => void;
  setFlyToTarget: (target: { lat: number; lng: number; zoom: number } | null) => void;
}

export const useStore = create<AppState>((set) => ({
  viewState: {
    latitude: 43.238949,
    longitude: 76.889709,
    zoom: 15,
    pitch: 0,
    bearing: 0,
  },
  markerPosition: null,
  analysisStatus: "idle",
  analysisSource: null,
  solarData: null,
  detectedPolygon: null,
  drawMode: false,
  drawPoints: [],
  drawPolygon: null,
  drawAreaSqM: null,
  flyToTarget: null,

  setViewState: (view) => set({ viewState: view }),
  setMarkerPosition: (pos) => set({ markerPosition: pos }),
  setScanning: (status) =>
    set(
      status
        ? {
            analysisStatus: "scanning",
            analysisSource: "ai",
            solarData: null,
            detectedPolygon: null,
          }
        : { analysisStatus: "idle" }
    ),
  setResults: (data, polygon) =>
    set({
      solarData: data,
      detectedPolygon: polygon,
      analysisSource: "ai",
      analysisStatus: "success",
    }),
  setManualResults: (data, polygon) =>
    set({
      solarData: data,
      detectedPolygon: polygon,
      analysisSource: "manual",
      analysisStatus: "success",
    }),
  setDrawMode: (enabled) => set({ drawMode: enabled }),
  addDrawPoint: (point) =>
    set((state) => ({ drawPoints: [...state.drawPoints, point] })),
  undoDrawPoint: () =>
    set((state) => ({ drawPoints: state.drawPoints.slice(0, -1) })),
  clearDraw: () =>
    set({
      drawPoints: [],
      drawPolygon: null,
      drawAreaSqM: null,
      drawMode: false,
      analysisSource: null,
      analysisStatus: "idle",
      solarData: null,
      detectedPolygon: null,
    }),
  setDrawPolygon: (polygon, areaSqM) =>
    set({
      drawPolygon: polygon,
      drawAreaSqM: areaSqM,
    }),
  setFlyToTarget: (target) => set({ flyToTarget: target }),
}));
