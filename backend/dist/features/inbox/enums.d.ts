/**
 * Conversation status enum.
 * Tracks the lifecycle state of a conversation.
 */
export declare enum ConversationStatus {
    UNASSIGNED = "unassigned",
    ACTIVE = "active",
    WAITING = "waiting",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
/**
 * Message direction enum.
 * Indicates whether a message was received from or sent to the customer.
 */
export declare enum MessageDirection {
    INBOUND = "inbound",
    OUTBOUND = "outbound"
}
/**
 * Message content type enum.
 * Defines the type of content contained in a message.
 */
export declare enum MessageContentType {
    TEXT = "text",
    IMAGE = "image",
    VIDEO = "video",
    AUDIO = "audio",
    DOCUMENT = "document",
    TEMPLATE = "template",
    LOCATION = "location",
    STICKER = "sticker",
    CONTACT = "contact",
    REACTION = "reaction",
    INTERACTIVE = "interactive"
}
/**
 * Message delivery status enum.
 * Tracks the delivery lifecycle of an outbound message.
 */
export declare enum MessageDeliveryStatus {
    PENDING = "pending",
    QUEUED = "queued",
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read",
    FAILED = "failed"
}
/**
 * Note scope enum.
 * Determines the visibility context of an internal note.
 */
export declare enum NoteScope {
    CONVERSATION = "conversation",
    CUSTOMER = "customer"
}
/**
 * Assignment action enum.
 * Records the type of assignment change that occurred.
 */
export declare enum AssignmentAction {
    ASSIGNED = "assigned",
    RELEASED = "released",
    TRANSFERRED = "transferred"
}
