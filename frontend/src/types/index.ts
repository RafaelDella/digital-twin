export interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  type: 'accident' | 'construction' | 'flooding' | 'blocked_road' | 'heavy_traffic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: number;
  active: boolean;
}

export interface RoadBlock {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  label: string;
}

export interface SimulationRequest {
  blocked_roads: RoadBlock[];
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
}

export interface SimulationResult {
  original_route: number[][];
  alternative_route: number[][];
  impacted_edges: number[][][];
  original_travel_time_s: number;
  new_travel_time_s: number;
  impact_increase_pct: number;
}

export interface NetworkStats {
  num_nodes: number;
  num_edges: number;
  bounds: { north: number; south: number; east: number; west: number };
  center: number[];
}

export type WSMessage =
  | { type: 'snapshot'; data: Incident[] }
  | { type: 'incident_new'; data: Incident }
  | { type: 'incident_resolved'; data: { id: string } }
  | { type: 'pong' };
