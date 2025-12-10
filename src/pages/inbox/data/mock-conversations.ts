import type { Conversation, Message, ChannelAccount } from "../types"

// Helper to create dates relative to now
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000)
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000)

// Mock channel accounts
const mockWhatsAppSupport: ChannelAccount = {
  id: "ca-1",
  name: "Support Line",
  phoneNumber: "+1 555-100-0001",
  channel: {
    id: "ch-1",
    code: "whatsapp",
    name: "WhatsApp",
  },
}

const mockWhatsAppSales: ChannelAccount = {
  id: "ca-2",
  name: "Sales WhatsApp",
  phoneNumber: "+1 555-100-0002",
  channel: {
    id: "ch-1",
    code: "whatsapp",
    name: "WhatsApp",
  },
}

// Message generators
const createMessage = (
  id: string,
  conversationId: string,
  direction: "inbound" | "outbound",
  type: "text" | "image" | "document" | "audio" | "template",
  content: string,
  timestamp: Date,
  status: "sending" | "sent" | "delivered" | "read" = "read",
  extra: Partial<Message> = {}
): Message => ({
  id,
  conversationId,
  direction,
  type,
  content,
  status: direction === "inbound" ? "read" : status,
  timestamp,
  ...extra,
})

// System message generator (no direction)
const createSystemMessage = (
  id: string,
  conversationId: string,
  content: string,
  timestamp: Date
): Message => ({
  id,
  conversationId,
  direction: "inbound", // System messages use inbound for display purposes
  type: "system",
  content,
  status: "read",
  timestamp,
})

// Conversation 1: Active support chat with multiple message types
const conv1Messages: Message[] = [
  createMessage("m1-1", "conv-1", "inbound", "text", "Hi, I need help with my order #12345", hoursAgo(2)),
  createMessage("m1-2", "conv-1", "outbound", "text", "Hello! I'd be happy to help you with your order. Let me look that up for you.", hoursAgo(1.9), "read", { operatorId: "op-1", operatorName: "Alice Chen" }),
  createMessage("m1-3", "conv-1", "inbound", "text", "Thanks! The delivery status hasn't updated in 3 days", hoursAgo(1.8)),
  createMessage("m1-4", "conv-1", "outbound", "text", "I see. Let me check with our logistics team. Could you please confirm your delivery address?", hoursAgo(1.7), "read", { operatorId: "op-1", operatorName: "Alice Chen" }),
  createMessage("m1-5", "conv-1", "inbound", "text", "123 Main Street, Apartment 4B, New York, NY 10001", hoursAgo(1.6)),
  createMessage("m1-6", "conv-1", "inbound", "image", "Here's a screenshot of my order confirmation", hoursAgo(1.5), "read", {
    attachment: {
      type: "image",
      url: "https://placehold.co/400x300/e2e8f0/64748b?text=Order+Screenshot",
      filename: "order_confirmation.png",
    },
  }),
  createMessage("m1-7", "conv-1", "outbound", "text", "Thank you for the screenshot. I've escalated this to our logistics team. You should receive an update within 24 hours.", hoursAgo(1.4), "read", { operatorId: "op-1", operatorName: "Alice Chen" }),
  createMessage("m1-8", "conv-1", "inbound", "text", "Okay, thank you for your help!", hoursAgo(1.3)),
  createMessage("m1-9", "conv-1", "inbound", "text", "Actually, I just received an update - it says out for delivery now!", minutesAgo(30)),
  createMessage("m1-10", "conv-1", "outbound", "text", "That's great news! 🎉 Is there anything else I can help you with?", minutesAgo(25), "delivered", { operatorId: "op-1", operatorName: "Alice Chen" }),
]

// Conversation 2: Unassigned new inquiry
const conv2Messages: Message[] = [
  createMessage("m2-1", "conv-2", "inbound", "text", "Hello, I'm interested in your premium subscription plan", minutesAgo(15)),
  createMessage("m2-2", "conv-2", "inbound", "text", "Can you tell me more about the pricing?", minutesAgo(14)),
  createMessage("m2-3", "conv-2", "inbound", "text", "Also, do you offer any discounts for annual plans?", minutesAgo(12)),
]

