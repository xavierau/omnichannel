# TypeORM QueryBuilder Snake_Case Bug

**Date:** 2025-12-09
**Severity:** Critical (500 error in production)

## Symptoms

Production error when fetching conversation messages:
```
TypeError: Cannot read properties of undefined (reading 'databaseName')
    at SelectQueryBuilder.createOrderByCombinedWithSelectExpression
```

Endpoint: `GET /api/inbox/conversations/:id/messages`

## Root Cause

TypeORM QueryBuilder requires **entity property names** (camelCase) in `.where()` and `.orderBy()` clauses, NOT database column names (snake_case).

**Wrong:**
```typescript
.where('message.conversation_id = :conversationId', { conversationId })
.orderBy('message.created_at', 'DESC')
```

**Correct:**
```typescript
.where('message.conversationId = :conversationId', { conversationId })
.orderBy('message.createdAt', 'DESC')
```

TypeORM maps property names to column names internally. When snake_case is used, TypeORM can't find the property metadata and fails.

## Files Fixed

| File | Line | Change |
|------|------|--------|
| `backend/src/features/inbox/repositories/conversation-message.repository.ts` | 77-78 | `conversation_id` → `conversationId`, `created_at` → `createdAt` |
| `backend/src/features/inbox/repositories/conversation-message.repository.ts` | 296 | `provider_message_id` → `providerMessageId` |
| `backend/src/features/inbox/repositories/conversation-note.repository.ts` | 46-47, 177, 181 | Multiple snake_case → camelCase fixes |
| `backend/src/features/groups/group.repository.ts` | 294 | `created_at` → `createdAt` |
| `backend/src/features/invitations/invitation.repository.ts` | 82 | `created_at` → `createdAt` |
| `backend/src/features/message-logs/message-log.repository.ts` | 159, 183, 195 | `created_at` → `createdAt`, `broadcast_id` → `broadcastId` |
| `backend/src/features/custom-fields/custom-field.repository.ts` | 71-72 | `entity_type` → `entityType`, `display_order` → `displayOrder` |

## Prevention

1. **Code Review Checklist:** In TypeORM QueryBuilder, always use entity property names (camelCase), never database column names (snake_case)
2. **TypeScript:** Consider using typed query builders or repository methods that enforce type safety
3. **Testing:** Add integration tests that hit actual database queries

## Related Issue

The log also showed a 403 error for `inbox:note:own` permission. This is NOT a bug - the user needs the `agent` or `manager` role. Run migrations on production:
```bash
npm run migration:run
```

## Verification

Build passes: `npm run build` completes successfully.
