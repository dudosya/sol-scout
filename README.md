Sol-Scout is a Next.js frontend for a solar feasibility demo. It renders a Mapbox map, supports manual polygon drawing, and calculates metrics from the selected roof area. The backend API is optional for demo mode.

## Requirements

- Node.js 18+
- Mapbox token

## Setup

Create .env.local:

NEXT_PUBLIC_MAPBOX_TOKEN=your_token
NEXT_PUBLIC_API_URL=http://localhost:8000

Install and run:

npm install
npm run dev

Open http://localhost:3000.

## Usage

- Click the map to place a marker and fly to the location.
- Use Manual Draw Polygon to add points, then Finish to compute area and metrics.
- Analyze Rooftop calls the backend if manual mode is not active. If the backend is unreachable, it falls back to mock data.

## Notes

- Metrics use fixed demo constants for irradiance, efficiency, and costs.
- Manual polygon area is computed from the drawn geometry.