// Conversation 3: Waiting for customer response
const conv3Messages: Message[] = [
  createMessage("m3-1", "conv-3", "inbound", "text", "I want to cancel my subscription", hoursAgo(5)),
  createMessage("m3-2", "conv-3", "outbound", "text", "I'm sorry to hear you want to cancel. Could you tell me what made you decide to cancel? We'd love to address any concerns.", hoursAgo(4.9), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
  createMessage("m3-3", "conv-3", "inbound", "text", "It's just too expensive for me right now", hoursAgo(4.8)),
  createMessage("m3-4", "conv-3", "outbound", "text", "I understand. We have a special retention offer - 50% off for the next 3 months. Would you be interested?", hoursAgo(4.7), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
  createMessage("m3-5", "conv-3", "inbound", "text", "Let me think about it", hoursAgo(4.6)),
  createMessage("m3-6", "conv-3", "outbound", "text", "Of course! Take your time. This offer will be valid for the next 48 hours. Feel free to reach out if you have any questions.", hoursAgo(4.5), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
]

// Conversation 4: Document sharing
const conv4Messages: Message[] = [
  createMessage("m4-1", "conv-4", "inbound", "text", "Hi, I need the invoice for my last purchase", hoursAgo(3)),
  createMessage("m4-2", "conv-4", "outbound", "text", "Sure, let me get that for you. One moment please.", hoursAgo(2.9), "read", { operatorId: "op-1", operatorName: "Alice Chen" }),
  createMessage("m4-3", "conv-4", "outbound", "document", "Here's your invoice for order #98765", hoursAgo(2.8), "read", {
    operatorId: "op-1",
    operatorName: "Alice Chen",
    attachment: {
      type: "document",
      url: "https://example.com/invoice.pdf",
      filename: "Invoice_98765.pdf",
      mimeType: "application/pdf",
      size: 245000,
    },
  }),
  createMessage("m4-4", "conv-4", "inbound", "text", "Perfect, thank you so much!", hoursAgo(2.7)),
  createMessage("m4-5", "conv-4", "outbound", "text", "You're welcome! Is there anything else I can help you with?", hoursAgo(2.6), "read", { operatorId: "op-1", operatorName: "Alice Chen" }),
  createMessage("m4-6", "conv-4", "inbound", "text", "No, that's all. Have a great day!", hoursAgo(2.5)),
]

// Conversation 5: Voice note exchange
const conv5Messages: Message[] = [
  createMessage("m5-1", "conv-5", "inbound", "audio", "", hoursAgo(1), "read", {
    attachment: {
      type: "audio",
      url: "https://example.com/voice1.ogg",
      duration: 15,
    },
  }),
  createMessage("m5-2", "conv-5", "outbound", "text", "I've listened to your voice message. Let me address your concerns about the product quality.", minutesAgo(55), "read", { operatorId: "op-3", operatorName: "Carol Davis" }),
  createMessage("m5-3", "conv-5", "outbound", "text", "We take quality very seriously and offer a 30-day money-back guarantee. Would you like me to process a return for you?", minutesAgo(54), "read", { operatorId: "op-3", operatorName: "Carol Davis" }),
  createMessage("m5-4", "conv-5", "inbound", "text", "Yes please, how do I do that?", minutesAgo(50)),
]

// Conversation 6: Template message usage
const conv6Messages: Message[] = [
  createMessage("m6-1", "conv-6", "outbound", "template", "Hello {{1}}, your order {{2}} has been shipped! Track it here: {{3}}", hoursAgo(6), "delivered", {
    operatorId: "op-2",
    operatorName: "Bob Smith",
    templateId: "tpl-shipping",
    templateName: "Order Shipped Notification",
  }),
  createMessage("m6-2", "conv-6", "inbound", "text", "Great, thanks for the update!", hoursAgo(5.5)),
  createMessage("m6-3", "conv-6", "outbound", "text", "You're welcome! Let us know if you have any questions.", hoursAgo(5.4), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
]

// Conversation 7: Resolved issue
const conv7Messages: Message[] = [
  createMessage("m7-1", "conv-7", "inbound", "text", "The product I received was damaged", hoursAgo(24)),
  createMessage("m7-2", "conv-7", "outbound", "text", "I'm so sorry to hear that. Could you please send me a photo of the damage?", hoursAgo(23.9), "read", { operatorId: "op-1", operatorName: "Alice Chen" }),
  createMessage("m7-3", "conv-7", "inbound", "image", "", hoursAgo(23.8), "read", {
    attachment: {
      type: "image",
      url: "https://placehold.co/400x300/fecaca/991b1b?text=Damaged+Product",
      filename: "damage_photo.jpg",
    },
  }),
  createMessage("m7-4", "conv-7", "outbound", "text", "Thank you for the photo. I've processed a replacement order for you. It should arrive within 3-5 business days.", hoursAgo(23.7), "read", { operatorId: "op-1", operatorName: "Alice Chen" }),
  createMessage("m7-5", "conv-7", "inbound", "text", "Thank you for resolving this so quickly!", hoursAgo(23.6)),
  createMessage("m7-6", "conv-7", "outbound", "text", "You're welcome! I'm glad we could help. The replacement is on its way!", hoursAgo(23.5), "read", { operatorId: "op-1", operatorName: "Alice Chen" }),
  createSystemMessage("m7-7", "conv-7", "Conversation marked as resolved", hoursAgo(23.4)),
]

// Conversation 8: New unassigned with urgency
const conv8Messages: Message[] = [
  createMessage("m8-1", "conv-8", "inbound", "text", "URGENT: I've been charged twice for my order!", minutesAgo(5)),
  createMessage("m8-2", "conv-8", "inbound", "text", "Please help me get a refund ASAP", minutesAgo(4)),
  createMessage("m8-3", "conv-8", "inbound", "image", "Here's the proof from my bank statement", minutesAgo(3), "read", {
    attachment: {
      type: "image",
      url: "https://placehold.co/400x200/fef3c7/92400e?text=Bank+Statement",
      filename: "bank_statement.png",
    },
  }),
]

// Conversation 9: Long conversation history
const conv9Messages: Message[] = [
  createMessage("m9-1", "conv-9", "inbound", "text", "Hi, I have a question about your return policy", hoursAgo(48)),
  createMessage("m9-2", "conv-9", "outbound", "text", "Hello! I'd be happy to explain our return policy. What would you like to know?", hoursAgo(47.9), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
  createMessage("m9-3", "conv-9", "inbound", "text", "How many days do I have to return an item?", hoursAgo(47.8)),
  createMessage("m9-4", "conv-9", "outbound", "text", "You have 30 days from the date of delivery to return any item for a full refund.", hoursAgo(47.7), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
  createMessage("m9-5", "conv-9", "inbound", "text", "What about electronics?", hoursAgo(47.6)),
  createMessage("m9-6", "conv-9", "outbound", "text", "Electronics have a 15-day return window, but they must be unopened and in original packaging.", hoursAgo(47.5), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
  createMessage("m9-7", "conv-9", "inbound", "text", "I see, thank you. One more question - do you cover return shipping?", hoursAgo(47.4)),
  createMessage("m9-8", "conv-9", "outbound", "text", "Yes, we provide free return shipping for all items over $50. For items under $50, there's a flat $5.99 return shipping fee.", hoursAgo(47.3), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
  createMessage("m9-9", "conv-9", "inbound", "text", "Perfect, that's very helpful!", hoursAgo(47.2)),
  createMessage("m9-10", "conv-9", "inbound", "text", "Actually, I'd like to initiate a return now", hoursAgo(24)),
  createMessage("m9-11", "conv-9", "outbound", "text", "Of course! Could you provide me with your order number?", hoursAgo(23.9), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
  createMessage("m9-12", "conv-9", "inbound", "text", "Order #54321", hoursAgo(23.8)),
  createMessage("m9-13", "conv-9", "outbound", "text", "I've initiated the return for order #54321. You should receive a return label via email shortly.", hoursAgo(23.7), "read", { operatorId: "op-2", operatorName: "Bob Smith" }),
  createMessage("m9-14", "conv-9", "inbound", "text", "Got it, thanks!", hoursAgo(23.6)),
]

// Conversation 10: Closed conversation
const conv10Messages: Message[] = [
  createMessage("m10-1", "conv-10", "inbound", "text", "Is this chat still available?", hoursAgo(72)),
  createMessage("m10-2", "conv-10", "outbound", "text", "Yes, how can I help you today?", hoursAgo(71.9), "read", { operatorId: "op-3", operatorName: "Carol Davis" }),
  createMessage("m10-3", "conv-10", "inbound", "text", "Never mind, I figured it out myself. Thanks!", hoursAgo(71.8)),
  createMessage("m10-4", "conv-10", "outbound", "text", "Great to hear! Feel free to reach out if you need anything else.", hoursAgo(71.7), "read", { operatorId: "op-3", operatorName: "Carol Davis" }),
  createSystemMessage("m10-5", "conv-10", "Conversation closed by customer", hoursAgo(71.6)),
]

// Conversation 11: Busy operator's conversation
const conv11Messages: Message[] = [
  createMessage("m11-1", "conv-11", "inbound", "text", "I need help setting up my new account", hoursAgo(0.5)),
  createMessage("m11-2", "conv-11", "outbound", "text", "Welcome! I'll guide you through the account setup process.", minutesAgo(28), "delivered", { operatorId: "op-3", operatorName: "Carol Davis" }),
  createMessage("m11-3", "conv-11", "outbound", "text", "First, could you tell me what type of account you'd like to set up?", minutesAgo(27), "delivered", { operatorId: "op-3", operatorName: "Carol Davis" }),
  createMessage("m11-4", "conv-11", "inbound", "text", "A business account", minutesAgo(20)),
]

// Conversation 12: Another unassigned
const conv12Messages: Message[] = [
  createMessage("m12-1", "conv-12", "inbound", "text", "Do you ship internationally?", minutesAgo(8)),
  createMessage("m12-2", "conv-12", "inbound", "text", "I'm located in Canada", minutesAgo(7)),
]

export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    customerId: "cust-1",
    customerName: "John Doe",
    customerWhatsappNumber: "+1 555-123-4567",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSupport,
    status: "active",
    assignedToId: "op-1",
    assignedToName: "Alice Chen",
    messages: conv1Messages,
    unreadCount: 1,
    lastMessageAt: minutesAgo(25),
    lastMessagePreview: "That's great news! 🎉 Is there anything else I can help you with?",
    createdAt: hoursAgo(2),
    updatedAt: minutesAgo(25),
  },
  {
    id: "conv-2",
    customerId: "cust-2",
    customerName: "Sarah Johnson",
    customerWhatsappNumber: "+1 555-234-5678",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSales,
    status: "unassigned",
    assignedToId: null,
    assignedToName: null,
    messages: conv2Messages,
    unreadCount: 3,
    lastMessageAt: minutesAgo(12),
    lastMessagePreview: "Also, do you offer any discounts for annual plans?",
    createdAt: minutesAgo(15),
    updatedAt: minutesAgo(12),
  },
  {
    id: "conv-3",
    customerId: "cust-3",
    customerName: "Michael Brown",
    customerWhatsappNumber: "+1 555-345-6789",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSupport,
    status: "waiting",
    assignedToId: "op-2",
    assignedToName: "Bob Smith",
    messages: conv3Messages,
    unreadCount: 0,
    lastMessageAt: hoursAgo(4.5),
    lastMessagePreview: "Of course! Take your time. This offer will be valid for the next 48 hours.",
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(4.5),
  },
  {
    id: "conv-4",
    customerId: "cust-4",
    customerName: "Emily Chen",
    customerWhatsappNumber: "+1 555-456-7890",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSupport,
    status: "active",
    assignedToId: "op-1",
    assignedToName: "Alice Chen",
    messages: conv4Messages,
    unreadCount: 0,
    lastMessageAt: hoursAgo(2.5),
    lastMessagePreview: "No, that's all. Have a great day!",
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(2.5),
  },
  {
    id: "conv-5",
    customerId: "cust-5",
    customerName: "David Wilson",
    customerWhatsappNumber: "+1 555-567-8901",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSales,
    status: "active",
    assignedToId: "op-3",
    assignedToName: "Carol Davis",
    messages: conv5Messages,
    unreadCount: 1,
    lastMessageAt: minutesAgo(50),
    lastMessagePreview: "Yes please, how do I do that?",
    createdAt: hoursAgo(1),
    updatedAt: minutesAgo(50),
  },
  {
    id: "conv-6",
    customerId: "cust-6",
    customerName: "Lisa Anderson",
    customerWhatsappNumber: "+1 555-678-9012",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSupport,
    status: "active",
    assignedToId: "op-2",
    assignedToName: "Bob Smith",
    messages: conv6Messages,
    unreadCount: 0,
    lastMessageAt: hoursAgo(5.4),
    lastMessagePreview: "You're welcome! Let us know if you have any questions.",
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(5.4),
  },
  {
    id: "conv-7",
    customerId: "cust-7",
    customerName: "Robert Taylor",
    customerWhatsappNumber: "+1 555-789-0123",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSupport,
    status: "resolved",
    assignedToId: "op-1",
    assignedToName: "Alice Chen",
    messages: conv7Messages,
    unreadCount: 0,
    lastMessageAt: hoursAgo(23.4),
    lastMessagePreview: "Conversation marked as resolved",
    createdAt: hoursAgo(24),
    updatedAt: hoursAgo(23.4),
  },
  {
    id: "conv-8",
    customerId: "cust-8",
    customerName: "Jennifer Martinez",
    customerWhatsappNumber: "+1 555-890-1234",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSales,
    status: "unassigned",
    assignedToId: null,
    assignedToName: null,
    messages: conv8Messages,
    unreadCount: 3,
    lastMessageAt: minutesAgo(3),
    lastMessagePreview: "Here's the proof from my bank statement",
    createdAt: minutesAgo(5),
    updatedAt: minutesAgo(3),
  },
  {
    id: "conv-9",
    customerId: "cust-9",
    customerName: "William Garcia",
    customerWhatsappNumber: "+1 555-901-2345",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=William",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSupport,
    status: "active",
    assignedToId: "op-2",
    assignedToName: "Bob Smith",
    messages: conv9Messages,
    unreadCount: 0,
    lastMessageAt: hoursAgo(23.6),
    lastMessagePreview: "Got it, thanks!",
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(23.6),
  },
  {
    id: "conv-10",
    customerId: "cust-10",
    customerName: "Amanda White",
    customerWhatsappNumber: "+1 555-012-3456",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSupport,
    status: "closed",
    assignedToId: "op-3",
    assignedToName: "Carol Davis",
    messages: conv10Messages,
    unreadCount: 0,
    lastMessageAt: hoursAgo(71.6),
    lastMessagePreview: "Conversation closed by customer",
    createdAt: hoursAgo(72),
    updatedAt: hoursAgo(71.6),
  },
  {
    id: "conv-11",
    customerId: "cust-11",
    customerName: "Christopher Lee",
    customerWhatsappNumber: "+1 555-111-2222",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSales,
    status: "active",
    assignedToId: "op-3",
    assignedToName: "Carol Davis",
    messages: conv11Messages,
    unreadCount: 1,
    lastMessageAt: minutesAgo(20),
    lastMessagePreview: "A business account",
    createdAt: hoursAgo(0.5),
    updatedAt: minutesAgo(20),
  },
  {
    id: "conv-12",
    customerId: "cust-12",
    customerName: "Michelle Rodriguez",
    customerWhatsappNumber: "+1 555-333-4444",
    customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michelle",
    channel: "whatsapp",
    channelAccount: mockWhatsAppSupport,
    status: "unassigned",
    assignedToId: null,
    assignedToName: null,
    messages: conv12Messages,
    unreadCount: 2,
    lastMessageAt: minutesAgo(7),
    lastMessagePreview: "I'm located in Canada",
    createdAt: minutesAgo(8),
    updatedAt: minutesAgo(7),
  },
]
