# Contracts and Errors

## Contents
- Contract forms
- Validation semantics
- Error handling model

## Contract Forms

Supported contract shapes:
- type-guard function
- contract protocol object with `isData/getErrorMessages`
- Standard Schema contract (`~standard`)

## Validation Semantics

- Validation happens for restored/read values.
- `undefined` is always treated as valid.
- Invalid values trigger `fail` with `operation: 'validate'`.
- Writes are not blocked by validation; invalid written values can still be persisted and then reported as validation failures.

## Error Handling Model

- `fail` channel: per-operation error reporting (`get`, `set`, `validate`).
- `finally` channel: unified done/fail stream.
- If no `fail` unit is supplied, errors are printed via `console.error`.

## Recommendation

Always wire at least one explicit failure path in production flows:
- logging/monitoring event
- fallback restore logic
- safe reset event when contract mismatch is critical
