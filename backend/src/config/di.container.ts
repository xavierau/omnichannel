import 'reflect-metadata';
import { container } from 'tsyringe';

// Redis Client
import { redisClient } from './redis.config';

// Repositories
import { CustomerRepository } from '@features/customers/customer.repository';
import { TagRepository } from '@features/tags/tag.repository';
import { BroadcastRepository } from '@features/broadcasts/broadcast.repository';
import { TemplateRepository } from '@features/templates/template.repository';
import { GroupRepository } from '@features/groups/group.repository';
import { MediaRepository } from '@features/media/media.repository';

// Channel/Provider Repositories
import { ChannelRepository } from '@features/channels/channel.repository';
import { ProviderRepository } from '@features/providers/provider.repository';
import { ChannelAccountRepository } from '@features/channel-accounts/channel-account.repository';
import { MessageLogRepository } from '@features/message-logs/message-log.repository';

// Services
import { CustomerService } from '@features/customers/customer.service';
import { TagService } from '@features/tags/tag.service';
import { BroadcastService } from '@features/broadcasts/broadcast.service';
import { BroadcastSseService } from '@features/broadcasts/broadcast-sse.service';
import { BroadcastExportService } from '@features/broadcasts/broadcast-export.service';
import { TemplateService } from '@features/templates/template.service';
import { TemplateSseService } from '@features/templates/template-sse.service';
import { GroupService } from '@features/groups/group.service';
import { MediaService } from '@features/media/media.service';

// Messaging Services
import {
  CredentialService,
  EnvEncryptionKeyProvider,
} from '@features/messaging/services/credential.service';
import { ProviderRegistry } from '@features/messaging/provider-registry';
import { ProviderFactory } from '@features/messaging/provider-factory';
import { MessagingService } from '@features/messaging/services/messaging.service';
import { MetaMediaService } from '@features/messaging/services/meta-media.service';
import { MessagingRateLimiterService } from '@features/messaging/services/rate-limiter.service';
import { registerMessagingProviders } from '@features/messaging/register-providers';

// Channel Account Services
import { ChannelAccountService } from '@features/channel-accounts/channel-account.service';

// Webhook Services
import { WebhookService } from '@features/webhooks/webhook.service';

// Controllers
import { CustomerController } from '@features/customers/customer.controller';
import { TagController } from '@features/tags/tag.controller';
import { BroadcastController } from '@features/broadcasts/broadcast.controller';
import { TemplateController } from '@features/templates/template.controller';
import { GroupController } from '@features/groups/group.controller';
import { MediaController } from '@features/media/media.controller';

// Channel Account Controllers
import { ChannelAccountController } from '@features/channel-accounts/channel-account.controller';

// Webhook Controllers
import { WebhookController } from '@features/webhooks/webhook.controller';

// Jobs
import { BroadcastQueue } from '../jobs/broadcast.queue';
import { BroadcastScheduler } from '../jobs/broadcast.scheduler';
import { InboxMessageQueue } from '../jobs/inbox-message.queue';

// Teams
import { TeamRepository } from '@features/teams/repositories/team.repository';
import { TeamMemberRepository } from '@features/teams/repositories/team-member.repository';
import { TeamChannelAccountRepository } from '@features/teams/repositories/team-channel-account.repository';
import { TeamService } from '@features/teams/services/team.service';
import { TeamController } from '@features/teams/team.controller';

// Inbox
import { ConversationRepository } from '@features/inbox/repositories/conversation.repository';
import { ConversationMessageRepository } from '@features/inbox/repositories/conversation-message.repository';
import { ConversationNoteRepository } from '@features/inbox/repositories/conversation-note.repository';
import { ConversationAssignmentRepository } from '@features/inbox/repositories/conversation-assignment.repository';
import { ConversationService } from '@features/inbox/services/conversation.service';
import { InboxNoteService } from '@features/inbox/services/inbox-note.service';
import { InboxSseService } from '@features/inbox/services/inbox-sse.service';
import { MessagingWindowService } from '@features/inbox/services/messaging-window.service';
import { InboxController } from '@features/inbox/inbox.controller';

// Health
import { HealthService } from '@features/health/health.service';
import { HealthController } from '@features/health/health.controller';

// Custom Fields
import { CustomFieldRepository } from '@features/custom-fields/custom-field.repository';
import { CustomFieldService } from '@features/custom-fields/custom-field.service';
import { CustomFieldController } from '@features/custom-fields/custom-field.controller';

// Users
import { UserRepository } from '@features/users/user.repository';
import { UserService } from '@features/users/user.service';
import { PasswordService } from '@features/users/password.service';
import { PermissionService } from '@features/users/permission.service';

