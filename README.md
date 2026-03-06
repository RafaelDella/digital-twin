# 🌐 Urban Digital Twin – Traffic Intelligence Platform

Ambiente virtualizado (Digital Twin) de cidade para visualizar incidentes de trânsito em tempo real e simular cenários futuros.

![Stack](https://img.shields.io/badge/React-TypeScript-blue) ![Stack](https://img.shields.io/badge/FastAPI-Python-green) ![Stack](https://img.shields.io/badge/Deck.gl-3D%20Map-purple)

## Arquitetura

```
frontend/          → React + TypeScript + Vite + Deck.gl + MapLibre
backend/           → Python + FastAPI + OSMnx + NetworkX
  app/
    api/routes.py  → REST & WebSocket endpoints
    models/        → Pydantic schemas
    simulation/    → Motor de simulação de grafos viários
```

## Pré-requisitos

- **Node.js** ≥ 18
- **Python** ≥ 3.11
- **pip**

## Como Rodar

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Na primeira execução, o backend vai baixar automaticamente a malha viária
de São Paulo (centro, ~2 km de raio) via OpenStreetMap. Isso pode levar
~30 segundos. Depois disso, os dados ficam em cache local.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173 no navegador.

### 3. Gerador de dados mock (opcional)

Para popular o dashboard com incidentes simulados:

```bash
cd backend
pip install requests
python mock_incidents.py
```

## Funcionalidades

| Feature | Descrição |
|---|---|
| 🗺️ Mapa 3D | Malha viária real renderizada com Deck.gl em perspectiva 3D |
| 🔴 Incidentes em tempo real | WebSocket com push instantâneo de novos incidentes |
| 🧪 Simulador de cenários | Bloqueie vias no mapa e veja rotas alternativas + impacto |
| 📊 Painel de métricas | Contagem de incidentes por tipo e severidade |
