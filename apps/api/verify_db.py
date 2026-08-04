"""
FPL Advantage Engine - Database Verification Script
Queries PostgreSQL using SQLAlchemy 2.0 to verify teams and players records.
"""

import asyncio
import sys
from sqlalchemy import select, func
from database import AsyncSessionLocal
from models import Team, Player

# Reconfigure stdout for UTF-8 compatibility on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def verify_database():
    async with AsyncSessionLocal() as session:
        # 1. Total counts
        team_count = await session.scalar(select(func.count(Team.id)))
        player_count = await session.scalar(select(func.count(Player.id)))

        print("=== POSTGRESQL DATABASE VERIFICATION ===")
        print(f"Total Teams in Database:   {team_count}")
        print(f"Total Players in Database: {player_count}")
        print("-" * 60)

        # 2. Sample 5 most expensive players across positions
        print("\n--- SAMPLE: 5 MOST EXPENSIVE PLAYERS IN DATABASE ---")
        stmt = (
            select(Player, Team.name.label("team_name"))
            .join(Team, Player.team_id == Team.id)
            .order_by(Player.now_cost.desc())
            .limit(5)
        )
        results = await session.execute(stmt)

        print(f"{'ID':<6} {'Name':<20} {'Team':<16} {'Pos':<6} {'Price':<8}")
        print("-" * 60)
        for player, team_name in results:
            price_m = player.now_cost / 10.0
            print(f"{player.id:<6} {player.web_name:<20} {team_name:<16} {player.element_type:<6} £{price_m:.1f}m")

        print("-" * 60)


if __name__ == "__main__":
    asyncio.run(verify_database())
