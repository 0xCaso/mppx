---
"mppx": patch
---

Fixed `Client.getResolver` to inject Tempo serializers onto clients missing them, preventing the default serializer from rejecting Tempo-specific transaction fields.
