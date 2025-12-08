"use strict";
/**
 * Inbox Repositories
 *
 * This module exports all repositories for the inbox feature:
 * - ConversationRepository: Core conversation management with team-based access control
 * - ConversationMessageRepository: Message CRUD and delivery status tracking
 * - ConversationNoteRepository: Internal notes with @mentions support
 * - ConversationAssignmentRepository: Audit trail for conversation assignments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationAssignmentRepository = exports.ConversationNoteRepository = exports.ConversationMessageRepository = exports.ConversationRepository = void 0;
var conversation_repository_1 = require("./conversation.repository");
Object.defineProperty(exports, "ConversationRepository", { enumerable: true, get: function () { return conversation_repository_1.ConversationRepository; } });
var conversation_message_repository_1 = require("./conversation-message.repository");
Object.defineProperty(exports, "ConversationMessageRepository", { enumerable: true, get: function () { return conversation_message_repository_1.ConversationMessageRepository; } });
var conversation_note_repository_1 = require("./conversation-note.repository");
Object.defineProperty(exports, "ConversationNoteRepository", { enumerable: true, get: function () { return conversation_note_repository_1.ConversationNoteRepository; } });
var conversation_assignment_repository_1 = require("./conversation-assignment.repository");
Object.defineProperty(exports, "ConversationAssignmentRepository", { enumerable: true, get: function () { return conversation_assignment_repository_1.ConversationAssignmentRepository; } });
