import { useState, useCallback, useMemo } from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import type { Incident, SimulationResult } from '../types';
import 'maplibre-gl/dist/maplibre-gl.css';

// Free map style (no token required)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const INCIDENT_COLORS: Record<string, [number, number, number, number]> = {
  accident: [255, 59, 48, 220],
  construction: [255, 149, 0, 220],
  flooding: [0, 122, 255, 220],
  blocked_road: [255, 45, 85, 220],
  heavy_traffic: [255, 204, 0, 220],
};

const SEVERITY_RADIUS: Record<string, number> = {
  low: 60,
  medium: 100,
  high: 160,
  critical: 240,
};

interface Props {
  incidents: Incident[];
  roadNetwork: GeoJSON.FeatureCollection | null;
  simulationResult: SimulationResult | null;
  center: [number, number];
  onMapClick?: (lat: number, lng: number) => void;
}

export default function MapView({
  incidents,
  roadNetwork,
  simulationResult,
  center,
  onMapClick,
}: Props) {
  const [viewState, setViewState] = useState({
    longitude: center[1],
    latitude: center[0],
    zoom: 14,
    pitch: 45,
    bearing: -17.6,
  });

  const handleClick = useCallback(
    (info: any) => {
      if (info.coordinate && onMapClick) {
        onMapClick(info.coordinate[1], info.coordinate[0]);
      }
    },
    [onMapClick]
  );

  const layers = useMemo(() => {
    const result: any[] = [];

    // Road network layer
    if (roadNetwork) {
      result.push(
        new GeoJsonLayer({
          id: 'road-network',
          data: roadNetwork,
          stroked: true,
          filled: false,
          lineWidthMinPixels: 1,
          getLineColor: [100, 180, 255, 120],
          getLineWidth: 2,
          pickable: false,
        })
      );
    }

    // Incidents – pulsing scatter
    if (incidents.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'incidents',
          data: incidents,
          getPosition: (d: Incident) => [d.longitude, d.latitude],
          getFillColor: (d: Incident) => INCIDENT_COLORS[d.type] || [255, 255, 255, 200],
          getRadius: (d: Incident) => SEVERITY_RADIUS[d.severity] || 80,
          radiusMinPixels: 6,
          radiusMaxPixels: 40,
          pickable: true,
          opacity: 0.85,
          stroked: true,
          getLineColor: [255, 255, 255, 160],
          lineWidthMinPixels: 1,
        })
      );
    }

    // Simulation layers
    if (simulationResult) {
      // Original route – cyan
      result.push(
        new GeoJsonLayer({
          id: 'original-route',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: simulationResult.original_route,
            },
            properties: {},
          },
          stroked: true,
          getLineColor: [0, 255, 200, 200],
          getLineWidth: 6,
          lineWidthMinPixels: 3,
        })
      );

      // Alternative route – amber
      result.push(
        new GeoJsonLayer({
          id: 'alt-route',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: simulationResult.alternative_route,
            },
            properties: {},
          },
          stroked: true,
          getLineColor: [255, 180, 0, 220],
          getLineWidth: 6,
          lineWidthMinPixels: 3,
        })
      );

      // Impacted edges – red
      if (simulationResult.impacted_edges.length > 0) {
        result.push(
          new LineLayer({
            id: 'impacted-edges',
            data: simulationResult.impacted_edges,
            getSourcePosition: (d: number[][]) => d[0],
            getTargetPosition: (d: number[][]) => d[1],
            getColor: [255, 50, 50, 220],
            getWidth: 5,
            widthMinPixels: 3,
          })
        );
      }
    }

    return result;
  }, [incidents, roadNetwork, simulationResult]);

  return (
    <div id="map-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
        controller={true}
        layers={layers}
        onClick={handleClick}
        getTooltip={({ object }: any) => {
          if (object && object.type) {
            return {
              html: `<div style="padding:8px;font-family:Inter,sans-serif">
                <strong style="text-transform:capitalize">${object.type.replace('_', ' ')}</strong><br/>
                Severity: <span style="color:${object.severity === 'critical' ? '#ff3b30' : '#ffcc00'}">${object.severity}</span><br/>
                ${object.description || ''}
              </div>`,
              style: {
                backgroundColor: 'rgba(15,15,25,0.92)',
                color: '#fff',
                borderRadius: '8px',
                border: '1px solid rgba(100,180,255,0.3)',
              },
            };
          }
          return null;
        }}
      >
        <Map mapStyle={MAP_STYLE} attributionControl={false}>
          <NavigationControl position="bottom-right" />
        </Map>
      </DeckGL>
    </div>
  );
}
