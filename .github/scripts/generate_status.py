#!/usr/bin/env python3

import json
import os
import time
import urllib.request
import urllib.error


def _env(name: str) -> str:
    v = os.environ.get(name)
    if v is None or not v.strip():
        raise RuntimeError(f"Missing required env var: {name}")
    return v.strip()


def check_url(url: str, timeout_s: float = 7.0) -> dict:
    """Check the status of a URL."""
    start = time.perf_counter()
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "timothybryantjr-site-status/1.0",
                "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            code = resp.getcode()
            ok = 200 <= int(code) < 400
    except urllib.error.HTTPError as e:
        code = int(getattr(e, "code", 0) or 0)
        ok = 200 <= code < 400
    except Exception:
        code = 0
        ok = False

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return {"ok": ok, "http": code, "ms": elapsed_ms}


def main() -> None:
    """Main function."""
    services = [
        {"id": "auth", "label": "auth", "env": "STATUS_AUTH_URL"},
        {"id": "grafana", "label": "grafana", "env": "STATUS_GRAFANA_URL"},
        {"id": "n8n", "label": "n8n", "env": "STATUS_N8N_URL"},
        {"id": "searxng", "label": "searxng", "env": "STATUS_SEARXNG_URL"},
        {"id": "immich", "label": "immich", "env": "STATUS_IMMICH_URL"},
    ]

    results = []
    for svc in services:
        url = _env(svc["env"])  # keep the URL out of the output
        r = check_url(url)
        results.append(
            {
                "id": svc["id"],
                "label": svc["label"],
                "ok": r["ok"],
                "http": r["http"],
                "ms": r["ms"],
            }
        )

    total = len(results)
    up = sum(r["ok"] for r in results)

    if up == total:
        overall = "operational"
    elif up == 0:
        overall = "down"
    else:
        overall = "degraded"

    availability_pct = round((up / total) * 100.0, 2)

    target_availability_pct = 99.95
    if availability_pct >= 99.0:
        budget = "Healthy"
    elif availability_pct >= 80.0:
        budget = "At risk"
    else:
        budget = "Burning"

    out = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "overall": overall,
        "services": results,
        "summary": {
            "up": up,
            "total": total,
            "availability_pct": availability_pct,
            "target_availability_pct": target_availability_pct,
            "error_budget": budget,
        },
    }

    os.makedirs("site", exist_ok=True)
    with open("site/status.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
