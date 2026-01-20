---
name: 402-spec
description: The "Payment" HTTP Authentication Scheme specification and payment method implementations. Use when implementing payment intents, understanding the 402 protocol flow, or working with Tempo/Stripe payment methods.
---

# The "Payment" HTTP Authentication Scheme

This skill covers the 402 payment protocol specification and its payment method implementations. The specs define how HTTP resources can require payment before access using HTTP 402 "Payment Required".

## Protocol Overview

The Payment authentication scheme enables HTTP resources to require payment challenges:

```
Client                                            Server
   │                                                 │
   │  (1) GET /resource                              │
   ├────────────────────────────────────────────────>│
   │                                                 │
   │  (2) 402 Payment Required                       │
   │      WWW-Authenticate: Payment id="..",         │
   │        method="..", intent="..", request=".."   │
   │<────────────────────────────────────────────────┤
   │                                                 │
   │  (3) Client handles payment challenge           │
   │      (signs transaction, pays invoice, etc.)    │
   │                                                 │
   │  (4) GET /resource                              │
   │      Authorization: Payment <credential>        │
   ├────────────────────────────────────────────────>│
   │                                                 │
   │  (5) Server verifies and settles                │
   │                                                 │
   │  (6) 200 OK                                     │
   │      Payment-Receipt: <receipt>                 │
   │<────────────────────────────────────────────────┤
```

## Key Concepts

### Payment Challenge (WWW-Authenticate)

Server issues a challenge with required parameters:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `id` | Yes | Unique challenge identifier (128+ bits entropy) |
| `realm` | Yes | Protection space identifier |
| `method` | Yes | Payment method (e.g., "tempo", "stripe") |
| `intent` | Yes | Payment intent type (e.g., "charge", "authorize") |
| `request` | Yes | Base64url-encoded JSON with method-specific data |
| `expires` | No | RFC 3339 expiry timestamp |
| `description` | No | Human-readable description |

### Payment Credential (Authorization)

Client responds with base64url-encoded JSON:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Challenge ID (must match) |
| `source` | No | Payer DID (e.g., `did:pkh:eip155:1:0x...`) |
| `payload` | Yes | Method-specific payment proof |

### Payment-Receipt Header

Server returns receipt on success:

| Field | Description |
|-------|-------------|
| `status` | "success" or "failed" |
| `method` | Payment method used |
| `timestamp` | ISO 8601 settlement time |
| `reference` | Method-specific reference (tx hash, charge ID) |

### Status Codes

| Code | Meaning |
|------|---------|
| 402 | Resource requires payment; see `WWW-Authenticate` |
| 200 | Payment verified; resource provided |
| 400 | Malformed payment credential or proof |
| 401 | Valid format but payment verification failed |
| 403 | Payment verified but access denied (policy) |

## Payment Intents

### Base Intent: "charge"

One-time payment of a specified amount. The payer pushes payment immediately.

### Method-Specific Intents

| Intent | Methods | Description |
|--------|---------|-------------|
| `authorize` | tempo, stripe | Pre-authorize future charges |
| `subscription` | tempo, stripe | Recurring payment authorization |

---

## Tempo Payment Method

Payment method identifier: `tempo`

The Tempo payment method enables TIP-20 token payments on the Tempo blockchain.

### Fulfillment Mechanisms

1. **Tempo Transaction**: Type 0x76 transaction with `transfer` or `approve` call
2. **Access Key**: Delegated signing key with spending limits and expiry

### Charge Request Schema

```typescript
{
  amount: string       // Amount in base units (stringified)
  asset: string        // TIP-20 token address
  destination: string  // Recipient address
  expires: string      // ISO 8601 expiry timestamp
  feePayer?: boolean   // Server pays tx fees (default: false)
}
```

### Credential Payload Schema

```typescript
{
  type: 'transaction' | 'keyAuthorization'
  signature: string  // 0x-prefixed signed data
}
```

### Authorize Request Schema

```typescript
{
  asset: string      // TIP-20 token address
  expires: string    // ISO 8601 expiry timestamp
  limit: string      // Maximum amount in base units
  destination?: string // Spender address (for approve)
}
```

### Subscription Request Schema

```typescript
{
  amount: string     // Amount per period in base units
  asset: string      // TIP-20 token address
  expires?: string   // Optional overall expiry
  period: string     // Period duration in seconds
}
```

### Key Tempo Concepts

- **TIP-20**: Enshrined token standard (precompiles, not contracts), 6 decimals
- **2D Nonces**: Parallel transaction lanes via `nonce_key`
- **Fee Payer**: Server can pay tx fees with separate signature domain (0x78)
- **Access Keys**: Delegated keys with spending limits and expiry

---

## Stripe Payment Method

Payment method identifier: `stripe`

The Stripe payment method enables payments via Stripe Payment Tokens (SPTs).

### Fulfillment Mechanism

Stripe Payment Tokens (SPTs) - single-use tokens created via Stripe.js or API.

### Charge Request Schema

```typescript
{
  amount: number         // Amount in smallest currency unit (cents)
  currency: string       // Three-letter ISO currency code
  description?: string   // Human-readable description
  destination?: string   // Stripe account ID (for Connect)
  businessNetwork?: string // Business Network ID for B2B
  externalId?: string    // Merchant's order/cart ID
  metadata?: object      // Key-value pairs
}
```

### Credential Payload Schema

```typescript
{
  spt: string  // Stripe Payment Token (spt_...)
}
```

### Authorize Request Schema

```typescript
{
  amount: number        // Maximum authorization amount
  currency: string      // ISO currency code
  captureWindow?: number // Hours before auth expires
  description?: string
}
```

### Subscription Request Schema

```typescript
{
  amount: number       // Amount per period
  currency: string     // ISO currency code
  interval: 'day' | 'week' | 'month' | 'year'
  intervalCount?: number // Every N intervals
  description?: string
  trialDays?: number   // Free trial period
}
```

---

## References

Full specifications are available in the `references/` folder:

- [draft-ietf-httpauth-payment.md](references/draft-ietf-httpauth-payment.md) - Core protocol spec
- [draft-tempo-payment-method.md](references/draft-tempo-payment-method.md) - Tempo payment method
- [draft-stripe-payment-method.md](references/draft-stripe-payment-method.md) - Stripe payment method
