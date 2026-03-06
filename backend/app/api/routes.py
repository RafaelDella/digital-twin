"""
API routes for the Digital Twin backend.
Includes REST endpoints and WebSocket for real-time incident streaming.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from ..models.schemas import (
    Incident,
    SimulationRequest,
    SimulationResult,
    NetworkStats,
)
from ..simulation.engine import traffic_graph
import json
import asyncio
import time

router = APIRouter()

# ── In-memory stores ──────────────────────────────────────────────────
active_incidents: list[Incident] = []
connected_clients: list[WebSocket] = []


# ── Broadcast helper ──────────────────────────────────────────────────
async def broadcast(message: dict):
    """Send a JSON message to every connected WebSocket client."""
    dead = []
    payload = json.dumps(message)
    for ws in connected_clients:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connected_clients.remove(ws)


# ── REST endpoints ────────────────────────────────────────────────────
@router.get("/network/stats", response_model=NetworkStats)
async def get_network_stats():
    stats = traffic_graph.stats()
    if not stats:
        raise HTTPException(503, "Road network not loaded yet")
    return stats


@router.get("/network/geojson")
async def get_network_geojson():
    """Return the full road network as GeoJSON for the map layer."""
    return traffic_graph.edges_geojson()


@router.get("/incidents", response_model=list[Incident])
async def get_incidents():
    return [i for i in active_incidents if i.active]


@router.post("/incidents", response_model=Incident, status_code=201)
async def create_incident(incident: Incident):
    active_incidents.append(incident)
    await broadcast({
        "type": "incident_new",
        "data": incident.model_dump(),
    })
    return incident


@router.delete("/incidents/{incident_id}")
async def resolve_incident(incident_id: str):
    for inc in active_incidents:
        if inc.id == incident_id:
            inc.active = False
            await broadcast({
                "type": "incident_resolved",
                "data": {"id": incident_id},
            })
            return {"status": "resolved"}
    raise HTTPException(404, "Incident not found")


@router.post("/simulate", response_model=SimulationResult)
async def run_simulation(req: SimulationRequest):
    """Run a traffic simulation with optional road closures."""
    blocked = [
        ((rb.start_lat, rb.start_lng), (rb.end_lat, rb.end_lng))
        for rb in req.blocked_roads
    ]
    try:
        result = traffic_graph.simulate(
            origin=(req.origin_lat, req.origin_lng),
            destination=(req.destination_lat, req.destination_lng),
            blocked_segments=blocked,
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    return result


# ── WebSocket ─────────────────────────────────────────────────────────
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    # Send current incidents on connect
    await websocket.send_text(json.dumps({
        "type": "snapshot",
        "data": [i.model_dump() for i in active_incidents if i.active],
    }))
    try:
        while True:
            # Keep connection alive; client can also push messages
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
