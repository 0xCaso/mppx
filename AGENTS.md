# mpay

TypeScript implementation of the "Payment" HTTP Authentication Scheme (402 Protocol).

## Purpose

mpay provides server-side abstractions for implementing payment-gated HTTP resources using HTTP 402 "Payment Required". It enables:

- Defining payment **intents** (charge, authorize, subscription) with type-safe schemas
- Validating payment **challenges** (WWW-Authenticate request data)
- Verifying payment **credentials** (Authorization header payloads)
- Generating **receipts** for successful payments

The library is payment-method agnostic—the core abstractions work with any registered payment method (Tempo, Stripe, etc.) through schema-based validation.

## Commands

```bash
pnpm build          # Build with zile
pnpm check          # Lint and format with biome
pnpm check:types    # TypeScript type checking
pnpm test           # Run tests with vitest
```

## Skills Reference

Load these skills for specialized guidance:

### `402-spec`

**Use when**: Implementing payment intents, understanding the 402 protocol flow, working with Tempo/Stripe payment method schemas.

### `tooling-engineering`

**Use when**: Building new modules, writing tests, following library patterns.

### `tempo-developer`

**Use when**: Referencing Tempo protocol specifics, understanding TIP-20 tokens, Tempo transactions (0x76), or protocol-level details.
