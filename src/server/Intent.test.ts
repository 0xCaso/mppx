import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { Intent } from 'mpay/server'
import { client } from '../../test/viem.js'

const charge = Intent.define({
  schema: {
    request: z.object({
      /** Amount in base units (stringified number) */
      amount: z.string(),
      /** TIP-20 token address */
      asset: z.templateLiteral([z.literal('0x'), z.string()]),
      /** Recipient address */
      destination: z.templateLiteral([z.literal('0x'), z.string()]),
      /** Expiry timestamp in ISO 8601 format */
      expires: z.iso.datetime(),
      /** If true, server will pay transaction fees (default: false) */
      feePayer: z.boolean().optional().default(false),
    }),
    credentialPayload: z.object({
      /** Payload type: transaction or keyAuthorization */
      type: z.enum(['keyAuthorization', 'transaction']),
      /** Signed Tempo transaction or keyAuthorization */
      signature: z.templateLiteral([z.literal('0x'), z.string()]),
    }),
  },

  async verify(_credential) {
    // credential.id - challenge ID
    // credential.source - optional payer DID
    // credential.payload - validated payload (type + signature)

    // TODO:
    // 1. Check credential.payload.type
    // 2. If 'transaction': deserialize and broadcast the signed transaction
    // 3. If 'keyAuthorization': broadcast transaction with keyAuthorization
    // 4. Verify signature matches expected asset/destination/amount

    return {
      receipt: {
        status: 'success',
        timestamp: new Date().toISOString(),
        reference: '0xabc123...', // transaction hash
      },
    }
  },
})

describe('define', () => {
  describe('request', () => {
    test.only('default', async () => {
      const request = await charge.request({
        amount: '1000000',
        asset: '0x20c0000000000000000000000000000000000001',
        destination: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
        expires: '2025-01-06T12:00:00Z',
      })

      console.log(await client.getBlockNumber())

      expect(request).toMatchInlineSnapshot(`
        {
          "amount": "1000000",
          "asset": "0x20c0000000000000000000000000000000000001",
          "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
          "expires": "2025-01-06T12:00:00Z",
          "feePayer": false,
        }
      `)
    })

    test('with feePayer=true', async () => {
      const request = await charge.request({
        amount: '1000000',
        asset: '0x20c0000000000000000000000000000000000001',
        destination: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
        expires: '2025-01-06T12:00:00Z',
        feePayer: true,
      })

      expect(request).toMatchInlineSnapshot(`
        {
          "amount": "1000000",
          "asset": "0x20c0000000000000000000000000000000000001",
          "destination": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
          "expires": "2025-01-06T12:00:00Z",
          "feePayer": true,
        }
      `)
    })

    test('throws on invalid asset address', async () => {
      await expect(
        charge.request({
          amount: '1000000',
          asset: 'not-an-address',
          destination: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
          expires: '2025-01-06T12:00:00Z',
        }),
      ).rejects.toThrow(Intent.ValidationError)
    })

    test('throws on invalid expires format', async () => {
      await expect(
        charge.request({
          amount: '1000000',
          asset: '0x20c0000000000000000000000000000000000001',
          destination: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
          expires: 'not-a-date',
        }),
      ).rejects.toThrow(Intent.ValidationError)
    })
  })

  describe('verify', () => {
    test('default', async () => {
      const {
        receipt: { timestamp, ...rest },
      } = await charge.verify({
        id: 'kM9xPqWvT2nJrHsY4aDfEb',
        source: 'did:pkh:eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
        payload: {
          type: 'transaction',
          signature: '0x76abc123...',
        },
      })

      expect(timestamp).toBeDefined()
      expect(rest).toMatchInlineSnapshot(`
        {
          "reference": "0xabc123...",
          "status": "success",
        }
      `)
    })

    test('throws on invalid credential payload schema', async () => {
      await expect(
        charge.verify({
          id: 'test',
          payload: { type: 'invalid', signature: '0x123' } as never,
        }),
      ).rejects.toThrow(Intent.ValidationError)
    })
  })
})
