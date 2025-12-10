# Inbox Channel Badges Implementation Guide

**Date**: 2025-12-10
**Feature**: Channel Account Badges in Inbox
**Status**: Completed

## Overview

This guide documents the implementation of channel account badges in the inbox to display which channel account each conversation belongs to. The feature includes visual badges in the conversation list and chat header, plus a channel filter for managing multi-channel conversations.

## Implementation Summary

### 1. Channel Configuration System

**File**: `/src/lib/channel-config.ts`

Created a centralized configuration system for all channel types with:
- Type-safe channel definitions (whatsapp, sms, messenger, telegram, email)
- Channel-specific icons from lucide-react
- Brand colors for each channel (primary, background, border)
- Helper functions: `getChannelConfig()`, `truncateChannelName()`

```typescript
export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  whatsapp: {
    type: 'whatsapp',
    displayName: 'WhatsApp',
    icon: MessageCircle,
    color: {
      primary: 'rgb(37, 211, 102)',
      background: 'rgba(37, 211, 102, 0.1)',
      border: 'rgba(37, 211, 102, 0.2)',
    },
  },
  // ... other channels
}
```

### 2. Type System Updates

**Files**:
- `/src/pages/inbox/types.ts`
- `/src/services/inbox.service.ts`

Added new interfaces:
```typescript
export interface Channel {
  id: string
  code: string  // 'whatsapp', 'sms', etc.
  name: string
}

export interface ChannelAccount {
  id: string
  name: string  // e.g., "Support Line"
  phoneNumber: string | null
  channel: Channel
}
```

Updated `Conversation` interface to include `channelAccount: ChannelAccount`

Updated `ConversationFilters` to include `channelAccountIds: string[]`

### 3. ChannelBadge Component

**File**: `/src/pages/inbox/components/ChannelBadge.tsx`

A reusable, memoized component with two variants:

**Props**:
- `channelAccount: ChannelAccount` - The channel account to display
- `variant?: 'compact' | 'full'` - Display mode
- `showTooltip?: boolean` - Whether to show tooltip on hover

**Features**:
- **Compact variant**: Icon + abbreviated name (max 12 chars) for lists
- **Full variant**: Icon + full name for headers
- **Tooltip**: Shows full details (channel account name, phone, channel type)
- **Accessibility**: Proper ARIA labels
- **Performance**: React.memo for list optimization
- **Styling**: Channel-specific colors with subtle backgrounds

**Usage**:
```tsx
<ChannelBadge
  channelAccount={conversation.channelAccount}
  variant="compact"
  showTooltip
/>
```

### 4. UI Integration

#### ConversationListItem
**File**: `/src/pages/inbox/components/ConversationListItem.tsx`

Added ChannelBadge between avatar and customer name:
- Displays compact badge with tooltip
- Shows channel account name and phone
- Maintains responsive layout

#### ChatHeader
**File**: `/src/pages/inbox/components/ChatHeader.tsx`

Added ChannelBadge before customer name:
- Displays full variant without tooltip
- More prominent in header context
- Removed generic MessageCircle icon

### 5. Channel Filtering

#### ConversationFilters
**File**: `/src/pages/inbox/components/ConversationFilters.tsx`

Added multi-select channel account filter:

**New Props**:
- `availableChannelAccounts: ChannelAccount[]` - List of unique channel accounts
- Filter is only shown when channel accounts are available

**Features**:
- Multi-select dropdown with checkboxes
- Channel icon + name display in options
- Badge shows count of selected channels
- "Clear filters" button
- Memoized channel config lookups for performance

#### ConversationList
**File**: `/src/pages/inbox/components/ConversationList.tsx`

Updated filtering logic:
```typescript
// Channel account filter
if (
  filters.channelAccountIds.length > 0 &&
  !filters.channelAccountIds.includes(conversation.channelAccount.id)
) {
  return false
}
```

Updated `hasFilters` check to include channel filter

### 6. Data Flow Updates

#### InboxPage
**File**: `/src/pages/inbox/InboxPage.tsx`

**New computed value**:
```typescript
const availableChannelAccounts = useMemo(() => {
  const uniqueAccounts = new Map()
  conversations.forEach((conv) => {
    if (!uniqueAccounts.has(conv.channelAccount.id)) {
      uniqueAccounts.set(conv.channelAccount.id, conv.channelAccount)
    }
  })
  return Array.from(uniqueAccounts.values())
}, [conversations])
```

