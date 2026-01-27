import { describe, expect, test } from 'vitest'
import * as Http from '~test/Http.js'
import * as Challenge from '../Challenge.js'
import * as Credential from '../Credential.js'
import * as Receipt from '../Receipt.js'
import * as Intents from '../tempo/Intents.js'
import * as PaymentHandler from './PaymentHandler.js'

const secretKey = 'test-secret-key'
const realm = 'api.example.com'

const handler = PaymentHandler.from({
  method: 'tempo',
  realm,
  secretKey,
  intents: {
    charge: Intents.charge,
    authorize: Intents.authorize,
  },
  async verify() {
    return {
      method: 'tempo',
      reference: `0x${'a'.repeat(64)}`,
      status: 'success' as const,
      timestamp: new Date().toISOString(),
    }
  },
})

describe('from', () => {
  test('behavior: creates handler with intent methods', () => {
    expect(handler.method).toBe('tempo')
    expect(handler.realm).toBe('api.example.com')
    expect(typeof handler.charge).toBe('function')
    expect(typeof handler.authorize).toBe('function')
  })
})

describe('intent function', () => {
  test('behavior: returns 402 response when no Authorization header', async () => {
    const request = new Request('https://api.example.com/resource')

    const response = await handler.charge({
      request: {
        amount: '1000000',
        currency: '0x20c0000000000000000000000000000000000001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
        expires: '2025-01-06T12:00:00Z',
      },
    })(request)

    expect(response.status).toBe(402)
    if (response.status !== 402) throw new Error('Expected 402')
    expect(response.challenge.status).toBe(402)
    expect(response.challenge.headers.get('WWW-Authenticate')).toMatch(/^Payment /)
  })

  test('behavior: returns 402 when invalid Authorization header', async () => {
    const request = new Request('https://api.example.com/resource', {
      headers: { Authorization: 'Bearer invalid' },
    })

    const response = await handler.charge({
      request: {
        amount: '1000000',
        currency: '0x20c0000000000000000000000000000000000001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
        expires: '2025-01-06T12:00:00Z',
      },
    })(request)

    expect(response.status).toBe(402)
  })

  test('behavior: returns 402 when credential challenge id does not match', async () => {
    const credential = Credential.from({
      challenge: {
        id: 'wrong-id',
        realm: 'api.example.com',
        method: 'tempo',
        intent: 'charge',
        request: { amount: '1000' },
      },
      payload: { signature: '0xabc', type: 'transaction' as const },
    })

    const request = new Request('https://api.example.com/resource', {
      headers: { Authorization: Credential.serialize(credential) },
    })

    const response = await handler.charge({
      request: {
        amount: '1000000',
        currency: '0x20c0000000000000000000000000000000000001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
        expires: '2025-01-06T12:00:00Z',
      },
    })(request)

    expect(response.status).toBe(402)
  })

  test('behavior: returns 200 with receipt wrapper when credential is valid', async () => {
    const paymentRequest = {
      amount: '1000000',
      currency: '0x20c0000000000000000000000000000000000001',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
      expires: '2025-01-06T12:00:00Z',
    }

    const challenge = Challenge.fromIntent(Intents.charge, {
      secretKey,
      realm,
      request: paymentRequest,
      expires: paymentRequest.expires,
    })

    const credential = Credential.from({
      challenge,
      payload: { signature: `0x${'ab'.repeat(65)}`, type: 'transaction' as const },
    })

    const request = new Request('https://api.example.com/resource', {
      headers: { Authorization: Credential.serialize(credential) },
    })

    const response = await handler.charge({
      request: paymentRequest,
      expires: paymentRequest.expires,
    })(request)

    expect(response.status).toBe(200)
    if (response.status !== 200) throw new Error('Expected 200')

    const res = response.withReceipt(new Response('OK', { status: 200 }))
    const receipt = Receipt.deserialize(res.headers.get('Payment-Receipt')!)
    expect({ ...receipt, timestamp: '[timestamp]' }).toMatchInlineSnapshot(`
      {
        "method": "tempo",
        "reference": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "status": "success",
        "timestamp": "[timestamp]",
      }
    `)
  })

  test('behavior: returns 402 when credential payload is invalid', async () => {
    const paymentRequest = {
      amount: '1000000',
      currency: '0x20c0000000000000000000000000000000000001',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
      expires: '2025-01-06T12:00:00Z',
    }

    const challenge = Challenge.fromIntent(Intents.charge, {
      secretKey,
      realm,
      request: paymentRequest,
      expires: paymentRequest.expires,
    })

    const credential = Credential.from({
      challenge,
      payload: { invalid: 'payload' },
    })

    const request = new Request('https://api.example.com/resource', {
      headers: { Authorization: Credential.serialize(credential) },
    })

    const response = await handler.charge({ request: paymentRequest })(request)

    expect(response.status).toBe(402)
  })

  test('behavior: 402 response contains correct challenge', async () => {
    const request = new Request('https://api.example.com/resource')

    const response = await handler.charge({
      request: {
        amount: '1000000',
        currency: '0x20c0000000000000000000000000000000000001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
        expires: '2025-01-06T12:00:00Z',
      },
    })(request)

    expect(response.status).toBe(402)
    if (response.status !== 402) throw new Error('Expected 402')

    const header = response.challenge.headers.get('WWW-Authenticate')
    if (!header) throw new Error('Expected WWW-Authenticate header')
    const challenge = Challenge.deserialize(header)

    expect(challenge.method).toBe('tempo')
    expect(challenge.intent).toBe('charge')
    expect(challenge.realm).toBe('api.example.com')
    expect(challenge.request).toMatchObject({
      amount: '1000000',
      currency: '0x20c0000000000000000000000000000000000001',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
      expires: '2025-01-06T12:00:00Z',
    })
  })

  test('behavior: 402 response includes description in challenge', async () => {
    const request = new Request('https://api.example.com/resource')

    const response = await handler.charge({
      request: {
        amount: '1000000',
        currency: '0x20c0000000000000000000000000000000000001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
        expires: '2025-01-06T12:00:00Z',
      },
      description: 'Payment for API access',
    })(request)

    expect(response.status).toBe(402)
    if (response.status !== 402) throw new Error('Expected 402')

    const header = response.challenge.headers.get('WWW-Authenticate')
    if (!header) throw new Error('Expected WWW-Authenticate header')
    const challenge = Challenge.deserialize(header)

    expect(challenge.description).toBe('Payment for API access')
  })
})

