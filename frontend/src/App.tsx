import { useState, useCallback, useEffect } from 'react';
import MapView from './components/MapView';
import IncidentPanel from './components/IncidentPanel';
import SimulationPanel from './components/SimulationPanel';
import DisasterPanel from './components/DisasterPanel';
import StatsBar from './components/StatsBar';
import { useWebSocket } from './hooks/useWebSocket';
import { fetchJSON } from './services/api';
import type { Incident, SimulationResult, NetworkStats } from './types';
import './App.css';

// Default center: Curitiba, Paraná
const DEFAULT_CENTER: [number, number] = [-25.4284, -49.2733];

type ClickMode = string | null;

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [roadNetwork, setRoadNetwork] = useState<GeoJSON.FeatureCollection | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [clickMode, setClickMode] = useState<ClickMode>(null);
  const [activeTab, setActiveTab] = useState<'incidents' | 'simulation' | 'disasters'>('incidents');
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [graphLoading, setGraphLoading] = useState(true);

  const handleIncidentsChange = useCallback((newIncidents: Incident[]) => {
    setIncidents(newIncidents);
  }, []);

  const { connected } = useWebSocket(handleIncidentsChange);

  // Load road network + stats on mount (retry until backend is ready)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stats = await fetchJSON<NetworkStats>('/network/stats');
        if (cancelled) return;
        setNetworkStats(stats);
        if (stats.center) setCenter([stats.center[0], stats.center[1]]);
        const geo = await fetchJSON<GeoJSON.FeatureCollection>('/network/geojson');
        if (cancelled) return;
        setRoadNetwork(geo);
        setGraphLoading(false);
      } catch {
        // Backend may still be loading the graph — retry in 5s
        if (!cancelled) setTimeout(load, 5000);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (clickMode && ['origin', 'destination', 'block_start', 'block_end'].includes(clickMode) && (window as any).__simPanelSetPoint) {
        (window as any).__simPanelSetPoint(lat, lng);
      } else if (clickMode && clickMode.startsWith('spawn') && (window as any).__disasterPanelSetPoint) {
        (window as any).__disasterPanelSetPoint(lat, lng);
      }
    },
    [clickMode]
  );

  const handleResolve = useCallback(async (id: string) => {
    try {
      await fetchJSON(`/incidents/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      console.error('Error resolving:', err);
    }
  }, []);

  return (
    <div id="app-root">
      {/* Header */}
      <header id="app-header">
        <div className="header-brand">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="url(#grad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="grad" x1="2" y1="2" x2="22" y2="22">
                  <stop stopColor="#00e5ff" />
                  <stop offset="1" stopColor="#7c4dff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>Urban Digital Twin</h1>
          <span className="header-sub">Traffic Intelligence Platform</span>
        </div>
        <div className="header-status">
          {graphLoading && (
            <span className="loading-badge">
              <span className="spinner" /> Carregando malha viária…
            </span>
          )}
          <span className={`ws-badge ${connected ? 'online' : 'offline'}`}>
            {connected ? '● Live' : '○ Offline'}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div id="main-layout">
        {/* Sidebar */}
        <aside id="sidebar">
          <nav className="sidebar-tabs">
            <button
              className={activeTab === 'incidents' ? 'active' : ''}
              onClick={() => setActiveTab('incidents')}
            >
              🔴 Incidentes
            </button>
            <button
              className={activeTab === 'simulation' ? 'active' : ''}
              onClick={() => setActiveTab('simulation')}
            >
              🧪 Simulação
            </button>
            <button
              className={activeTab === 'disasters' ? 'active' : ''}
              onClick={() => setActiveTab('disasters')}
            >
              ⚠️ Desastres
            </button>
          </nav>
          <div className="sidebar-content">
            {activeTab === 'incidents' && (
              <IncidentPanel
                incidents={incidents}
                connected={connected}
                onResolve={handleResolve}
              />
            )}
            {activeTab === 'simulation' && (
              <SimulationPanel
                onSimulationResult={setSimulationResult}
                onClickModeChange={setClickMode}
                clickMode={clickMode}
              />
            )}
            {activeTab === 'disasters' && (
              <DisasterPanel
                onClickModeChange={setClickMode}
                clickMode={clickMode}
              />
            )}
          </div>
        </aside>

        {/* Map */}
        <main id="map-area">
          <MapView
            incidents={incidents}
            roadNetwork={roadNetwork}
            simulationResult={simulationResult}
            center={center}
            onMapClick={handleMapClick}
          />
          {clickMode && (
            <div className="map-overlay-hint">
              Clique no mapa para selecionar o ponto
            </div>
          )}
        </main>
      </div>

      {/* Bottom stats */}
      <StatsBar incidents={incidents} networkStats={networkStats} />
    </div>
  );
}

export default App;
