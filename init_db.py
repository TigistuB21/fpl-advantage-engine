"""
FPL Advantage Engine - Database Initialization Script
Uses SQLAlchemy 2.0 Async Engine to create the database if missing and create all tables in models.py.
"""

import asyncio
import sys
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine
from database import engine, Base, DATABASE_URL
import models  # Ensures models (Team, Player) are registered with Base.metadata

# Reconfigure stdout for clean UTF-8 printing on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def ensure_database_exists():
    """Checks if target database exists in PostgreSQL, creating it if necessary."""
    if "@" in DATABASE_URL and "/" in DATABASE_URL.rsplit("@", 1)[1]:
        base_part, db_name = DATABASE_URL.rsplit("/", 1)
        db_name = db_name.split("?")[0]
        
        postgres_db_url = f"{base_part}/postgres"
        asyncpg_url = postgres_db_url.replace("postgresql+asyncpg://", "postgres://")

        try:
            conn = await asyncpg.connect(asyncpg_url)
            db_exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1", db_name
            )
            if not db_exists:
                print(f"Database '{db_name}' not found. Creating database...")
                await conn.execute(f'CREATE DATABASE "{db_name}"')
                print(f"Database '{db_name}' created successfully!")
            await conn.close()
        except Exception as e:
            print(f"Notice during database check: {e}")


async def init_tables():
    await ensure_database_exists()

    print("Connecting to PostgreSQL and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("Database tables created successfully!")


if __name__ == "__main__":
    asyncio.run(init_tables())
