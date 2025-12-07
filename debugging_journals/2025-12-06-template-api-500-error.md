# Debugging Journal: Template API 500 Error

**Date:** 2025-12-06
**Issue:** GET /api/templates returning 500 error
**Severity:** Critical
**Status:** RESOLVED

## Symptoms

- GET `/api/templates` endpoint returned 500 Internal Server Error
- Error message: `Cannot read properties of undefined (reading 'databaseName')`
- Templates page in frontend displayed error state instead of template list

## Investigation

### Initial Hypothesis (Incorrect)
Initially suspected the issue was repository initialization timing - repositories calling `AppDataSource.getRepository()` in constructor before database connection was established.

**Actions taken:**
- Implemented lazy initialization pattern across all repositories
- Changed from constructor-based initialization to getter-based lazy loading

**Result:** Issue persisted - this was not the root cause.

### Actual Root Cause

The error originated from TypeORM's `SelectQueryBuilder.createOrderByCombinedWithSelectExpression` method when using:
- `leftJoinAndSelect` on **nullable relations** (specifically `channelAccount`)
- Combined with `orderBy`
- Combined with pagination (`skip`/`take`)

**Stack trace evidence:**
```
TypeError: Cannot read properties of undefined (reading 'databaseName')
    at SelectQueryBuilder.createOrderByCombinedWithSelectExpression (SelectQueryBuilder.ts:3732)
    at SelectQueryBuilder.executeEntitiesAndRawResults (SelectQueryBuilder.ts:3492)
    at SelectQueryBuilder.getMany (SelectQueryBuilder.ts:1761)
    at TemplateRepository.findAll (template.repository.ts:180)
```

**Entity relation causing the issue:**
```typescript
// In template-group.entity.ts
@ManyToOne(() => ChannelAccount, { onDelete: 'SET NULL', nullable: true })
@JoinColumn({ name: 'channel_account_id' })
channelAccount: ChannelAccount | null;
```

When TypeORM builds a paginated query with `skip`/`take`, it creates a subquery for ordering. During this process, it tries to access column metadata for joined relations. For nullable relations where the join result can be `null`, the metadata access fails with `undefined.databaseName`.

## Solution

Implemented a two-phase query pattern to avoid the TypeORM bug:

1. **Phase 1:** Fetch only entity IDs using a simple query with `offset`/`limit` (no joins)
2. **Phase 2:** Fetch full entities by ID with `leftJoinAndSelect` (no pagination needed)

### Code Changes

**File:** `/Users/xavierau/Code/js/ominichannel/backend/src/features/templates/template.repository.ts`

**Before (broken):**
```typescript
const dataQuery = baseQueryBuilder()
  .leftJoinAndSelect('template.translations', 'translations')
  .leftJoinAndSelect('template.channelAccount', 'channelAccount')
  .orderBy(`template.${sortColumn}`, order)
  .skip(skip)
  .take(limit);

const data = await dataQuery.getMany();
```

**After (fixed):**
```typescript
// Phase 1: Fetch IDs only (no joins, safe pagination)
const idsQuery = baseQueryBuilder()
  .select('template.id')
  .orderBy(`template.${sortColumn}`, order)
  .offset(skipCount)
  .limit(limit);

const idResults = await idsQuery.getRawMany<{ template_id: string }>();
const ids = idResults.map((r) => r.template_id);

// Phase 2: Fetch full entities by IDs (no pagination needed)
const data = await this.groupRepository
  .createQueryBuilder('template')
  .leftJoinAndSelect('template.translations', 'translations')
  .leftJoinAndSelect('template.channelAccount', 'channelAccount')
  .where('template.id IN (:...ids)', { ids })
  .orderBy(`template.${sortColumn}`, order)
  .getMany();
```

**Methods updated:**
- `findAll()` - lines 163-216
- `findApproved()` - lines 284-337

## Prevention

1. **Pattern Recognition:** When using TypeORM with nullable relations (`nullable: true` or `onDelete: 'SET NULL'`), avoid combining `leftJoinAndSelect` with `skip`/`take` pagination.

2. **Recommended Pattern:** Use the two-phase query approach:
   - First query: Get paginated IDs (no joins)
   - Second query: Fetch entities by IDs (with joins, no pagination)

3. **Alternative:** Use raw SQL for complex paginated queries with nullable joins.

4. **TypeORM Version:** This is a known bug in TypeORM. Monitor for fixes in future versions.

## Verification

- API curl test returns 200 with proper JSON response
- Chrome DevTools shows successful network requests
- Frontend Templates page loads correctly with empty state

## Related Files

- `/Users/xavierau/Code/js/ominichannel/backend/src/features/templates/template.repository.ts` (modified)
- `/Users/xavierau/Code/js/ominichannel/backend/src/features/templates/template-group.entity.ts` (reference - nullable relation)
