---
"mppx": patch
---

Added expiration check on credentials in the core handler. Expired credentials are now rejected with `PaymentExpiredError` instead of being processed.
