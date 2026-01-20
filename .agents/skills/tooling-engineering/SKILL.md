---
name: tooling-engineering
description: Expert tooling engineer following wevm library patterns. Use when building TypeScript libraries, modules, or utilities. Covers module-driven development, test structure, changesets, conventional commits, JSDoc, and doc+test-driven development.
---

# Tooling Engineering

Expert guidance for building TypeScript libraries following wevm (Ox, Prool, Idxs, Zile) patterns and conventions.

## Core Principles

1. **Module-driven development** – Each file is its own module representing an "instance"
2. **Function-based API** – Export functions, not classes; use namespace imports
3. **Doc + test-driven development** – Write JSDoc and tests first, then implementation
4. **Tree-shakeable** – Design for optimal bundle size
5. **Type-safe** – Explicit return types, strict TypeScript

## Module-Driven Development

### Pattern

Each module exports functions that operate on data. Modules represent their own "instance":

```ts
// Sidebar.ts
export type SidebarItem = { text: string; link?: string; items?: SidebarItem[] }

export function flatten(items: SidebarItem[]): SidebarItem[] {
  const result: SidebarItem[] = []
  for (const item of items) {
    if (item.link) result.push(item)
    if (item.items) result.push(...flatten(item.items))
  }
  return result
}

export function fromConfig(config: Config['sidebar'], path: string): SidebarItem[] {
  // ...
}
```

### Import Style

Import modules with namespace style:

```ts
import * as Sidebar from './Sidebar.js'
import * as Config from './Config.js'
import * as Intent from './Intent.js'

// Usage
const items = Sidebar.flatten(sidebar.items)
const config = await Config.resolve()
```

### Explicit Return Types

All module functions MUST have explicit return types:

```ts
// ✅ Good - explicit return type
export function flatten(items: SidebarItem[]): SidebarItem[] {
  // ...
}

// ❌ Bad - implicit return type
export function flatten(items: SidebarItem[]) {
  // ...
}
```

### Function Parameter & Return Types

Use `declare namespace` for function options and return types:

```ts
export function define<const schema extends Schema>(
  options: define.Options<schema>,
): define.ReturnType<schema> {
  // ...
}

export declare namespace define {
  type Options<schema extends Schema> = {
    /** Schemas for validation */
    schema: schema
    /** Verifies a credential */
    verify: Intent<schema>['verify']
  }

  type ReturnType<schema extends Schema> = Intent<schema>
}
```

This pattern:
- Keeps types discoverable from the function symbol (e.g., `define.Options`)
- Avoids name clashes across modules
- Enables better IDE autocomplete and documentation

### File Extensions

Always use `.js` extensions for relative imports (even for `.ts`/`.tsx` files):

```ts
import * as Config from './Config.js'
import * as Handlers from '../server/Handlers.js'
```

### Module Naming

Module files use PascalCase (e.g., `Intent.ts`, `Credential.ts`). This distinguishes modules from utility files and makes namespace imports read naturally.

## Testing

### Test File Structure

Colocate tests with modules using `ModuleName.test.ts` pattern.

Structure tests with `describe` on the module function, then test cases within:

```ts
// Intent.test.ts
import { describe, expect, test } from 'vitest'
import * as Intent from './Intent.js'

describe('define', () => {
  describe('request', () => {
    test('creates well-formed request', async () => {
      // ...
    })

    test('throws on invalid input', async () => {
      // ...
    })
  })

  describe('verify', () => {
    test('validates credential', async () => {
      // ...
    })
  })
})
```

### Test Naming

- Top-level `describe` matches the exported function name
- Nested `describe` groups related functionality
- `test` describes the specific behavior being tested

### Snapshot Testing

Prefer inline snapshot tests for expected values — makes them explicit and easy to update:

```ts
describe('Sidebar.flatten', () => {
  test('flattens nested items', () => {
    const items = [{ text: 'A', items: [{ text: 'B', link: '/b' }] }]
    expect(Sidebar.flatten(items)).toMatchInlineSnapshot(`
      [{ "text": "B", "link": "/b" }]
    `)
  })
})
```

### Assertion Style

For simple assertions, use standard matchers:

```ts
expect(result.status).toBe('success')
expect(result.items).toHaveLength(3)
```

For complex objects or when you want to lock in structure, prefer inline snapshots.

