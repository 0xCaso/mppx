---
"mppx": patch
---

Added `closeRequestedAt` check in session voucher handler with configurable `channelStateTtl` (default: 60s). Prevented payers from using a channel after initiating a forced close.
