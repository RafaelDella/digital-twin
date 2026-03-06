"""
Graph-based traffic simulation engine.
Generates a synthetic road network for the MVP demo area
(Sé, São Paulo) and uses NetworkX for shortest-path / simulation.

When OSMnx is available AND the network can be downloaded, it will
use the real-world data. Otherwise it falls back to a procedural grid.
"""
import networkx as nx
import json
import math
import random
from pathlib import Path
from typing import Optional

CACHE_DIR = Path(__file__).parent.parent.parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# Center of Sé, São Paulo
CENTER_LAT = -23.5505
CENTER_LNG = -46.6333
GRID_SIZE = 20        # 20×20 grid ≈ 400 intersections
BLOCK_DEG = 0.0012    # ~130 m between intersections


class TrafficGraph:
    """Manages the road-network graph for simulation."""

    def __init__(self):
        self.G: Optional[nx.DiGraph] = None

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------
    def load(self, place: str | None = None, dist: int | None = None):
        """Try OSMnx first; fall back to procedural grid."""
        # Try real data
        try:
            import osmnx as ox
            place = place or "Sé, São Paulo, Brazil"
            dist = dist or 2000
            safe_name = place.replace(" ", "_").replace(",", "")
            cache_file = CACHE_DIR / f"graph_{safe_name}_{dist}.graphml"

            if cache_file.exists():
                G = ox.load_graphml(str(cache_file))
                print(f"[graph] Loaded cached graph from {cache_file.name}")
            else:
                print(f"[graph] Downloading road network for '{place}' (r={dist}m)…")
                G = ox.graph_from_address(place, dist=dist, network_type="drive")
                ox.save_graphml(G, str(cache_file))
                print(f"[graph] Saved cache: {cache_file.name}")

            G = ox.add_edge_speeds(G)
            G = ox.add_edge_travel_times(G)
            # Convert MultiDiGraph → DiGraph for simplicity
            self.G = nx.DiGraph(G)
            print(f"[graph] Real network: {self.G.number_of_nodes()} nodes, {self.G.number_of_edges()} edges")
            return
        except Exception as e:
            print(f"[graph] OSMnx unavailable or network error: {e}")
            print("[graph] Falling back to procedural grid…")

        # Procedural grid fallback
        self._generate_grid()

    def _generate_grid(self):
        """Generate a realistic-looking street grid around the city center."""
        G = nx.DiGraph()
        half = GRID_SIZE // 2
        random.seed(42)

        # Create nodes
        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                node_id = row * GRID_SIZE + col
                lat = CENTER_LAT + (row - half) * BLOCK_DEG + random.gauss(0, BLOCK_DEG * 0.08)
                lng = CENTER_LNG + (col - half) * BLOCK_DEG + random.gauss(0, BLOCK_DEG * 0.08)
                G.add_node(node_id, y=lat, x=lng)

        # Create edges (horizontal + vertical + some diagonals)
        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                nid = row * GRID_SIZE + col
                # Right
                if col < GRID_SIZE - 1:
                    rid = row * GRID_SIZE + col + 1
                    self._add_street(G, nid, rid, major=(row % 4 == 0))
                # Down
                if row < GRID_SIZE - 1:
                    did = (row + 1) * GRID_SIZE + col
                    self._add_street(G, nid, did, major=(col % 4 == 0))
                # Diagonal (sparse, simulates avenues)
                if row < GRID_SIZE - 1 and col < GRID_SIZE - 1 and (row + col) % 7 == 0:
                    diag = (row + 1) * GRID_SIZE + col + 1
                    self._add_street(G, nid, diag, major=True)

        self.G = G
        print(f"[graph] Procedural grid: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    @staticmethod
    def _add_street(G: nx.DiGraph, u: int, v: int, major: bool = False):
        u_data = G.nodes[u]
        v_data = G.nodes[v]
        dist = _haversine(u_data["y"], u_data["x"], v_data["y"], v_data["x"])
        speed = random.uniform(40, 60) if major else random.uniform(20, 35)
        tt = dist / (speed / 3.6) if speed > 0 else dist / 10
        name = "Av. Principal" if major else "Rua Local"
        highway = "primary" if major else "residential"

        # Bidirectional
        for a, b in [(u, v), (v, u)]:
            G.add_edge(a, b, length=dist, speed_kph=speed, travel_time=tt,
                       name=name, highway=highway)

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------
    def stats(self) -> dict:
        if self.G is None:
            return {}
        nodes = list(self.G.nodes(data=True))
        lats = [d["y"] for _, d in nodes]
        lngs = [d["x"] for _, d in nodes]
        return {
            "num_nodes": self.G.number_of_nodes(),
            "num_edges": self.G.number_of_edges(),
            "bounds": {
                "north": max(lats), "south": min(lats),
                "east": max(lngs), "west": min(lngs),
            },
            "center": [sum(lats) / len(lats), sum(lngs) / len(lngs)],
        }

    # ------------------------------------------------------------------
    # GeoJSON export
    # ------------------------------------------------------------------
    def edges_geojson(self) -> dict:
        if self.G is None:
            return {"type": "FeatureCollection", "features": []}
        features = []
        for u, v, data in self.G.edges(data=True):
            coords = []
            if "geometry" in data:
                coords = list(data["geometry"].coords)
            else:
                coords = [
                    (self.G.nodes[u]["x"], self.G.nodes[u]["y"]),
                    (self.G.nodes[v]["x"], self.G.nodes[v]["y"]),
                ]
            features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {
                    "name": data.get("name", ""),
                    "length": data.get("length", 0),
                    "speed_kph": data.get("speed_kph", 50),
                    "travel_time": data.get("travel_time", 0),
                    "highway": data.get("highway", ""),
                },
            })
        return {"type": "FeatureCollection", "features": features}

    # ------------------------------------------------------------------
    # Simulation
    # ------------------------------------------------------------------
    def simulate(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
        blocked_segments: list[tuple[tuple[float, float], tuple[float, float]]],
    ) -> dict:
        if self.G is None:
            raise RuntimeError("Graph not loaded")

        orig_node = self._nearest_node(origin[0], origin[1])
        dest_node = self._nearest_node(destination[0], destination[1])

        # Original route
        try:
            orig_route_nodes = nx.shortest_path(self.G, orig_node, dest_node, weight="travel_time")
        except nx.NetworkXNoPath:
            raise ValueError("No path found between origin and destination")

        orig_route_coords = self._nodes_to_coords(orig_route_nodes)
        orig_tt = self._route_travel_time(orig_route_nodes)

        # Build modified graph with blocked roads
        G_mod = self.G.copy()
        for seg_start, seg_end in blocked_segments:
            n1 = self._nearest_node(seg_start[0], seg_start[1])
            n2 = self._nearest_node(seg_end[0], seg_end[1])
            try:
                path_to_block = nx.shortest_path(G_mod, n1, n2, weight="length")
                for i in range(len(path_to_block) - 1):
                    u, v = path_to_block[i], path_to_block[i + 1]
                    if G_mod.has_edge(u, v):
                        G_mod.remove_edge(u, v)
                    if G_mod.has_edge(v, u):
                        G_mod.remove_edge(v, u)
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                continue

        # New route after blocking
        try:
            new_route_nodes = nx.shortest_path(G_mod, orig_node, dest_node, weight="travel_time")
        except nx.NetworkXNoPath:
            raise ValueError("No alternative path available after blocking road(s)")

        new_route_coords = self._nodes_to_coords(new_route_nodes)
        new_tt = self._route_travel_time_on(G_mod, new_route_nodes)

        # Impacted edges
        orig_edge_set = set(zip(orig_route_nodes[:-1], orig_route_nodes[1:]))
        new_edge_set = set(zip(new_route_nodes[:-1], new_route_nodes[1:]))
        extra_edges = new_edge_set - orig_edge_set
        impacted = []
        for u, v in extra_edges:
            c = [
                [self.G.nodes[u]["x"], self.G.nodes[u]["y"]],
                [self.G.nodes[v]["x"], self.G.nodes[v]["y"]],
            ]
            impacted.append(c)

        impact_pct = ((new_tt - orig_tt) / orig_tt * 100) if orig_tt > 0 else 0

        return {
            "original_route": orig_route_coords,
            "alternative_route": new_route_coords,
            "impacted_edges": impacted,
            "original_travel_time_s": round(orig_tt, 1),
            "new_travel_time_s": round(new_tt, 1),
            "impact_increase_pct": round(impact_pct, 1),
        }

    # -- helpers --
    def _nearest_node(self, lat: float, lng: float) -> int:
        best_node = None
        best_dist = float("inf")
        for n, d in self.G.nodes(data=True):
            dist = (d["y"] - lat) ** 2 + (d["x"] - lng) ** 2
            if dist < best_dist:
                best_dist = dist
                best_node = n
        return best_node

    def _nodes_to_coords(self, nodes: list) -> list[list[float]]:
        return [[self.G.nodes[n]["x"], self.G.nodes[n]["y"]] for n in nodes]

    def _route_travel_time(self, nodes: list) -> float:
        return self._route_travel_time_on(self.G, nodes)

    def _route_travel_time_on(self, G, nodes: list) -> float:
        tt = 0
        for i in range(len(nodes) - 1):
            u, v = nodes[i], nodes[i + 1]
            if G.has_edge(u, v):
                edge = G[u][v]
                tt += edge.get("travel_time", edge.get("length", 100) / 13.9)
            else:
                tt += 30
        return tt


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in metres between two lat/lng points."""
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Singleton
traffic_graph = TrafficGraph()