describe('intent function (Node.js)', () => {
  const paymentRequest = {
    amount: '1000000',
    currency: '0x20c0000000000000000000000000000000000001',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
    expires: '2025-01-06T12:00:00Z',
  }

  test('default', async () => {
    const server = await Http.createServer(async (req, res) => {
      const response = await handler.charge({ request: paymentRequest })(req, res)
      if (response.status === 402) return
      res.end()
    })

    try {
      const response = await fetch(server.url)
      const challenge = Challenge.deserialize(response.headers.get('WWW-Authenticate')!)
      const body = (await response.json()) as { challengeId: string }
      expect(response.status).toBe(402)
      expect({ ...challenge, id: '[id]' }).toMatchInlineSnapshot(`
        {
          "id": "[id]",
          "intent": "charge",
          "method": "tempo",
          "realm": "api.example.com",
          "request": {
            "amount": "1000000",
            "currency": "0x20c0000000000000000000000000000000000001",
            "expires": "2025-01-06T12:00:00Z",
            "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
          },
        }
      `)
      expect({ ...body, challengeId: '[id]' }).toMatchInlineSnapshot(`
        {
          "challengeId": "[id]",
          "detail": "Payment is required for "api.example.com".",
          "status": 402,
          "title": "PaymentRequiredError",
          "type": "https://tempoxyz.github.io/payment-auth-spec/problems/payment-required",
        }
      `)
    } finally {
      server.close()
    }
  })

  test('behavior: sets receipt header when credential is valid', async () => {
    const challenge = Challenge.fromIntent(Intents.charge, {
      secretKey,
      realm,
      request: paymentRequest,
    })

    const credential = Credential.from({
      challenge,
      payload: { signature: `0x${'ab'.repeat(65)}`, type: 'transaction' as const },
    })

    const server = await Http.createServer(async (req, res) => {
      await handler.charge({ request: paymentRequest })(req, res)
      if (!res.headersSent) res.end()
    })

    try {
      const response = await fetch(server.url, {
        headers: { Authorization: Credential.serialize(credential) },
      })

      expect(response.status).toBe(200)
      const receipt = Receipt.deserialize(response.headers.get('Payment-Receipt')!)
      expect({ ...receipt, timestamp: '[timestamp]' }).toMatchInlineSnapshot(`
        {
          "method": "tempo",
          "reference": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "status": "success",
          "timestamp": "[timestamp]",
        }
      `)
    } finally {
      server.close()
    }
  })
})
