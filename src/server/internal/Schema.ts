import type { StandardSchemaV1 } from '@standard-schema/spec'

export class ValidationError extends Error {
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>

  constructor(message: string, issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    super(message)
    this.name = 'ValidationError'
    this.issues = issues
  }
}

/**
 * Unwraps a Standard Schema validation result.
 * Throws ValidationError if validation failed.
 */
export function unwrap<T>(result: StandardSchemaV1.Result<T>, name?: string): T {
  if (result.issues) {
    const messages = result.issues.map((i) => i.message).join(', ')
    const prefix = name ? `Invalid ${name}: ` : ''
    throw new ValidationError(`${prefix}${messages}`, result.issues)
  }
  return result.value
}
