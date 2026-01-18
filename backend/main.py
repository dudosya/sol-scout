from __future__ import annotations

from typing import Optional

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_engine import segment_roof

SOLAR_IRRADIANCE = 4.5
PANEL_EFFICIENCY = 0.18
SYSTEM_LOSS = 0.14
ELECTRICITY_COST = 0.12
CO2_FACTOR = 0.5
SYSTEM_COST_PER_KW = 1200

app = FastAPI(title="Sol-Scout API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    lat: float
    lng: float
    zoom: int = 19


class AnalyzeResponse(BaseModel):
    roof_area_sqm: float
    polygon: dict
    annual_kwh: float
    annual_savings_usd: float
    co2_offset_tons: float
    roi_years: Optional[float] = None
    debug_image: Optional[str] = None


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "gpu": "cuda" if torch.cuda.is_available() else "cpu_only",
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    result = segment_roof(payload.lat, payload.lng, payload.zoom)
    roof_area_sqm = float(result["roof_area_sqm"])

    system_size_kw = roof_area_sqm * PANEL_EFFICIENCY
    annual_kwh = system_size_kw * SOLAR_IRRADIANCE * 365 * (1 - SYSTEM_LOSS)
    annual_savings_usd = annual_kwh * ELECTRICITY_COST
    system_cost = system_size_kw * SYSTEM_COST_PER_KW
    roi_years = system_cost / annual_savings_usd if annual_savings_usd > 0 else 0
    co2_offset_tons = (annual_kwh * CO2_FACTOR) / 1000

    return AnalyzeResponse(
        roof_area_sqm=roof_area_sqm,
        polygon=result["polygon"],
        annual_kwh=annual_kwh,
        annual_savings_usd=annual_savings_usd,
        co2_offset_tons=co2_offset_tons,
        roi_years=roi_years,
        debug_image=result.get("debug_image"),
    )
