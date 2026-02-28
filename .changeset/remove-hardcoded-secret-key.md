---
"mppx": patch
---

Removed insecure hardcoded `'tmp'` fallback for `secretKey`. `Mppx.create()` now throws a clear error if neither `MPP_SECRET_KEY` env var nor explicit `secretKey` is provided.
