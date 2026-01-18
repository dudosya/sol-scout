"use client";

import { Card } from "@/components/tremor/Card";
import { useStore } from "@/store/useStore";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number, suffix = "") =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    value
  )}${suffix}`;

export default function BentoGrid() {
  const analysisStatus = useStore((state) => state.analysisStatus);
  const solarData = useStore((state) => state.solarData);

  if (analysisStatus !== "success" || !solarData) return null;

  const roofArea = formatNumber(solarData.roofAreaSqM, " m²");
  const systemSize = formatNumber(solarData.systemSizeKw, " kW");
  const annualEnergy = formatNumber(solarData.annualEnergy, " kWh");
  const panelCount = formatNumber(solarData.panelCount, " panels");
  const annualSavings = formatCurrency(solarData.savings);
  const co2Reduction = formatNumber(solarData.co2, " t");
  const roiPeriod = formatNumber(solarData.roiYears, " yrs");

  return (
    <section className="pointer-events-none absolute bottom-4 right-4 z-20 w-90">
      <div className="grid gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Roof Area
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{roofArea}</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            System Size
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {systemSize}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Annual Energy
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {annualEnergy}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Panel Count
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {panelCount}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Annual Savings
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {annualSavings}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            CO2 Reduction
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {co2Reduction}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            ROI Period
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{roiPeriod}</p>
        </Card>
      </div>
    </section>
  );
}
