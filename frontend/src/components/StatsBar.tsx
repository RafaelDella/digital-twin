import type { Incident, NetworkStats } from '../types';

interface Props {
  incidents: Incident[];
  networkStats: NetworkStats | null;
}

export default function StatsBar({ incidents, networkStats }: Props) {
  const counts = {
    accident: incidents.filter((i) => i.type === 'accident').length,
    construction: incidents.filter((i) => i.type === 'construction').length,
    flooding: incidents.filter((i) => i.type === 'flooding').length,
    blocked_road: incidents.filter((i) => i.type === 'blocked_road').length,
    heavy_traffic: incidents.filter((i) => i.type === 'heavy_traffic').length,
  };

  const critical = incidents.filter((i) => i.severity === 'critical').length;

  return (
    <div id="stats-bar" className="glass-bar">
      <div className="stat-item">
        <span className="stat-number">{incidents.length}</span>
        <span className="stat-label">Incidentes</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-number critical">{critical}</span>
        <span className="stat-label">Críticos</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-number">💥 {counts.accident}</span>
        <span className="stat-label">Acidentes</span>
      </div>
      <div className="stat-item">
        <span className="stat-number">🚧 {counts.construction}</span>
        <span className="stat-label">Obras</span>
      </div>
      <div className="stat-item">
        <span className="stat-number">🌊 {counts.flooding}</span>
        <span className="stat-label">Alagamentos</span>
      </div>
      <div className="stat-item">
        <span className="stat-number">🚗 {counts.heavy_traffic}</span>
        <span className="stat-label">Congestionamento</span>
      </div>
      {networkStats && (
        <>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number network">{networkStats.num_nodes.toLocaleString()}</span>
            <span className="stat-label">Nós</span>
          </div>
          <div className="stat-item">
            <span className="stat-number network">{networkStats.num_edges.toLocaleString()}</span>
            <span className="stat-label">Segmentos</span>
          </div>
        </>
      )}
    </div>
  );
}
