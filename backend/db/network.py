"""
Static Delhi NCR road network — 15 segments with real-ish lat/lng geometry.
Coordinates are drawn from the design's mock network and extended to 15 segments.
Shared by the seed script, the heatmap endpoint, and route building.
"""

# Each entry: name, code, type, length_km, lanes, speed_limit_kmh, geometry [[lat,lng], ...]
SEGMENTS: list[dict] = [
    {
        "name": "MG Road Corridor", "code": "45623", "segment_type": "corridor",
        "length_km": 8.4, "lanes": 6, "speed_limit_kmh": 50,
        "geometry": [
            [28.4640, 77.0830], [28.4770, 77.1010], [28.4820, 77.1190],
            [28.4830, 77.1380], [28.4790, 77.1550],
        ],
    },
    {
        "name": "Ring Road North", "code": "31564", "segment_type": "arterial",
        "length_km": 11.2, "lanes": 6, "speed_limit_kmh": 60,
        "geometry": [
            [28.7080, 77.1410], [28.7140, 77.1730], [28.7080, 77.2090],
            [28.6900, 77.2390], [28.6650, 77.2570],
        ],
    },
    {
        "name": "NH-48 Gurgaon", "code": "34654", "segment_type": "highway",
        "length_km": 19.6, "lanes": 8, "speed_limit_kmh": 80,
        "geometry": [
            [28.5912, 77.1610], [28.5680, 77.1320], [28.5380, 77.1010],
            [28.5060, 77.0740], [28.4830, 77.0540], [28.4570, 77.0370],
            [28.4300, 77.0240],
        ],
    },
    {
        "name": "DND Flyway", "code": "21209", "segment_type": "highway",
        "length_km": 9.2, "lanes": 8, "speed_limit_kmh": 70,
        "geometry": [
            [28.5680, 77.2630], [28.5570, 77.2920], [28.5450, 77.3120],
            [28.5330, 77.3320],
        ],
    },
    {
        "name": "Noida Expressway", "code": "55831", "segment_type": "highway",
        "length_km": 24.5, "lanes": 6, "speed_limit_kmh": 100,
        "geometry": [
            [28.5330, 77.3320], [28.5170, 77.3470], [28.4970, 77.3620],
            [28.4750, 77.3750], [28.4530, 77.3870],
        ],
    },
    {
        "name": "Inner Ring Road", "code": "10472", "segment_type": "arterial",
        "length_km": 18.8, "lanes": 6, "speed_limit_kmh": 60,
        "geometry": [
            [28.6358, 77.1810], [28.6470, 77.2050], [28.6340, 77.2350],
            [28.6080, 77.2520], [28.5810, 77.2630], [28.5520, 77.2710],
            [28.5260, 77.2530], [28.5180, 77.2210], [28.5300, 77.1850],
            [28.5510, 77.1620], [28.5780, 77.1500], [28.6080, 77.1480],
            [28.6300, 77.1610], [28.6358, 77.1810],
        ],
    },
    {
        "name": "Eastern Peripheral Expressway", "code": "60219", "segment_type": "highway",
        "length_km": 27.1, "lanes": 6, "speed_limit_kmh": 100,
        "geometry": [
            [28.6080, 77.2520], [28.5970, 77.2980], [28.5740, 77.3290],
        ],
    },
    {
        "name": "Outer Ring Road South", "code": "22910", "segment_type": "arterial",
        "length_km": 14.3, "lanes": 6, "speed_limit_kmh": 60,
        "geometry": [
            [28.5260, 77.2530], [28.5180, 77.2210], [28.5300, 77.1850],
            [28.5510, 77.1620],
        ],
    },
    {
        "name": "IFFCO Chowk Junction", "code": "33781", "segment_type": "junction",
        "length_km": 1.2, "lanes": 8, "speed_limit_kmh": 40,
        "geometry": [
            [28.4720, 77.0720], [28.4730, 77.0760], [28.4745, 77.0800],
        ],
    },
    {
        "name": "Dhaula Kuan Junction", "code": "41560", "segment_type": "junction",
        "length_km": 1.6, "lanes": 8, "speed_limit_kmh": 40,
        "geometry": [
            [28.5880, 77.1580], [28.5912, 77.1610], [28.5940, 77.1650],
        ],
    },
    {
        "name": "Ashram Flyover", "code": "38204", "segment_type": "corridor",
        "length_km": 3.8, "lanes": 6, "speed_limit_kmh": 50,
        "geometry": [
            [28.5720, 77.2580], [28.5680, 77.2630], [28.5640, 77.2700],
        ],
    },
    {
        "name": "Sarita Vihar Arterial", "code": "29117", "segment_type": "arterial",
        "length_km": 6.5, "lanes": 4, "speed_limit_kmh": 50,
        "geometry": [
            [28.5330, 77.2880], [28.5280, 77.2960], [28.5240, 77.3050],
        ],
    },
    {
        "name": "Kalindi Kunj Bridge", "code": "47852", "segment_type": "corridor",
        "length_km": 4.2, "lanes": 4, "speed_limit_kmh": 50,
        "geometry": [
            [28.5450, 77.3120], [28.5380, 77.3180], [28.5320, 77.3230],
        ],
    },
    {
        "name": "Mehrauli-Gurgaon Road", "code": "51063", "segment_type": "arterial",
        "length_km": 12.9, "lanes": 4, "speed_limit_kmh": 50,
        "geometry": [
            [28.5180, 77.1850], [28.5050, 77.1620], [28.4900, 77.1400],
            [28.4790, 77.1180],
        ],
    },
    {
        "name": "Barapullah Elevated Road", "code": "36948", "segment_type": "highway",
        "length_km": 9.6, "lanes": 4, "speed_limit_kmh": 70,
        "geometry": [
            [28.5810, 77.2630], [28.5780, 77.2400], [28.5760, 77.2180],
            [28.5740, 77.2000],
        ],
    },
]


def segment_endpoints(geometry: list[list[float]]) -> tuple[float, float, float, float]:
    """Return (start_lat, start_lng, end_lat, end_lng) from a polyline."""
    start = geometry[0]
    end = geometry[-1]
    return start[0], start[1], end[0], end[1]