### Testing Errors

Test error cases with `.rejects.toThrow()`:

```ts
test('throws on invalid input', async () => {
  await expect(
    charge.request({ asset: 'not-an-address' }),
  ).rejects.toThrow(Intent.IntentValidationError)
})
```

## JSDoc

Document all public exports with JSDoc. Always include `@param` and `@returns` for top-level parameters:

```ts
/**
 * Defines a payment intent.
 *
 * An intent describes a type of payment operation (e.g., charge, authorize)
 * and provides schema validation and credential verification.
 *
 * @param options - Intent definition options.
 * @returns The defined intent with request and verify methods.
 *
 * @example
 * ```ts
 * import * as Intent from 'mpay/Intent'
 * import { z } from 'zod'
 *
 * const charge = Intent.define({
 *   schema: {
 *     request: z.object({ amount: z.string() }),
 *     credentialPayload: z.object({ signature: z.string() }),
 *   },
 *   verify(credential) {
 *     return { receipt: { status: 'success', ... } }
 *   },
 * })
 * ```
 */
export function define<const schema extends Schema>(
  options: define.Options<schema>,
): define.ReturnType<schema> {
  // ...
}
```

### JSDoc in Types

Document type properties inline:

```ts
type Options = {
  /** Amount in base units (stringified number) */
  amount: string
  /** TIP-20 token address */
  asset: string
  /** If true, server will pay transaction fees (default: false) */
  feePayer?: boolean
}
```

## Conventional Commits

Use conventional commits for all changes:

```
feat: add subscription intent support
fix: handle expired credentials correctly
docs: update Intent.define examples
test: add edge case coverage for verify
refactor: simplify credential validation
chore: update dependencies
```

### Commit Scopes (optional)

```
feat(intent): add recurring payment support
fix(credential): parse DID correctly
```

## Changesets

Use changesets for versioning. Create a changeset for each meaningful change:

```bash
pnpm changeset
```

Changeset files go in `.changeset/`:

```md
---
"mpay": minor
---

Added subscription intent support with recurring payment validation.
```

### Changeset Types

- `major` – Breaking changes
- `minor` – New features, backwards compatible
- `patch` – Bug fixes, backwards compatible

## Error Handling

### Custom Error Classes

Define error classes for domain-specific errors:

```ts
export class IntentValidationError extends Error {
  readonly issues: ReadonlyArray<Issue>

  constructor(message: string, issues: ReadonlyArray<Issue>) {
    super(message)
    this.name = 'IntentValidationError'
    this.issues = issues
  }
}
```

### Error Messages

Be specific in error messages:

```ts
throw new IntentValidationError(`Invalid ${name}: ${messages}`, result.issues)
```

## Project Structure

```
src/
├── index.ts              # Re-exports public API
├── Intent.ts             # Public module
├── Intent.test.ts        # Public module tests
├── Credential.ts         # Public module
├── Credential.test.ts    # Public module tests
└── internal/
    ├── Utils.ts          # Internal module
    └── Utils.test.ts     # Internal module tests
```

Internal modules (not part of the public API) go in `src/internal/`.

## Tooling

### Required Tools

- **Biome** – Linting and formatting
- **TypeScript** – Type checking
- **Vitest** – Testing
- **Changesets** – Versioning
- **Zile** – Build tool (wevm standard)

### Scripts

Standard package.json scripts:

```json
{
  "scripts": {
    "build": "zile",
    "check": "biome check --fix --unsafe",
    "check:types": "tsc",
    "test": "vitest",
    "changeset:version": "changeset version",
    "changeset:publish": "zile publish:prepare && changeset publish && zile publish:post"
  }
}
```

## Doc + Test-Driven Development

1. **Write JSDoc first** – Document the function's purpose and usage
2. **Write tests** – Define expected behavior through test cases
3. **Implement** – Write the minimal code to pass tests
4. **Refine** – Improve implementation, update docs if needed

This ensures documentation stays accurate and tests cover real use cases.

## References

### wevm Libraries

- [Ox](https://github.com/wevm/ox) – Ethereum Standard Library
- [Prool](https://github.com/wevm/prool) – HTTP testing instances
- [Idxs](https://github.com/wevm/idxs) – Indexer utilities
- [Zile](https://github.com/wevm/zile) – Build tool for TypeScript libraries
