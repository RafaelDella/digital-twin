import type { Incident } from '../types';

const TYPE_ICONS: Record<string, string> = {
  accident: '💥',
  construction: '🚧',
  flooding: '🌊',
  blocked_road: '🚫',
  heavy_traffic: '🚗',
};

const SEVERITY_BADGE: Record<string, string> = {
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
  critical: 'badge-critical',
};

interface Props {
  incidents: Incident[];
  connected: boolean;
  onResolve: (id: string) => void;
}

export default function IncidentPanel({ incidents, connected, onResolve }: Props) {
  return (
    <div id="incident-panel" className="glass-panel">
      <div className="panel-header">
        <h2>
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          Incidentes Ativos
        </h2>
        <span className="counter">{incidents.length}</span>
      </div>
      <div className="incident-list">
        {incidents.length === 0 && (
          <p className="empty-msg">Nenhum incidente ativo</p>
        )}
        {incidents.map((inc) => (
          <div key={inc.id} className={`incident-card severity-${inc.severity}`}>
            <div className="incident-icon">{TYPE_ICONS[inc.type] || '⚠️'}</div>
            <div className="incident-info">
              <span className="incident-type">{inc.type.replace('_', ' ')}</span>
              <span className={`badge ${SEVERITY_BADGE[inc.severity]}`}>
                {inc.severity}
              </span>
              {inc.description && (
                <p className="incident-desc">{inc.description}</p>
              )}
              <span className="incident-coords">
                {inc.latitude.toFixed(5)}, {inc.longitude.toFixed(5)}
              </span>
            </div>
            <button
              className="btn-resolve"
              onClick={() => onResolve(inc.id)}
              title="Resolver incidente"
            >
              ✓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