**Adapter update**:
```typescript
function toFrontendConversation(apiConversation: ApiConversation, messages: Message[] = []): Conversation {
  const channelAccount = apiConversation.channelAccount || {
    // Fallback for backward compatibility
    id: apiConversation.channelAccountId || "default",
    name: "Default Channel",
    phoneNumber: null,
    channel: { id: "1", code: "whatsapp", name: "WhatsApp" },
  }
  // ...
}
```

#### Mock Data
**File**: `/src/pages/inbox/data/mock-conversations.ts`

Added mock channel accounts:
- `mockWhatsAppSupport` - Support Line
- `mockWhatsAppSales` - Sales WhatsApp

Updated all 12 mock conversations with `channelAccount` property

## React Best Practices Applied

### 1. Component Composition
- ChannelBadge is a small, focused, reusable component
- Single responsibility: displaying channel account information
- Composable into different contexts (list items, headers)

### 2. Performance Optimization
- **React.memo**: ChannelBadge memoized to prevent re-renders in large lists
- **useMemo**:
  - Channel config lookups
  - Available channel accounts computation
  - Channel accounts with config in filters
- **useCallback**: All event handlers in filters

### 3. Hooks Usage
- Proper dependency arrays in all hooks
- No unnecessary re-renders
- Memoization of expensive computations

### 4. Accessibility
- Proper ARIA labels on badges
- Descriptive aria-label: "Channel: Support Line - WhatsApp"
- Keyboard navigation support in filters
- Screen reader support through semantic HTML

### 5. Type Safety
- Strict TypeScript typing throughout
- No `any` types
- Proper interface definitions
- Type-safe channel configuration

### 6. Error Handling
- Graceful fallback for missing channel account data
- Backward compatible with optional channelAccount in API
- Generic fallback config for unknown channel types

## Backend Integration

The frontend is ready to receive `channelAccount` from the backend API:

**Expected API Response**:
```typescript
{
  "id": "conv-1",
  "customerId": "cust-1",
  "customer": { ... },
  "channelAccountId": "ca-1",
  "channelAccount": {  // New field
    "id": "ca-1",
    "name": "Support Line",
    "phoneNumber": "+1 555-100-0001",
    "channel": {
      "id": "ch-1",
      "code": "whatsapp",
      "name": "WhatsApp"
    }
  },
  // ... other fields
}
```

The adapter handles both cases:
- When `channelAccount` is provided: uses it directly
- When missing: creates fallback based on `channelAccountId`

## Testing Considerations

When testing this feature:

1. **Badge Display**:
   - Verify badges appear in conversation list
   - Verify badges appear in chat header
   - Check tooltip shows on hover (list items only)

2. **Channel Filter**:
   - Multi-select works correctly
   - Filtering logic includes/excludes conversations properly
   - "Clear all" clears channel filters
   - Filter badge shows correct count

3. **Responsive Behavior**:
   - Badges display correctly on mobile/tablet
   - Truncation works in compact mode
   - Layout doesn't break with long channel names

4. **Accessibility**:
   - Keyboard navigation works in filter
   - Screen reader announces channel information
   - ARIA labels are descriptive

5. **Performance**:
   - No lag with large conversation lists
   - Filters apply quickly
   - No unnecessary re-renders

## File Manifest

### New Files
- `/src/lib/channel-config.ts` - Channel configuration system
- `/src/pages/inbox/components/ChannelBadge.tsx` - Badge component

### Modified Files
- `/src/pages/inbox/types.ts` - Added Channel, ChannelAccount interfaces
- `/src/services/inbox.service.ts` - Added channel types to API contract
- `/src/pages/inbox/components/ConversationListItem.tsx` - Added badge display
- `/src/pages/inbox/components/ChatHeader.tsx` - Added badge display
- `/src/pages/inbox/components/ConversationFilters.tsx` - Added channel filter
- `/src/pages/inbox/components/ConversationList.tsx` - Added filter logic
- `/src/pages/inbox/InboxPage.tsx` - Added channel account extraction and data flow
- `/src/pages/inbox/data/mock-conversations.ts` - Added mock channel accounts

## Next Steps

1. **Backend Integration**: Backend team needs to include `channelAccount` object in conversation API responses
2. **Additional Channels**: When adding new channels, simply update `CHANNEL_CONFIGS` in `channel-config.ts`
3. **Custom Channel Colors**: Can be configured per channel account in the future
4. **Channel Account Management**: Consider adding UI for managing channel accounts

## Dependencies

All dependencies were already present:
- `lucide-react` - For icons
- `@/components/ui/badge` - Shadcn badge component
- `@/components/ui/tooltip` - Shadcn tooltip component
- `@/components/ui/dropdown-menu` - Shadcn dropdown for filters
- `@/components/ui/command` - Shadcn command palette for filter UI
