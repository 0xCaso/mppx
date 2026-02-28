---
"mppx": patch
---

Added token address validation in `broadcastTopUpTransaction` fee-payer logic. Prevented approve calls to arbitrary contracts in fee-sponsored topUp transactions.
