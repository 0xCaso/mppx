import { parseUnits } from 'viem'
import { prepareTransactionRequest, signTransaction } from 'viem/actions'
import { Actions } from 'viem/tempo'
import { describe, expect, test } from 'vitest'
import * as Http from '~test/Http.js'
import { rpcUrl } from '~test/tempo/prool.js'
import { accounts, asset, chain, client } from '~test/tempo/viem.js'
import * as Challenge from '../../Challenge.js'
import * as Credential from '../../Credential.js'
import * as PaymentRequest from '../../PaymentRequest.js'
import * as Receipt from '../../Receipt.js'
import * as PaymentHandler from './PaymentHandler.js'

const secretKey = 'test-secret-key'
const realm = 'api.example.com'

const handler = PaymentHandler.tempo({
  chainId: chain.id,
  realm,
  rpcUrl,
  secretKey,
})

describe('tempo', () => {
  describe('intent: charge; type: hash', () => {
    test('default', async () => {
      const recipient = accounts[0].address
      const amount = parseUnits('1', 6)
      const expires = new Date(Date.now() + 60_000).toISOString()

      const request = PaymentRequest.from({
        amount: amount.toString(),
        currency: asset,
        expires,
        recipient,
      })

      const server = await Http.createServer(async (req, res) => {
        await handler.charge({
          expires,
          request,
        })(req, res)
        if (!res.headersSent) res.end('OK')
      })

      try {
        const challengeResponse = await fetch(server.url)

        expect(challengeResponse.status).toBe(402)

        const challenge = Challenge.fromResponse(challengeResponse)

        const { receipt } = await Actions.token.transferSync(client, {
          account: accounts[1],
          chain,
          to: recipient,
          token: asset,
          amount,
        })
        const hash = receipt.transactionHash

        const credential = Credential.from({
          challenge,
          payload: { hash, type: 'hash' as const },
        })

        const response = await fetch(server.url, {
          headers: { Authorization: Credential.serialize(credential) },
        })
        expect(response.status).toBe(200)
        const paymentReceipt = Receipt.deserialize(response.headers.get('Payment-Receipt')!)
        expect(paymentReceipt.status).toBe('success')
        expect(paymentReceipt.method).toBe('tempo')
        expect(paymentReceipt.reference).toBe(hash)
      } finally {
        server.close()
      }
    })

    test('behavior: rejects hash with non-matching Transfer log', async () => {
      const recipient = accounts[0].address
      const wrongRecipient = accounts[2].address
      const amount = parseUnits('1', 6)
      const expires = new Date(Date.now() + 60_000).toISOString()

      const request = PaymentRequest.from({
        amount: amount.toString(),
        currency: asset,
        expires,
        recipient,
      })

      const server = await Http.createServer(async (req, res) => {
        try {
          await handler.charge({ expires, request })(req, res)
          if (!res.headersSent) res.end('OK')
        } catch (error) {
          res.writeHead(500)
          res.end((error as Error).message)
        }
      })

      try {
        const challengeResponse = await fetch(server.url)
        expect(challengeResponse.status).toBe(402)

        const challenge = Challenge.fromResponse(challengeResponse)

        const { receipt } = await Actions.token.transferSync(client, {
          account: accounts[1],
          chain,
          to: wrongRecipient,
          token: asset,
          amount,
        })
        const hash = receipt.transactionHash

        const credential = Credential.from({
          challenge,
          payload: { hash, type: 'hash' as const },
        })

        const response = await fetch(server.url, {
          headers: { Authorization: Credential.serialize(credential) },
        })
        expect(response.status).toBe(500)
        expect(await response.text()).toBe(
          'Transaction must contain a Transfer log matching request parameters',
        )
      } finally {
        server.close()
      }
    })

    test('behavior: rejects expired request', async () => {
      const recipient = accounts[0].address
      const amount = parseUnits('1', 6)
      const expires = new Date(Date.now() - 1000).toISOString()

      const request = PaymentRequest.from({
        amount: amount.toString(),
        currency: asset,
        expires,
        recipient,
      })

      const server = await Http.createServer(async (req, res) => {
        try {
          await handler.charge({ expires, request })(req, res)
          if (!res.headersSent) res.end('OK')
        } catch (error) {
          res.writeHead(500)
          res.end((error as Error).message)
        }
      })

      try {
        const challengeResponse = await fetch(server.url)
        expect(challengeResponse.status).toBe(402)
        const challenge = Challenge.fromResponse(challengeResponse)

        const { receipt } = await Actions.token.transferSync(client, {
          account: accounts[1],
          chain,
          to: recipient,
          token: asset,
          amount,
        })
        const hash = receipt.transactionHash

        const credential = Credential.from({
          challenge,
          payload: { hash, type: 'hash' as const },
        })

        const response = await fetch(server.url, {
          headers: { Authorization: Credential.serialize(credential) },
        })
        expect(response.status).toBe(500)
        expect(await response.text()).toBe('Request has expired')
      } finally {
        server.close()
      }
    })
  })

  describe('intent: charge; type: transaction', () => {
    test('default', async () => {
      const recipient = accounts[0].address
      const amount = parseUnits('1', 6)
      const expires = new Date(Date.now() + 60_000).toISOString()

      const request = PaymentRequest.from({
        amount: amount.toString(),
        currency: asset,
        expires,
        recipient,
      })

      const server = await Http.createServer(async (req, res) => {
        await handler.charge({ expires, request })(req, res)
        if (!res.headersSent) res.end('OK')
      })

      try {
        const challengeResponse = await fetch(server.url)
        expect(challengeResponse.status).toBe(402)
        const challenge = Challenge.fromResponse(challengeResponse)

        const prepared = await prepareTransactionRequest(client, {
          account: accounts[1],
          calls: [Actions.token.transfer.call({ to: recipient, token: asset, amount })],
        })
        const serializedTransaction = await signTransaction(client, prepared)

        const credential = Credential.from({
          challenge,
          payload: { signature: serializedTransaction, type: 'transaction' as const },
        })

        const response = await fetch(server.url, {
          headers: { Authorization: Credential.serialize(credential) },
        })
        expect(response.status).toBe(200)
        const receipt = Receipt.deserialize(response.headers.get('Payment-Receipt')!)
        expect(receipt.status).toBe('success')
        expect(receipt.method).toBe('tempo')
        expect(receipt.reference).toMatch(/^0x[a-f0-9]{64}$/)
      } finally {
        server.close()
      }
    })

    test('behavior: rejects transaction with non-matching transfer call', async () => {
      const recipient = accounts[0].address
      const wrongRecipient = accounts[2].address
      const amount = parseUnits('1', 6)
      const expires = new Date(Date.now() + 60_000).toISOString()

      const request = PaymentRequest.from({
        amount: amount.toString(),
        currency: asset,
        expires,
        recipient,
      })

      const server = await Http.createServer(async (req, res) => {
        try {
          await handler.charge({ expires, request })(req, res)
          if (!res.headersSent) res.end('OK')
        } catch (error) {
          res.writeHead(500)
          res.end((error as Error).message)
        }
      })

      try {
        const challengeResponse = await fetch(server.url)
        expect(challengeResponse.status).toBe(402)
        const challenge = Challenge.fromResponse(challengeResponse)

        const serializedTransaction = await signTransaction(client, {
          account: accounts[1],
          calls: [Actions.token.transfer.call({ to: wrongRecipient, token: asset, amount })],
          chain,
          type: 'tempo',
        })

        const credential = Credential.from({
          challenge,
          payload: { signature: serializedTransaction, type: 'transaction' as const },
        })

        const response = await fetch(server.url, {
          headers: { Authorization: Credential.serialize(credential) },
        })
        expect(response.status).toBe(500)
        expect(await response.text()).toBe(
          'Transaction must contain a transfer(to, amount) call matching request parameters',
        )
      } finally {
        server.close()
      }
    })

    test('behavior: submits transaction with feePayer co-signing', async () => {
      const handlerWithFeePayer = PaymentHandler.tempo({
        chainId: chain.id,
        feePayer: accounts[0],
        realm,
        rpcUrl,
        secretKey,
      })

      const recipient = accounts[0].address
      const amount = parseUnits('1', 6)
      const expires = new Date(Date.now() + 60_000).toISOString()

      const request = PaymentRequest.from({
        amount: amount.toString(),
        currency: asset,
        expires,
        methodDetails: { feePayer: true },
        recipient,
      })

      const server = await Http.createServer(async (req, res) => {
        await handlerWithFeePayer.charge({ expires, request })(req, res)
        if (!res.headersSent) res.end('OK')
      })

      try {
        const challengeResponse = await fetch(server.url)
        expect(challengeResponse.status).toBe(402)
        const challenge = Challenge.fromResponse(challengeResponse)

        const prepared = await prepareTransactionRequest(client, {
          account: accounts[1],
          calls: [Actions.token.transfer.call({ to: recipient, token: asset, amount })],
          chain,
          type: 'tempo',
        })
        const serializedTransaction = await signTransaction(client, prepared as never)

        const credential = Credential.from({
          challenge,
          payload: { signature: serializedTransaction, type: 'transaction' as const },
        })

        const response = await fetch(server.url, {
          headers: { Authorization: Credential.serialize(credential) },
        })
        expect(response.status).toBe(200)
        const receipt = Receipt.deserialize(response.headers.get('Payment-Receipt')!)
        expect(receipt.status).toBe('success')
      } finally {
        server.close()
      }
    })
  })

  describe('intent: unknown', () => {
    test('behavior: returns 402 for invalid payload schema', async () => {
      const expires = new Date(Date.now() + 60_000).toISOString()

      const request = PaymentRequest.from({
        amount: '1000000',
        currency: asset,
        expires,
        recipient: accounts[0].address,
      })

      const server = await Http.createServer(async (req, res) => {
        await handler.charge({ expires, request })(req, res)
        if (!res.headersSent) res.end('OK')
      })

      try {
        const challengeResponse = await fetch(server.url)
        expect(challengeResponse.status).toBe(402)

        const challenge = Challenge.fromResponse(challengeResponse)

        const credential = Credential.from({
          challenge,
          payload: { type: 'unknown' as never },
        })

        const response = await fetch(server.url, {
          headers: { Authorization: Credential.serialize(credential) },
        })
        expect(response.status).toBe(402)
      } finally {
        server.close()
      }
    })
  })
})
