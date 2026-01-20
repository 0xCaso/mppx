/** The credential passed to the verify function */
export type Credential<payload = unknown> = {
  /** The challenge ID from the original 402 response */
  id: string
  /** Optional payer identifier as a DID (e.g., "did:pkh:eip155:1:0x...") */
  source?: string | undefined
  /** The validated credential payload */
  payload: payload
}
