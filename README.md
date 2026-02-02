# Summary

**Website health status:** <!-- URL_STATUS -->🟢 Up<!-- /URL_STATUS -->

Framework-free personal site (plain HTML/CSS) deployed via GitHub Pages.

## Site

Static files live in `site/`.

## Deployment

Deployment is handled by GitHub Actions and publishes `site/` to GitHub Pages.

## Status panel (hourly)

The homepage shows a simple "Operational / Degraded / Down" status derived from a small set of public endpoints.

URLs are kept private via GitHub Actions Secrets and are never committed to the repo.

Set the following repository secrets:

- `STATUS_AUTH_URL`
- `STATUS_GRAFANA_URL`
- `STATUS_N8N_URL`
- `STATUS_SEARXNG_URL`
- `STATUS_IMMICH_URL`
