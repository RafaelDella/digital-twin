import { useState } from 'react';
import type { SimulationResult } from '../types';
import { fetchJSON } from '../services/api';

type ClickMode = 'origin' | 'destination' | 'block_start' | 'block_end' | null;

interface Props {
  onSimulationResult: (result: SimulationResult | null) => void;
  onClickModeChange: (mode: ClickMode) => void;
  clickMode: ClickMode;
}

export default function SimulationPanel({
  onSimulationResult,
  onClickModeChange,
  clickMode,
}: Props) {
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [blockStart, setBlockStart] = useState<[number, number] | null>(null);
  const [blockEnd, setBlockEnd] = useState<[number, number] | null>(null);
  const [blocks, setBlocks] = useState<
    { start_lat: number; start_lng: number; end_lat: number; end_lng: number; label: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Called by parent when map is clicked
  (window as any).__simPanelSetPoint = (lat: number, lng: number) => {
    if (clickMode === 'origin') {
      setOrigin([lat, lng]);
      onClickModeChange(null);
    } else if (clickMode === 'destination') {
      setDestination([lat, lng]);
      onClickModeChange(null);
    } else if (clickMode === 'block_start') {
      setBlockStart([lat, lng]);
      onClickModeChange('block_end');
    } else if (clickMode === 'block_end') {
      if (blockStart) {
        setBlocks((prev) => [
          ...prev,
          {
            start_lat: blockStart[0],
            start_lng: blockStart[1],
            end_lat: lat,
            end_lng: lng,
            label: `Bloqueio ${prev.length + 1}`,
          },
        ]);
        setBlockStart(null);
        setBlockEnd(null);
      }
      onClickModeChange(null);
    }
  };

  const runSimulation = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    try {
      const res = await fetchJSON<SimulationResult>('/simulate', {
        method: 'POST',
        body: JSON.stringify({
          origin_lat: origin[0],
          origin_lng: origin[1],
          destination_lat: destination[0],
          destination_lng: destination[1],
          blocked_roads: blocks,
        }),
      });
      setResult(res);
      onSimulationResult(res);
    } catch (err: any) {
      alert('Erro na simulação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSimulation = () => {
    setOrigin(null);
    setDestination(null);
    setBlocks([]);
    setBlockStart(null);
    setBlockEnd(null);
    setResult(null);
    onSimulationResult(null);
    onClickModeChange(null);
  };

  return (
    <div id="simulation-panel" className="glass-panel">
      <div className="panel-header">
        <h2>🧪 Simulação</h2>
      </div>

      <div className="sim-controls">
        {/* Origin / Destination */}
        <div className="sim-row">
          <button
            className={`sim-btn ${clickMode === 'origin' ? 'active' : ''}`}
            onClick={() => onClickModeChange('origin')}
          >
            📍 Origem
          </button>
          <span className="coord-display">
            {origin ? `${origin[0].toFixed(4)}, ${origin[1].toFixed(4)}` : '—'}
          </span>
        </div>
        <div className="sim-row">
          <button
            className={`sim-btn ${clickMode === 'destination' ? 'active' : ''}`}
            onClick={() => onClickModeChange('destination')}
          >
            🏁 Destino
          </button>
          <span className="coord-display">
            {destination
              ? `${destination[0].toFixed(4)}, ${destination[1].toFixed(4)}`
              : '—'}
          </span>
        </div>

        {/* Road blocks */}
        <div className="sim-row">
          <button
            className={`sim-btn ${clickMode === 'block_start' || clickMode === 'block_end' ? 'active' : ''}`}
            onClick={() => onClickModeChange('block_start')}
          >
            🚧 Bloquear Via
          </button>
          <span className="coord-display">{blocks.length} bloqueio(s)</span>
        </div>

        {clickMode && (
          <p className="click-hint">
            {clickMode === 'origin' && 'Clique no mapa para definir a ORIGEM'}
            {clickMode === 'destination' && 'Clique no mapa para definir o DESTINO'}
            {clickMode === 'block_start' && 'Clique no mapa: INÍCIO do bloqueio'}
            {clickMode === 'block_end' && 'Clique no mapa: FIM do bloqueio'}
          </p>
        )}

        {blocks.length > 0 && (
          <div className="block-list">
            {blocks.map((b, i) => (
              <div key={i} className="block-chip">
                🚧 {b.label}
                <button
                  className="chip-remove"
                  onClick={() => setBlocks((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="sim-actions">
          <button
            className="sim-run"
            disabled={!origin || !destination || loading}
            onClick={runSimulation}
          >
            {loading ? 'Simulando…' : '▶ Executar Simulação'}
          </button>
          <button className="sim-clear" onClick={clearSimulation}>
            Limpar
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="sim-results">
          <h3>Resultado</h3>
          <div className="result-grid">
            <div className="result-card">
              <span className="result-label">Rota Original</span>
              <span className="result-value cyan">{result.original_travel_time_s.toFixed(0)}s</span>
            </div>
            <div className="result-card">
              <span className="result-label">Rota Alternativa</span>
              <span className="result-value amber">{result.new_travel_time_s.toFixed(0)}s</span>
            </div>
            <div className="result-card wide">
              <span className="result-label">Impacto</span>
              <span className={`result-value ${result.impact_increase_pct > 30 ? 'red' : 'amber'}`}>
                +{result.impact_increase_pct.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="result-legend">
            <span className="legend-item"><span className="swatch cyan" /> Rota Original</span>
            <span className="legend-item"><span className="swatch amber" /> Rota Alternativa</span>
            <span className="legend-item"><span className="swatch red" /> Vias Impactadas</span>
          </div>
        </div>
      )}
    </div>
  );
}
