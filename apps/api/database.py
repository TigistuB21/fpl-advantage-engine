import os
from typing import AsyncGenerator
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

# Load environment variables from .env file if available
load_dotenv()

DEFAULT_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/fpl_advantage_engine"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

# Create async SQLAlchemy 2.0 engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True to output raw SQL statements for debugging
    future=True,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(AsyncAttrs, DeclarativeBase):
    """Base class for all SQLAlchemy 2.0 models using AsyncAttrs and DeclarativeBase."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Async database session dependency for FastAPI endpoints or ETL workers.
    Ensures sessions are cleanly closed after processing.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
