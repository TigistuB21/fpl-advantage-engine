from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Team(Base):
    """SQLAlchemy 2.0 Model for Premier League Teams."""
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    short_name: Mapped[str] = mapped_column(String(10), nullable=False)
    
    strength_overall_home: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    strength_overall_away: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    strength_attack_home: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    strength_attack_away: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    strength_defence_home: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    strength_defence_away: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship to Players
    players: Mapped[List["Player"]] = relationship(
        "Player", back_populates="team", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Team(id={self.id}, name='{self.name}', short_name='{self.short_name}')>"


class Player(Base):
    """SQLAlchemy 2.0 Model for FPL Players (Elements)."""
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    web_name: Mapped[str] = mapped_column(String(100), nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    second_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    element_type: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # 'GKP', 'DEF', 'MID', 'FWD'
    now_cost: Mapped[int] = mapped_column(Integer, nullable=False, index=True)  # Stored in 10ths (e.g. 150 = £15.0m)
    status: Mapped[str] = mapped_column(String(10), default="a", nullable=False)  # 'a', 'd', 'i', 's', 'u'
    selected_by_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    news: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship to Team
    team: Mapped["Team"] = relationship("Team", back_populates="players")
    predictions: Mapped[List["PlayerPrediction"]] = relationship(
        "PlayerPrediction", back_populates="player", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Player(id={self.id}, web_name='{self.web_name}', team_id={self.team_id}, cost=£{self.now_cost / 10.0}m)>"


class PlayerPrediction(Base):
    """SQLAlchemy 2.0 Model for Forecasted Expected Points (xP)."""
    __tablename__ = "player_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    predicted_xp: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0-heuristic")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship to Player
    player: Mapped["Player"] = relationship("Player", back_populates="predictions")

    def __repr__(self) -> str:
        return f"<PlayerPrediction(player_id={self.player_id}, event_id={self.event_id}, xP={self.predicted_xp})>"


class SquadOptimization(Base):
    """SQLAlchemy 2.0 Model for Optimal 15-Player Squad & Lineup Solutions."""
    __tablename__ = "squad_optimizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    total_budget: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    total_expected_points: Mapped[float] = mapped_column(Float, nullable=False)
    starting_11_ids: Mapped[List[int]] = mapped_column(JSON, nullable=False)
    bench_ids: Mapped[List[int]] = mapped_column(JSON, nullable=False)
    captain_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False)
    vice_captain_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False)
    formation: Mapped[str] = mapped_column(String(10), nullable=False, default="3-4-3")
    parameters: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<SquadOptimization(event_id={self.event_id}, formation='{self.formation}', total_xP={self.total_expected_points})>"