// Roles
import { RoleRepository } from '@features/roles/role.repository';

// Tenants
import { TenantRepository } from '@features/tenants/tenant.repository';
import { TenantService } from '@features/tenants/tenant.service';

// Invitations
import { InvitationRepository } from '@features/invitations/invitation.repository';
import { EmailService } from '@features/invitations/email.service';
import { InvitationService } from '@features/invitations/invitation.service';
import { InvitationController } from '@features/invitations/invitation.controller';

// Database
import { AppDataSource } from './database.config';

// Register Repositories
container.registerSingleton(CustomerRepository);
container.registerSingleton(TagRepository);
container.registerSingleton(BroadcastRepository);
container.registerSingleton(TemplateRepository);
container.registerSingleton(GroupRepository);
container.registerSingleton(MediaRepository);

// Register Channel/Provider Repositories
container.registerSingleton(ChannelRepository);
container.registerSingleton(ProviderRepository);
container.registerSingleton(ChannelAccountRepository);
container.registerSingleton(MessageLogRepository);

// Register Services
container.registerSingleton(CustomerService);
container.registerSingleton(TagService);
container.registerSingleton(BroadcastService);
container.registerSingleton(BroadcastSseService);
container.registerSingleton(BroadcastExportService);
container.registerSingleton(TemplateService);
container.registerSingleton(TemplateSseService);
container.registerSingleton(GroupService);
container.registerSingleton(MediaService);

// Register Redis Client (required by rate limiter)
container.register('RedisClient', { useValue: redisClient });

// Register Messaging Services (order matters for dependencies)
container.registerSingleton('EncryptionKeyProvider', EnvEncryptionKeyProvider);
container.registerSingleton(CredentialService);
container.registerSingleton(ProviderRegistry);
container.registerSingleton(ProviderFactory);
container.registerSingleton(MessagingService);
container.registerSingleton(MetaMediaService);
container.registerSingleton(MessagingRateLimiterService);

// Register Channel Account Services
container.registerSingleton(ChannelAccountService);

// Register Webhook Services
container.registerSingleton(WebhookService);

// Register Controllers
container.registerSingleton(CustomerController);
container.registerSingleton(TagController);
container.registerSingleton(BroadcastController);
container.registerSingleton(TemplateController);
container.registerSingleton(GroupController);
container.registerSingleton(MediaController);

// Register Channel Account Controllers
container.registerSingleton(ChannelAccountController);

// Register Webhook Controllers
container.registerSingleton(WebhookController);

// Register Jobs
container.registerSingleton(BroadcastQueue);
container.registerSingleton(BroadcastScheduler);
container.registerSingleton(InboxMessageQueue);

// Register Teams Repositories
container.registerSingleton(TeamRepository);
container.registerSingleton(TeamMemberRepository);
container.registerSingleton(TeamChannelAccountRepository);

// Register Teams Services
container.registerSingleton(TeamService);

// Register Teams Controllers
container.registerSingleton(TeamController);

// Register Inbox Repositories
container.registerSingleton(ConversationRepository);
container.registerSingleton(ConversationMessageRepository);
container.registerSingleton(ConversationNoteRepository);
container.registerSingleton(ConversationAssignmentRepository);

// Register Inbox Services
container.registerSingleton(ConversationService);
container.registerSingleton(InboxNoteService);
container.registerSingleton(InboxSseService);
container.registerSingleton(MessagingWindowService);

// Register Inbox Controllers
container.registerSingleton(InboxController);

// Register messaging providers (must be after ProviderRegistry is registered)
registerMessagingProviders();

// Register DataSource for Health Service
container.register('DataSource', { useValue: AppDataSource });

// Register Health Services
container.registerSingleton(HealthService);

// Register Health Controllers
container.registerSingleton(HealthController);

// Register Custom Fields
container.registerSingleton(CustomFieldRepository);
container.registerSingleton(CustomFieldService);
container.registerSingleton(CustomFieldController);

// Register Roles (must be before UserService which depends on RoleRepository)
container.registerSingleton(RoleRepository);

// Register Tenants (must be before InvitationService which depends on TenantService)
container.registerSingleton(TenantRepository);
container.registerSingleton(TenantService);

// Register Users (dependencies for Invitations)
// Order: Repository -> PasswordService -> PermissionService -> UserService
container.registerSingleton(UserRepository);
container.registerSingleton(PasswordService);
container.registerSingleton(PermissionService);
container.registerSingleton(UserService);

// Register Invitations
container.registerSingleton(InvitationRepository);
container.registerSingleton(EmailService);
container.registerSingleton(InvitationService);
container.registerSingleton(InvitationController);

export { container };
