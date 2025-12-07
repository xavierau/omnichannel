// Enums
export {
  ConversationStatus,
  MessageDirection,
  MessageContentType,
  MessageDeliveryStatus,
  NoteScope,
  AssignmentAction,
} from './enums';

// Entities
export { Conversation } from './entities/conversation.entity';
export { ConversationMessage } from './entities/conversation-message.entity';
export { ConversationNote, NoteMention } from './entities/conversation-note.entity';
export { ConversationAssignment } from './entities/conversation-assignment.entity';

// Repositories
export {
  ConversationRepository,
  ConversationQueryOptions,
  PaginatedResult,
} from './repositories/conversation.repository';

export {
  ConversationMessageRepository,
  PaginationOptions,
  DeliveryStatusTimestamps,
  PaginatedResult as MessagePaginatedResult,
} from './repositories/conversation-message.repository';

export { ConversationNoteRepository } from './repositories/conversation-note.repository';

export { ConversationAssignmentRepository } from './repositories/conversation-assignment.repository';

// Services
export { ConversationService } from './services/conversation.service';
export { InboxSseService } from './services/inbox-sse.service';
export type { InboxSseEventType } from './services/inbox-sse.service';
export { InboxNoteService, CreateNoteData, UpdateNoteData } from './services/inbox-note.service';

// Controller
export { InboxController } from './inbox.controller';

// Routes
export { default as inboxRoutes } from './inbox.routes';

// DTOs
export {
  ConversationQueryDto,
  SendMessageDto,
  TextContentDto,
  MediaContentDto,
  TemplateContentDto,
  CreateNoteDto,
  UpdateNoteDto,
  AssignConversationDto,
  UpdateStatusDto,
  MessageQueryDto,
} from './dto';
export type { TemplateVariables } from './dto';
