"""
Mock incident generator – sends fake traffic incidents to the API
every few seconds so you can test the real-time dashboard.
Run:  python mock_incidents.py
"""
import requests
import random
import time

API = "http://localhost:8000/api"

# Approximate bounds of Sé, São Paulo downtown
LAT_MIN, LAT_MAX = -23.560, -23.540
LNG_MIN, LNG_MAX = -46.645, -46.625

TYPES = ["accident", "construction", "flooding", "blocked_road", "heavy_traffic"]
SEVERITIES = ["low", "medium", "high", "critical"]
DESCRIPTIONS = [
    "Colisão entre dois veículos",
    "Obra na via – faixa interditada",
    "Alagamento parcial na pista",
    "Via totalmente bloqueada por manifestação",
    "Trânsito intenso – velocidade média de 5 km/h",
    "Semáforo com defeito",
    "Veículo quebrado na faixa da direita",
    "Acidente com vítima – SAMU acionado",
    "Buraco na pista",
    "Queda de árvore",
]


def random_incident():
    return {
        "latitude": random.uniform(LAT_MIN, LAT_MAX),
        "longitude": random.uniform(LNG_MIN, LNG_MAX),
        "type": random.choice(TYPES),
        "severity": random.choice(SEVERITIES),
        "description": random.choice(DESCRIPTIONS),
    }


def main():
    print("🚦 Mock incident generator started")
    print(f"   Sending to {API}/incidents\n")
    created_ids: list[str] = []

    while True:
        # 70% chance to create, 30% to resolve an existing one
        if random.random() < 0.7 or len(created_ids) == 0:
            inc = random_incident()
            try:
                r = requests.post(f"{API}/incidents", json=inc, timeout=5)
                data = r.json()
                created_ids.append(data["id"])
                print(
                    f"[+] Created {data['type']:15s} | {data['severity']:8s} | "
                    f"{data['latitude']:.5f}, {data['longitude']:.5f}"
                )
            except Exception as e:
                print(f"[!] Error creating: {e}")
        else:
            # Resolve a random existing incident
            rid = random.choice(created_ids)
            try:
                requests.delete(f"{API}/incidents/{rid}", timeout=5)
                created_ids.remove(rid)
                print(f"[-] Resolved incident {rid[:8]}…")
            except Exception as e:
                print(f"[!] Error resolving: {e}")

        time.sleep(random.uniform(2.0, 6.0))


if __name__ == "__main__":
    main()
