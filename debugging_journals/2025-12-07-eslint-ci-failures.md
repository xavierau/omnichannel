# ESLint CI Failures - Debugging Journal

**Date:** 2025-12-07
**Issue:** GitHub Actions CI failing due to ESLint errors
**Commits:** `d01b675`, `d720ea1`

## Symptoms

GitHub Actions CI was failing with 11 ESLint errors across backend and frontend files:

### Backend Errors (10)
| File | Line | Error |
|------|------|-------|
| `inbox-sse.service.spec.ts` | 437 | `'dataLength' is assigned but never used` |
| `conversation.service.spec.ts` | 195, 264, 321 | `Unexpected any` |
| `conversation.service.spec.ts` | 197, 266, 323 | `'result' is assigned but never used` |
| `group.controller.ts` | 123 | `'group' is assigned but never used` |
| `custom-fields.validator.ts` | 118 | `'_args' is defined but never used` |
| `customer.integration.test.ts` | 46 | `'_next' is defined but never used` |

### Frontend Error (1)
| File | Line | Error |
|------|------|-------|
| `TemplateGroupTable.tsx` | 267 | `React Hook useEffect has missing dependency: 'rowSelection'` |

## Root Cause Analysis

### Pattern 1: Unused Variables in Tests
**Problem:** Tests calling async methods but not asserting on return values.
```typescript
// Before
const result = await service.pickupConversation(...);
// result never used - only side effects are verified

// After
await service.pickupConversation(...);
```

### Pattern 2: Using `any` in Mock Returns
**Problem:** Using `{} as any` for mock return values bypasses type safety.
```typescript
// Before
assignmentRepository.create.mockResolvedValue({} as any);

// After
assignmentRepository.create.mockResolvedValue({} as unknown as ConversationAssignment);
```
**Why `unknown` + type cast?** Double casting (`as unknown as T`) is the proper way to cast an empty object to a specific type without using `any`.

### Pattern 3: Unused Controller Variables
**Problem:** Controller method called `updateGroup()` but discarded result, then called `getGroup()`.
```typescript
// Before
const group = await this.groupService.updateGroup(id, req.body, tenantId);
const groupWithCount = await this.groupService.getGroup(tenantId, id);

// After
await this.groupService.updateGroup(id, req.body, tenantId);
const groupWithCount = await this.groupService.getGroup(tenantId, id);
```

### Pattern 4: Underscore-Prefixed Unused Parameters
**Problem:** ESLint's `@typescript-eslint/no-unused-vars` requires explicit configuration to ignore `_` prefixed params.

**Solution A:** Remove the parameter if not needed in callback signature
```typescript
// Before
defaultMessage(_args: ValidationArguments) { ... }

// After
defaultMessage() { ... }
```

**Solution B:** Add eslint-disable comment for required signatures (like error handlers)
```typescript
// Error handlers MUST have 4 params for Express to recognize them
const testErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => { ... }
```

### Pattern 5: useEffect Dependency Mismatch
**Problem:** useEffect body accessed `rowSelection` but dependency array had a memoized derivative (`selectedRowIds`).
```typescript
// Before - mismatch
React.useEffect(() => {
  const selectedRows = data.filter((_, idx) =>
    rowSelection[idx.toString()]  // Uses rowSelection directly
  )
}, [selectedRowIds, ...])  // But depends on derived value

// After - correct
React.useEffect(() => {
  const selectedRows = data.filter((_, idx) =>
    rowSelection[idx.toString()]
  )
}, [rowSelection, ...])  // Depend on what you use
```

## Solutions Applied

### File-by-File Changes

1. **`inbox-sse.service.spec.ts:437`**
   - Removed unused `dataLength` variable (it was declared but never asserted against)

2. **`conversation.service.spec.ts:195,264,321`**
   - Added import: `import { ConversationAssignment } from '../../entities/conversation-assignment.entity'`
   - Changed `{} as any` to `{} as unknown as ConversationAssignment`
   - Removed unused `result` variables from 3 test cases

3. **`group.controller.ts:123`**
   - Changed `const group = await this.groupService.updateGroup(...)` to `await this.groupService.updateGroup(...)`

4. **`custom-fields.validator.ts:118`**
   - Changed `defaultMessage(_args: ValidationArguments)` to `defaultMessage()`

5. **`customer.integration.test.ts:46`**
   - Added `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above `_next` parameter
   - Also prefixed `req` with `_` since it wasn't used

6. **`TemplateGroupTable.tsx:267`**
   - Removed unused `selectedRowIds` memoization
   - Changed dependency from `[selectedRowIds, ...]` to `[rowSelection, ...]`

## Prevention Guidelines

### 1. Test Code Quality
- **Don't assign results you won't use.** If a test only verifies side effects (like mock calls), don't capture the return value.
- **Use proper types for mocks.** Prefer `{} as unknown as SpecificType` over `{} as any`.

### 2. TypeScript Strict Typing
- **Avoid `any` everywhere.** Use `unknown` when type is truly unknown, then narrow or cast.
- **For Express error handlers:** Use eslint-disable comments since the 4-parameter signature is required.

### 3. React Hooks
- **Include all dependencies used in effect body.** ESLint's `exhaustive-deps` rule catches these.
- **Don't use memoized derivatives as dependencies** when the effect body accesses the source directly.
- **If you need stable primitives for performance,** use the primitive *inside* the effect, not the source object.

### 4. Unused Parameters
- **If the parameter is truly unused,** remove it from the signature if possible.
- **If the parameter is required by a type/interface,** use `_` prefix AND configure ESLint to ignore it, or add eslint-disable comment.

### 5. CI/Local Parity
- **Run `npm run lint` locally before pushing.** The local backend lint (`backend/npm run lint`) should match CI.
- **Check both frontend and backend.** Run from root: `npm run lint` (frontend) and `cd backend && npm run lint`.

## Related Files

- `backend/src/features/inbox/services/__tests__/inbox-sse.service.spec.ts:437`
- `backend/src/features/inbox/services/__tests__/conversation.service.spec.ts:195,264,321`
- `backend/src/features/groups/group.controller.ts:123`
- `backend/src/features/customers/dto/custom-fields.validator.ts:118`
- `backend/src/features/customers/__tests__/customer.integration.test.ts:46`
- `src/pages/whatsapp-templates/components/TemplateGroupTable.tsx:261`
