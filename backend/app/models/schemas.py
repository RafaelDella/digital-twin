"""Pydantic models for the Digital Twin API."""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
import time
import uuid


class IncidentType(str, Enum):
    ACCIDENT = "accident"
    CONSTRUCTION = "construction"
    FLOODING = "flooding"
    BLOCKED_ROAD = "blocked_road"
    HEAVY_TRAFFIC = "heavy_traffic"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Incident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    latitude: float
    longitude: float
    type: IncidentType
    severity: Severity
    description: str = ""
    timestamp: float = Field(default_factory=time.time)
    active: bool = True


class RoadBlock(BaseModel):
    """Represents a road segment to block/restrict for simulation."""
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    label: str = ""


class SimulationRequest(BaseModel):
    """Request body for running a traffic simulation scenario."""
    blocked_roads: list[RoadBlock] = []
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float


class SimulationResult(BaseModel):
    """Result of a traffic simulation."""
    original_route: list[list[float]]  # [[lng, lat], ...]
    alternative_route: list[list[float]]
    impacted_edges: list[list[list[float]]]  # segments that receive extra load
    original_travel_time_s: float
    new_travel_time_s: float
    impact_increase_pct: float


class NetworkStats(BaseModel):
    """Stats about the loaded road network."""
    num_nodes: int
    num_edges: int
    bounds: dict  # {north, south, east, west}
    center: list[float]  # [lat, lng]
