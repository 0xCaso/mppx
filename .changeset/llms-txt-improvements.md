---
"mppx": patch
---

- Simplified `llms.txt` to a brief service overview, linking each service to `/services/<id>`.
- Added `/services.md` and `/services/<id>.md` markdown endpoints with full route details.
- Added `Accept: text/markdown` / `text/plain` content negotiation on `/services` and `/services/<id>`.
- Auto-detect AI bots (GPTBot, ClaudeBot, etc.) and CLI tools (curl, wget, HTTPie) via `User-Agent` to serve markdown.
