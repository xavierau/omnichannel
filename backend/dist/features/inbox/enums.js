"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentAction = exports.NoteScope = exports.MessageDeliveryStatus = exports.MessageContentType = exports.MessageDirection = exports.ConversationStatus = void 0;
/**
 * Conversation status enum.
 * Tracks the lifecycle state of a conversation.
 */
var ConversationStatus;
(function (ConversationStatus) {
    ConversationStatus["UNASSIGNED"] = "unassigned";
    ConversationStatus["ACTIVE"] = "active";
    ConversationStatus["WAITING"] = "waiting";
    ConversationStatus["RESOLVED"] = "resolved";
    ConversationStatus["CLOSED"] = "closed";
})(ConversationStatus || (exports.ConversationStatus = ConversationStatus = {}));
/**
 * Message direction enum.
 * Indicates whether a message was received from or sent to the customer.
 */
var MessageDirection;
(function (MessageDirection) {
    MessageDirection["INBOUND"] = "inbound";
    MessageDirection["OUTBOUND"] = "outbound";
})(MessageDirection || (exports.MessageDirection = MessageDirection = {}));
/**
 * Message content type enum.
 * Defines the type of content contained in a message.
 */
var MessageContentType;
(function (MessageContentType) {
    MessageContentType["TEXT"] = "text";
    MessageContentType["IMAGE"] = "image";
    MessageContentType["VIDEO"] = "video";
    MessageContentType["AUDIO"] = "audio";
    MessageContentType["DOCUMENT"] = "document";
    MessageContentType["TEMPLATE"] = "template";
    MessageContentType["LOCATION"] = "location";
    MessageContentType["STICKER"] = "sticker";
    MessageContentType["CONTACT"] = "contact";
    MessageContentType["REACTION"] = "reaction";
    MessageContentType["INTERACTIVE"] = "interactive";
})(MessageContentType || (exports.MessageContentType = MessageContentType = {}));
/**
 * Message delivery status enum.
 * Tracks the delivery lifecycle of an outbound message.
 */
var MessageDeliveryStatus;
(function (MessageDeliveryStatus) {
    MessageDeliveryStatus["PENDING"] = "pending";
    MessageDeliveryStatus["QUEUED"] = "queued";
    MessageDeliveryStatus["SENT"] = "sent";
    MessageDeliveryStatus["DELIVERED"] = "delivered";
    MessageDeliveryStatus["READ"] = "read";
    MessageDeliveryStatus["FAILED"] = "failed";
})(MessageDeliveryStatus || (exports.MessageDeliveryStatus = MessageDeliveryStatus = {}));
/**
 * Note scope enum.
 * Determines the visibility context of an internal note.
 */
var NoteScope;
(function (NoteScope) {
    NoteScope["CONVERSATION"] = "conversation";
    NoteScope["CUSTOMER"] = "customer";
})(NoteScope || (exports.NoteScope = NoteScope = {}));
/**
 * Assignment action enum.
 * Records the type of assignment change that occurred.
 */
var AssignmentAction;
(function (AssignmentAction) {
    AssignmentAction["ASSIGNED"] = "assigned";
    AssignmentAction["RELEASED"] = "released";
    AssignmentAction["TRANSFERRED"] = "transferred";
})(AssignmentAction || (exports.AssignmentAction = AssignmentAction = {}));
