import type { StandardSchemaV1 as SS } from '@standard-schema/spec'
import type * as Credential from './Credential.js'
import * as SchemaLib from './internal/Schema.js'

export { ValidationError } from './internal/Schema.js'

type Schema = {
  request: SS
  credentialPayload: SS
}

export type VerifyResult = {
  /** Receipt data for Payment-Receipt header */
  receipt: {
    /** Payment status: "success" or "failed" */
    status: 'success' | 'failed'
    /** ISO 8601 settlement timestamp */
    timestamp: string
    /** Method-specific reference (e.g., transaction hash) */
    reference: string
  }
}

export type Intent<schema extends Schema> = {
  readonly '~standard': {
    readonly schema: schema
  }

  /**
   * Create a well-formed request payload.
   * Validates input against the request schema and returns the typed output.
   */
  request(input: SS.InferInput<schema['request']>): Promise<SS.InferOutput<schema['request']>>

  /**
   * Verifies a Payment credential.
   */
  verify(
    credential: Credential.Credential<SS.InferOutput<schema['credentialPayload']>>,
  ): Promise<VerifyResult>
}

/**
 * Defines a payment intent.
 *
 * An intent describes a type of payment operation (e.g., charge, authorize, subscription)
 * and provides:
 * - A request schema for validating challenge parameters
 * - A verify function for validating credential payloads
 *
 * @example
 * ```ts
 * import { Intent } from 'mpay'
 * import { z } from 'zod'
 *
 * const charge = Intent.define({
 *   schema: {
 *     request: z.object({
 *       amount: z.string(),
 *       asset: z.string(),
 *       destination: z.string(),
 *       expires: z.string(),
 *     }),
 *     credentialPayload: z.object({
 *       signedTransaction: z.string(),
 *     }),
 *   },
 *   verify(credential) {
 *     // credential.id - the challenge ID
 *     // credential.source - optional payer DID
 *     // credential.payload - the validated payload
 *     return { receipt: { status: 'success', timestamp: '...', reference: '...' } }
 *   },
 * })
 *
 * // Create a well-formed request
 * const request = charge.request({ amount: '1000000', ... })
 * ```
 */
export function define<const schema extends Schema>(
  options: define.Options<schema>,
): define.ReturnType<schema> {
  const { schema, verify } = options

  return {
    '~standard': {
      schema,
    },

    async request(input) {
      const result = await schema.request['~standard'].validate(input)
      return SchemaLib.unwrap(result, 'request')
    },

    async verify(credential) {
      const result = await schema.credentialPayload['~standard'].validate(credential.payload)
      const payload = SchemaLib.unwrap(result, 'credentialPayload')
      return verify({ ...credential, payload })
    },
  }
}

export declare namespace define {
  type Options<schema extends Schema> = {
    /** Schemas for request and credential validation */
    schema: schema

    /** Verifies a credential. */
    verify: Intent<schema>['verify']
  }

  type ReturnType<schema extends Schema> = Intent<schema>
}
