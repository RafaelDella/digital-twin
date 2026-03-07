import { useState } from 'react';
import { fetchJSON } from '../services/api';
import type { Incident } from '../types';

interface Props {
  onClickModeChange: (mode: string | null) => void;
  clickMode: string | null;
}

export default function DisasterPanel({ onClickModeChange, clickMode }: Props) {
  const [type, setType] = useState<Incident['type']>('flooding');
  const [severity, setSeverity] = useState<Incident['severity']>('critical');
  const [description, setDescription] = useState('Alagamento severo reduzindo fluxo.');
  const [macroRadius] = useState(0.015); // Em graus
  const [loading, setLoading] = useState(false);

  // Called by App.tsx when map is clicked and we are in a spawn mode
  (window as any).__disasterPanelSetPoint = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      if (clickMode === 'spawn_disaster') {
        const payload = {
          latitude: lat,
          longitude: lng,
          type,
          severity,
          description,
        };
        await fetchJSON('/incidents', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else if (clickMode === 'spawn_macro') {
        // Gera 5 a 8 incidentes ao redor do ponto clicado
        const numIncidents = Math.floor(Math.random() * 4) + 5;
        for (let i = 0; i < numIncidents; i++) {
          const randLat = lat + (Math.random() - 0.5) * macroRadius;
          const randLng = lng + (Math.random() - 0.5) * macroRadius;
          
          await fetchJSON('/incidents', {
            method: 'POST',
            body: JSON.stringify({
              latitude: randLat,
              longitude: randLng,
              type,
              severity: Math.random() > 0.5 ? severity : 'high', // Varia severidade
              description: `[Macro] Espalhamento de: ${description}`,
            }),
          });
        }
      }
    } catch (err: any) {
      alert('Erro ao criar desastre: ' + err.message);
    } finally {
      onClickModeChange(null);
      setLoading(false);
    }
  };

  return (
    <div id="disaster-panel" className="glass-panel">
      <div className="panel-header">
        <h2>⚠️ Criar Desastres</h2>
      </div>

      <div className="sim-controls">
        <div className="form-group">
          <label>Tipo de Evento</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="flooding">🌊 Alagamento / Enchente</option>
            <option value="accident">💥 Acidente Grave</option>
            <option value="blocked_road">🚫 Bloqueio Total de Via</option>
            <option value="heavy_traffic">🚗 Congestionamento Anormal</option>
            <option value="construction">🚧 Obras de Emergência</option>
          </select>
        </div>

        <div className="form-group">
          <label>Severidade</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
            <option value="critical">🔴 Crítico (Impacto Alto)</option>
            <option value="high">🟠 Alto</option>
            <option value="medium">🟡 Médio</option>
            <option value="low">🔵 Baixo</option>
          </select>
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <input 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Ex: Rio transbordou na avenida principal..."
          />
        </div>

        <div className="sim-actions" style={{ flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          <button
            className={`sim-btn ${clickMode === 'spawn_disaster' ? 'active' : ''}`}
            onClick={() => onClickModeChange('spawn_disaster')}
            disabled={loading}
          >
            📍 Injetar Incidente Único no Mapa
          </button>
          
          <button
            className={`sim-btn ${clickMode === 'spawn_macro' ? 'active' : ''}`}
            onClick={() => onClickModeChange('spawn_macro')}
            disabled={loading}
            style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
          >
            🌪️ Disparar Evento Macro (Raio de Destruição)
          </button>
        </div>

        {clickMode && clickMode.startsWith('spawn') && (
          <p className="click-hint" style={{ marginTop: '12px' }}>
            {loading ? 'Injetando desastre no ambiente...' : 'Clique no mapa para escolher a localização do desastre!'}
          </p>
        )}
      </div>
    </div>
  );
}
