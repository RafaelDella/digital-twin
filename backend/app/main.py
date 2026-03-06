"""
FastAPI application entry-point for the Digital Twin backend.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router
from .simulation.engine import traffic_graph
import threading


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the road-network graph in a background thread on startup."""
    def _load():
        traffic_graph.load()
    t = threading.Thread(target=_load, daemon=True)
    t.start()
    yield


app = FastAPI(
    title="Digital Twin – Traffic Simulation API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS – allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "graph_loaded": traffic_graph.G is not None}
