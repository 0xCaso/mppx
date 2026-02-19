---
"mppx": minor
---

- **`mpp/proxy` (Breaking):** Renamed `/services*` discovery routes to `/discover*`.
- `mpp/proxy`: Simplified `llms.txt` to a brief service overview, linking each service to `/discover/<id>`.
- `mpp/proxy`: Added `/discover` and `/discover/<id>` endpoints with content negotiation (JSON by default, markdown for `Accept: text/markdown`/`text/plain` or bot/CLI user agents).
- `mpp/proxy`: Added `.md` extension variants (`/discover.md`, `/discover/<id>.md`) for explicit markdown.
- `mpp/proxy`: Added `/discover/all` for full markdown listing with route details.