import { useEffect, useRef, useCallback, useState } from 'react';
import { createWebSocket } from '../services/api';
import type { Incident, WSMessage } from '../types';

export function useWebSocket(onIncidentsChange: (incidents: Incident[]) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const incidentsRef = useRef<Incident[]>([]);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = createWebSocket();
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      switch (msg.type) {
        case 'snapshot':
          incidentsRef.current = msg.data;
          onIncidentsChange([...incidentsRef.current]);
          break;
        case 'incident_new':
          incidentsRef.current.push(msg.data);
          onIncidentsChange([...incidentsRef.current]);
          break;
        case 'incident_resolved':
          incidentsRef.current = incidentsRef.current.filter(
            (i) => i.id !== msg.data.id
          );
          onIncidentsChange([...incidentsRef.current]);
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [onIncidentsChange]);

  useEffect(() => {
    connect();
    // Ping every 25s to keep alive
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
    return () => {
      clearInterval(interval);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
