import 'reflect-metadata';
import { InboxNoteService } from '../inbox-note.service';
import { ConversationNoteRepository } from '../../repositories/conversation-note.repository';
import { ConversationRepository } from '../../repositories/conversation.repository';
import { InboxSseService } from '../inbox-sse.service';
import { TeamService } from '../../../teams/services/team.service';
import { ConversationNote, NoteMention } from '../../entities/conversation-note.entity';
import { Conversation } from '../../entities/conversation.entity';
import { NoteScope, ConversationStatus } from '../../enums';
import {
  NotFoundException,
  ForbiddenException,
} from '../../../../shared/exceptions/http-exceptions';

// Mock the logger to avoid console output during tests
jest.mock('../../../../config/logger.config', () => ({
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('InboxNoteService', () => {
  let service: InboxNoteService;
  let noteRepository: jest.Mocked<ConversationNoteRepository>;
  let conversationRepository: jest.Mocked<ConversationRepository>;
  let sseService: jest.Mocked<InboxSseService>;
  let teamService: jest.Mocked<TeamService>;

  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const conversationId = 'conv-789';
  const customerId = 'customer-222';
  const channelAccountId = 'channel-111';
  const noteId = 'note-999';

  const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation =>
    ({
      id: conversationId,
      tenantId,
      channelAccountId,
      customerId,
      status: ConversationStatus.ACTIVE,
      assignedToId: userId,
      unreadCount: 0,
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageDirection: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Conversation;

  const createMockNote = (overrides: Partial<ConversationNote> = {}): ConversationNote =>
    ({
      id: noteId,
      tenantId,
      conversationId,
      customerId,
      createdById: userId,
      scope: NoteScope.CONVERSATION,
      content: 'Test note content',
      mentions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ConversationNote;

  beforeEach(() => {
    noteRepository = {
      findById: jest.fn(),
      findByConversation: jest.fn(),
      findByCustomer: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ConversationNoteRepository>;

    conversationRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ConversationRepository>;

    sseService = {
      emitToTenant: jest.fn(),
      emitConversationEvent: jest.fn(),
    } as unknown as jest.Mocked<InboxSseService>;

    teamService = {
      getAccessibleChannelAccountIds: jest.fn(),
      hasAccessToChannelAccount: jest.fn(),
    } as unknown as jest.Mocked<TeamService>;

    service = new InboxNoteService(
      noteRepository,
      conversationRepository,
      sseService,
      teamService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // createNote
  // ============================================================================

  describe('createNote', () => {
    it('should create a note when user has conversation access', async () => {
      const mockConversation = createMockConversation();
      const mockNote = createMockNote();
      const noteData = { content: 'Test note content' };

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.create.mockResolvedValue(mockNote);

      const result = await service.createNote(tenantId, conversationId, userId, noteData);

      expect(result).toEqual(mockNote);
      expect(noteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          conversationId,
          customerId,
          createdById: userId,
          content: noteData.content,
          scope: NoteScope.CONVERSATION,
        })
      );
    });

    it('should create a note with customer scope', async () => {
      const mockConversation = createMockConversation();
      const mockNote = createMockNote({ scope: NoteScope.CUSTOMER });
      const noteData = { content: 'Customer note', scope: NoteScope.CUSTOMER };

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.create.mockResolvedValue(mockNote);

      const result = await service.createNote(tenantId, conversationId, userId, noteData);

      expect(result.scope).toBe(NoteScope.CUSTOMER);
      expect(noteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: NoteScope.CUSTOMER,
        })
      );
    });

    it('should create a note with mentions', async () => {
      const mockConversation = createMockConversation();
      const mentions: NoteMention[] = [{ userId: 'mentioned-user', offset: 0, length: 5 }];
      const mockNote = createMockNote({ mentions });
      const noteData = { content: '@user mentioned here', mentions: ['mentioned-user'] };

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.create.mockResolvedValue(mockNote);

      const result = await service.createNote(tenantId, conversationId, userId, noteData);

      expect(result.mentions).toEqual(mentions);
    });

    it('should emit SSE event after creating note', async () => {
      const mockConversation = createMockConversation();
      const mockNote = createMockNote();
      const noteData = { content: 'Test note content' };

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.create.mockResolvedValue(mockNote);

      await service.createNote(tenantId, conversationId, userId, noteData);

      expect(sseService.emitToTenant).toHaveBeenCalledWith(
        tenantId,
        'note:created',
        expect.objectContaining({
          noteId: mockNote.id,
          conversationId,
          customerId,
          scope: mockNote.scope,
          authorId: userId,
          content: mockNote.content,
        })
      );
    });

    it('should throw NotFoundException when conversation not found', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      await expect(
        service.createNote(tenantId, conversationId, userId, { content: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks conversation access', async () => {
      const mockConversation = createMockConversation({
        channelAccountId: 'other-channel',
        assignedToId: 'other-user',
      });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      await expect(
        service.createNote(tenantId, conversationId, userId, { content: 'Test' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // getNotes
  // ============================================================================

  describe('getNotes', () => {
    it('should return conversation notes when scope is conversation', async () => {
      const mockConversation = createMockConversation();
      const mockNotes = [createMockNote(), createMockNote({ id: 'note-2' })];

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.findByConversation.mockResolvedValue(mockNotes);

      const result = await service.getNotes(
        tenantId,
        conversationId,
        userId,
        NoteScope.CONVERSATION
      );

      expect(result).toEqual(mockNotes);
      expect(noteRepository.findByConversation).toHaveBeenCalledWith(
        conversationId,
        NoteScope.CONVERSATION
      );
    });

    it('should return customer notes when scope is customer', async () => {
      const mockConversation = createMockConversation();
      const customerNotes = [createMockNote({ scope: NoteScope.CUSTOMER })];

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.findByCustomer.mockResolvedValue(customerNotes);

      const result = await service.getNotes(
        tenantId,
        conversationId,
        userId,
        NoteScope.CUSTOMER
      );

      expect(result).toEqual(customerNotes);
      expect(noteRepository.findByCustomer).toHaveBeenCalledWith(tenantId, customerId);
    });

    it('should return all notes when scope is undefined', async () => {
      const mockConversation = createMockConversation();
      const conversationNotes = [createMockNote()];
      const customerNotes = [createMockNote({ id: 'note-2', scope: NoteScope.CUSTOMER })];

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.findByConversation.mockResolvedValue(conversationNotes);
      noteRepository.findByCustomer.mockResolvedValue(customerNotes);

      const result = await service.getNotes(tenantId, conversationId, userId);

      expect(result).toHaveLength(2);
      expect(noteRepository.findByConversation).toHaveBeenCalledWith(
        conversationId,
        NoteScope.CONVERSATION
      );
      expect(noteRepository.findByCustomer).toHaveBeenCalledWith(tenantId, customerId);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      await expect(service.getNotes(tenantId, conversationId, userId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      const mockConversation = createMockConversation({
        channelAccountId: 'other-channel',
        assignedToId: 'other-user',
      });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      await expect(service.getNotes(tenantId, conversationId, userId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ============================================================================
  // updateNote
  // ============================================================================

  describe('updateNote', () => {
    it('should update note when user is the author', async () => {
      const mockNote = createMockNote();
      const updatedNote = createMockNote({ content: 'Updated content' });
      const updateData = { content: 'Updated content' };

      noteRepository.findById.mockResolvedValue(mockNote);
      noteRepository.update.mockResolvedValue(updatedNote);

      const result = await service.updateNote(tenantId, noteId, userId, updateData);

      expect(result).toEqual(updatedNote);
      expect(noteRepository.update).toHaveBeenCalledWith(
        tenantId,
        noteId,
        expect.objectContaining({ content: updateData.content })
      );
    });

    it('should update note mentions', async () => {
      const mockNote = createMockNote();
      const mentions: NoteMention[] = [{ userId: 'new-mention', offset: 0, length: 10 }];
      const updatedNote = createMockNote({ mentions });
      const updateData = { mentions: ['new-mention'] };

      noteRepository.findById.mockResolvedValue(mockNote);
      noteRepository.update.mockResolvedValue(updatedNote);

      const result = await service.updateNote(tenantId, noteId, userId, updateData);

      expect(result.mentions).toEqual(mentions);
    });

    it('should emit SSE event after updating note', async () => {
      const mockNote = createMockNote();
      const updatedNote = createMockNote({ content: 'Updated content' });
      const updateData = { content: 'Updated content' };

      noteRepository.findById.mockResolvedValue(mockNote);
      noteRepository.update.mockResolvedValue(updatedNote);

      await service.updateNote(tenantId, noteId, userId, updateData);

      expect(sseService.emitToTenant).toHaveBeenCalledWith(
        tenantId,
        'note:updated',
        expect.objectContaining({
          noteId,
          conversationId,
          content: updatedNote.content,
        })
      );
    });

    it('should throw NotFoundException when note not found', async () => {
      noteRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateNote(tenantId, noteId, userId, { content: 'Updated' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const mockNote = createMockNote({ createdById: 'other-user' });
      noteRepository.findById.mockResolvedValue(mockNote);

      await expect(
        service.updateNote(tenantId, noteId, userId, { content: 'Updated' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when update fails', async () => {
      const mockNote = createMockNote();
      noteRepository.findById.mockResolvedValue(mockNote);
      noteRepository.update.mockResolvedValue(null);

      await expect(
        service.updateNote(tenantId, noteId, userId, { content: 'Updated' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // deleteNote
  // ============================================================================

  describe('deleteNote', () => {
    it('should delete note when user is the author', async () => {
      const mockNote = createMockNote();

      noteRepository.findById.mockResolvedValue(mockNote);
      noteRepository.delete.mockResolvedValue(true);

      await service.deleteNote(tenantId, noteId, userId);

      expect(noteRepository.delete).toHaveBeenCalledWith(tenantId, noteId);
    });

    it('should emit SSE event after deleting note', async () => {
      const mockNote = createMockNote();

      noteRepository.findById.mockResolvedValue(mockNote);
      noteRepository.delete.mockResolvedValue(true);

      await service.deleteNote(tenantId, noteId, userId);

      expect(sseService.emitToTenant).toHaveBeenCalledWith(
        tenantId,
        'note:deleted',
        expect.objectContaining({
          noteId,
          conversationId,
        })
      );
    });

    it('should throw NotFoundException when note not found', async () => {
      noteRepository.findById.mockResolvedValue(null);

      await expect(service.deleteNote(tenantId, noteId, userId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const mockNote = createMockNote({ createdById: 'other-user' });
      noteRepository.findById.mockResolvedValue(mockNote);

      await expect(service.deleteNote(tenantId, noteId, userId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException when delete fails', async () => {
      const mockNote = createMockNote();
      noteRepository.findById.mockResolvedValue(mockNote);
      noteRepository.delete.mockResolvedValue(false);

      await expect(service.deleteNote(tenantId, noteId, userId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ============================================================================
  // Access Control Edge Cases
  // ============================================================================

  describe('access control', () => {
    it('should allow access when user is assigned to conversation', async () => {
      const mockConversation = createMockConversation({
        channelAccountId: 'other-channel',
        assignedToId: userId,
      });
      const mockNote = createMockNote();

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.create.mockResolvedValue(mockNote);

      const result = await service.createNote(tenantId, conversationId, userId, {
        content: 'Test',
      });

      expect(result).toEqual(mockNote);
    });

    it('should allow access when user has channel access', async () => {
      const mockConversation = createMockConversation({
        assignedToId: null,
      });
      const mockNote = createMockNote();

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      noteRepository.create.mockResolvedValue(mockNote);

      const result = await service.createNote(tenantId, conversationId, userId, {
        content: 'Test',
      });

      expect(result).toEqual(mockNote);
    });
  });
});
