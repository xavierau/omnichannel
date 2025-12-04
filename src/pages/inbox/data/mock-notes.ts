import type { Note } from "../types"

// Helper to create dates relative to now
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000)
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

export const mockNotes: Note[] = [
  // Note 1: Conversation-scoped note for conv-1/cust-1 (John Doe) by Alice Chen
  {
    id: "note-1",
    scope: "conversation",
    conversationId: "conv-1",
    customerId: "cust-1",
    content: "Customer confirmed delivery address. Escalated to logistics team for tracking update.",
    mentions: [],
    authorId: "op-1",
    authorName: "Alice Chen",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    createdAt: hoursAgo(1.5),
    updatedAt: hoursAgo(1.5),
  },

  // Note 2: Customer-scoped note for cust-1 (John Doe) by Bob Smith with mention
  {
    id: "note-2",
    scope: "customer",
    conversationId: "conv-1",
    customerId: "cust-1",
    content: "VIP customer - previous orders total $2,500+. @Alice Chen please prioritize their requests.",
    mentions: [
      {
        operatorId: "op-1",
        operatorName: "Alice Chen",
        startIndex: 47,
        endIndex: 58,
      },
    ],
    authorId: "op-2",
    authorName: "Bob Smith",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },

  // Note 3: Conversation-scoped note for conv-3/cust-3 (Michael Brown) by Bob Smith
  {
    id: "note-3",
    scope: "conversation",
    conversationId: "conv-3",
    customerId: "cust-3",
    content: "Customer considering cancellation due to pricing. Offered 50% retention discount. Awaiting response within 48 hours.",
    mentions: [],
    authorId: "op-2",
    authorName: "Bob Smith",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    createdAt: hoursAgo(4.5),
    updatedAt: hoursAgo(4.5),
  },

  // Note 4: Customer-scoped note for cust-3 (Michael Brown) by Carol Davis with mention
  {
    id: "note-4",
    scope: "customer",
    conversationId: "conv-3",
    customerId: "cust-3",
    content: "Price-sensitive customer. Has cancelled before and returned. @Bob Smith @Emma Wilson coordinate on retention strategy.",
    mentions: [
      {
        operatorId: "op-2",
        operatorName: "Bob Smith",
        startIndex: 56,
        endIndex: 66,
      },
      {
        operatorId: "op-5",
        operatorName: "Emma Wilson",
        startIndex: 67,
        endIndex: 79,
      },
    ],
    authorId: "op-3",
    authorName: "Carol Davis",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(14),
  },

  // Note 5: Conversation-scoped note for conv-8/cust-8 (Jennifer Martinez) by Emma Wilson
  {
    id: "note-5",
    scope: "conversation",
    conversationId: "conv-8",
    customerId: "cust-8",
    content: "URGENT: Double charge issue. @David Lee please verify with finance team ASAP. Customer provided bank statement as proof.",
    mentions: [
      {
        operatorId: "op-4",
        operatorName: "David Lee",
        startIndex: 30,
        endIndex: 40,
      },
    ],
    authorId: "op-5",
    authorName: "Emma Wilson",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    createdAt: hoursAgo(0.5),
    updatedAt: hoursAgo(0.5),
  },

  // Note 6: Customer-scoped note for cust-8 (Jennifer Martinez) by Alice Chen
  {
    id: "note-6",
    scope: "customer",
    conversationId: "conv-8",
    customerId: "cust-8",
    content: "First-time customer. Purchased premium plan on 2024-11-28. Payment method: Credit Card ending 4521.",
    mentions: [],
    authorId: "op-1",
    authorName: "Alice Chen",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
]
