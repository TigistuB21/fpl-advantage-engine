"""
Verification Script for FastAPI Backend Endpoints
"""

import asyncio
import sys
import httpx
from main import app

# Reconfigure stdout for UTF-8 compatibility on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def test_fastapi_endpoints():
    print("=== TESTING FASTAPI BACKEND REST ENDPOINTS ===")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check endpoint
        res = await client.get("/api/v1/health")
        print(f"\n1. GET /api/v1/health -> Status: {res.status_code}")
        print(f"   Response: {res.json()}")
        assert res.status_code == 200

        # 2. Predictions endpoint
        res = await client.get("/api/v1/predictions?limit=5")
        print(f"\n2. GET /api/v1/predictions -> Status: {res.status_code}")
        data = res.json()
        print(f"   Fetched {data['count']} top predicted players:")
        for p in data['players']:
            print(f"   - #{p['player_id']} {p['web_name']} ({p['team_short']} | {p['element_type']}) - £{p['price_m']}m -> {p['predicted_xp']} xP")
        assert res.status_code == 200

        # 3. Latest Optimization endpoint
        res = await client.get("/api/v1/optimize/latest")
        print(f"\n3. GET /api/v1/optimize/latest -> Status: {res.status_code}")
        opt_data = res.json()
        print(f"   Optimal Squad Formation: {opt_data['formation']}")
        print(f"   Total Cost: £{opt_data['total_cost']}m  |  Total Expected Points: {opt_data['total_expected_points']}")
        print(f"   Starters Count: {len(opt_data['starting_11'])}  |  Bench Count: {len(opt_data['bench'])}")
        assert res.status_code == 200

        # 4. On-demand Optimize POST endpoint
        payload = {"budget": 98.5, "event_id": 1, "locked_player_ids": [], "excluded_player_ids": []}
        res = await client.post("/api/v1/optimize", json=payload)
        print(f"\n4. POST /api/v1/optimize (Custom Budget £98.5m) -> Status: {res.status_code}")
        custom_opt = res.json()
        print(f"   Optimal Squad Formation: {custom_opt['formation']}")
        print(f"   Total Cost: £{custom_opt['total_cost']}m / £98.5m  |  Total xP: {custom_opt['total_expected_points']}")
        assert res.status_code == 200

    print("\n✨ ALL FASTAPI BACKEND REST ENDPOINTS VERIFIED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_fastapi_endpoints())
