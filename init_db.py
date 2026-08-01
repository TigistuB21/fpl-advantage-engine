"""
FPL Advantage Engine - Async Database Initialization Script
"""

import asyncio
import sys
from sqlalchemy import text
from database import engine, Base
import models  # Ensures all ORM models are registered with Base.metadata

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def init_db():
    print("Connecting to PostgreSQL and updating tables...")
    async with engine.begin() as conn:
        # Drop existing tables to update schema with underlying stats columns
        await conn.execute(text("DROP TABLE IF EXISTS player_predictions, squad_optimizations, players, teams CASCADE;"))
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables updated successfully!")


if __name__ == "__main__":
    asyncio.run(init_db())
