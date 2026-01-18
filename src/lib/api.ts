import type { SolarData } from "@/store/useStore";

type AnalyzeResult = {
  solarData: SolarData;
  polygon: any;
};

const MIN_DELAY_MS = 3000;
const SOLAR_IRRADIANCE = 4.5;
const PANEL_EFFICIENCY = 0.18;
const SYSTEM_LOSS = 0.14;
const ELECTRICITY_COST = 0.12;
const CO2_FACTOR = 0.5;
const SYSTEM_COST_PER_KW = 1200;
const PANEL_AREA_SQM = 1.7;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createMockPolygon = (lat: number, lng: number) => {
  const half = 0.0001;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lng - half, lat - half],
          [lng + half, lat - half],
          [lng + half, lat + half],
          [lng - half, lat + half],
          [lng - half, lat - half],
        ],
      ],
    },
  };
};

export const calculateSolarData = (areaSqM: number): SolarData => {
  const systemSizeKw = areaSqM * PANEL_EFFICIENCY;
  const annualEnergy =
    systemSizeKw * SOLAR_IRRADIANCE * 365 * (1 - SYSTEM_LOSS);
  const savings = annualEnergy * ELECTRICITY_COST;
  const systemCost = systemSizeKw * SYSTEM_COST_PER_KW;
  const roiYears = savings > 0 ? systemCost / savings : 0;
  const co2 = (annualEnergy * CO2_FACTOR) / 1000;
  const panelCount = areaSqM / PANEL_AREA_SQM;

  return {
    roofAreaSqM: areaSqM,
    systemSizeKw,
    annualEnergy,
    savings,
    co2,
    roiYears,
    panelCount,
  };
};

const createMockResult = (lat: number, lng: number): AnalyzeResult => {
  const areaSqM = 450;
  return {
    solarData: calculateSolarData(areaSqM),
    polygon: createMockPolygon(lat, lng),
  };
};

export async function analyzeRooftop(
  lat: number,
  lng: number
): Promise<AnalyzeResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const delayPromise = delay(MIN_DELAY_MS);

  try {
    const fetchPromise = fetch(`${apiUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lat, lng }),
    });

    const [response] = await Promise.all([fetchPromise, delayPromise]);

    if (!response.ok) {
      return createMockResult(lat, lng);
    }

    const data = await response.json();
    const areaSqM = data.roof_area_sqm ?? 0;
    const solarData = calculateSolarData(areaSqM);

    return {
      solarData: {
        ...solarData,
        systemSizeKw: solarData.systemSizeKw,
        annualEnergy: data.annual_kwh ?? solarData.annualEnergy,
        savings: data.annual_savings_usd ?? solarData.savings,
        co2: data.co2_offset_tons ?? solarData.co2,
        panelCount: solarData.panelCount,
      },
      polygon: data.polygon ?? createMockPolygon(lat, lng),
    };
  } catch (error) {
    await delayPromise;
    return createMockResult(lat, lng);
  }
}
