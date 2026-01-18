from __future__ import annotations

import base64
import gc
import math
import os
from typing import Any, Dict, Tuple

import cv2
import numpy as np
import requests
import torch
from dotenv import load_dotenv
from mobile_sam import SamPredictor, sam_model_registry

MAPBOX_STYLE = "mapbox/satellite-v9"
IMAGE_SIZE = 1024
DEFAULT_ZOOM = 19

load_dotenv()

EARTH_RADIUS_M = 6378137.0
ORIGIN_SHIFT = 2 * math.pi * EARTH_RADIUS_M / 2.0
INITIAL_RESOLUTION = 2 * math.pi * EARTH_RADIUS_M / 256.0


def _get_mapbox_token() -> str:
    token = os.getenv("MAPBOX_TOKEN") or os.getenv("NEXT_PUBLIC_MAPBOX_TOKEN")
    if not token:
        raise RuntimeError("MAPBOX_TOKEN is not set")
    return token


def _fetch_static_image(lat: float, lng: float, zoom: int) -> np.ndarray:
    token = _get_mapbox_token()
    url = (
        "https://api.mapbox.com/styles/v1/"
        f"{MAPBOX_STYLE}/static/"
        f"{lng},{lat},{zoom},0,0/{IMAGE_SIZE}x{IMAGE_SIZE}"
        f"?access_token={token}"
    )
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    image_array = np.frombuffer(response.content, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError("Failed to decode Mapbox image")
    image = cv2.resize(image, (IMAGE_SIZE, IMAGE_SIZE))
    return image


def _latlng_to_meters(lat: float, lng: float) -> Tuple[float, float]:
    x = lng * ORIGIN_SHIFT / 180.0
    y = math.log(math.tan((90.0 + lat) * math.pi / 360.0)) * EARTH_RADIUS_M
    return x, y


def _meters_to_latlng(x: float, y: float) -> Tuple[float, float]:
    lng = (x / ORIGIN_SHIFT) * 180.0
    lat = (y / ORIGIN_SHIFT) * 180.0
    lat = 180.0 / math.pi * (
        2.0 * math.atan(math.exp(lat * math.pi / 180.0)) - math.pi / 2.0
    )
    return lat, lng


def _meters_per_pixel(lat: float, zoom: int) -> float:
    return (INITIAL_RESOLUTION * math.cos(lat * math.pi / 180.0)) / (2 ** zoom)


def _pixel_to_latlng(
    center_lat: float,
    center_lng: float,
    zoom: int,
    pixel_x: float,
    pixel_y: float,
) -> Tuple[float, float]:
    center_x_m, center_y_m = _latlng_to_meters(center_lat, center_lng)
    mpp = _meters_per_pixel(center_lat, zoom)
    dx = pixel_x - IMAGE_SIZE / 2.0
    dy = pixel_y - IMAGE_SIZE / 2.0
    x_m = center_x_m + dx * mpp
    y_m = center_y_m - dy * mpp
    return _meters_to_latlng(x_m, y_m)


def _mask_to_polygon(mask: np.ndarray, lat: float, lng: float, zoom: int) -> Dict[str, Any]:
    mask_uint8 = (mask.astype(np.uint8) * 255)
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return _fallback_polygon(lat, lng)

    largest = max(contours, key=cv2.contourArea)
    if len(largest) < 3:
        return _fallback_polygon(lat, lng)

    coords = []
    for point in largest.squeeze(axis=1):
        x, y = float(point[0]), float(point[1])
        p_lat, p_lng = _pixel_to_latlng(lat, lng, zoom, x, y)
        coords.append([p_lng, p_lat])

    if coords[0] != coords[-1]:
        coords.append(coords[0])

    return {
        "type": "Feature",
        "properties": {},
        "geometry": {"type": "Polygon", "coordinates": [coords]},
    }


def _fallback_polygon(lat: float, lng: float) -> Dict[str, Any]:
    half = 0.0001
    return {
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [lng - half, lat - half],
                    [lng + half, lat - half],
                    [lng + half, lat + half],
                    [lng - half, lat + half],
                    [lng - half, lat - half],
                ]
            ],
        },
    }


def _encode_debug_image(image: np.ndarray, mask: np.ndarray) -> str:
    overlay = image.copy()
    overlay[mask] = (0, 255, 255)
    _, buffer = cv2.imencode(".png", overlay)
    return base64.b64encode(buffer.tobytes()).decode("utf-8")


def _load_model() -> SamPredictor:
    model_type = "vit_t"
    weights_path = os.path.join(os.path.dirname(__file__), "weights", "mobile_sam.pt")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = sam_model_registry[model_type](checkpoint=weights_path)
    model.to(device=device)
    model.eval()
    return SamPredictor(model)


PREDICTOR = _load_model()


def segment_roof(lat: float, lng: float, zoom: int = DEFAULT_ZOOM) -> Dict[str, Any]:
    image_bgr = _fetch_static_image(lat, lng, zoom)
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    PREDICTOR.set_image(image_rgb)

    center = np.array([[IMAGE_SIZE / 2.0, IMAGE_SIZE / 2.0]])
    labels = np.array([1])
    masks, scores, _ = PREDICTOR.predict(
        point_coords=center,
        point_labels=labels,
        multimask_output=True,
    )

    center_x = int(IMAGE_SIZE / 2)
    center_y = int(IMAGE_SIZE / 2)
    best_idx = None
    best_score = -1.0
    for idx, score in enumerate(scores):
        if masks[idx][center_y, center_x] and float(score) > best_score:
            best_score = float(score)
            best_idx = idx

    if best_idx is None:
        best_idx = int(np.argmax(scores))

    best_mask = masks[best_idx]
    pixel_area = int(np.sum(best_mask))
    mpp = _meters_per_pixel(lat, zoom)
    area_sqm = pixel_area * (mpp ** 2)

    polygon = _mask_to_polygon(best_mask, lat, lng, zoom)
    debug_image = _encode_debug_image(image_bgr, best_mask)

    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return {
        "roof_area_sqm": area_sqm,
        "polygon": polygon,
        "debug_image": debug_image,
    }
