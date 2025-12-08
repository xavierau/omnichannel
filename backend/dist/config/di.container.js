"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
require("reflect-metadata");
const tsyringe_1 = require("tsyringe");
Object.defineProperty(exports, "container", { enumerable: true, get: function () { return tsyringe_1.container; } });
// Redis Client
const redis_config_1 = require("./redis.config");
// Repositories
const customer_repository_1 = require("@features/customers/customer.repository");
const tag_repository_1 = require("@features/tags/tag.repository");
const broadcast_repository_1 = require("@features/broadcasts/broadcast.repository");
const template_repository_1 = require("@features/templates/template.repository");
const group_repository_1 = require("@features/groups/group.repository");
const media_repository_1 = require("@features/media/media.repository");
// Channel/Provider Repositories
const channel_repository_1 = require("@features/channels/channel.repository");
const provider_repository_1 = require("@features/providers/provider.repository");
const channel_account_repository_1 = require("@features/channel-accounts/channel-account.repository");
const message_log_repository_1 = require("@features/message-logs/message-log.repository");
// Services
const customer_service_1 = require("@features/customers/customer.service");
const tag_service_1 = require("@features/tags/tag.service");
const broadcast_service_1 = require("@features/broadcasts/broadcast.service");
const broadcast_sse_service_1 = require("@features/broadcasts/broadcast-sse.service");
const broadcast_export_service_1 = require("@features/broadcasts/broadcast-export.service");
const template_service_1 = require("@features/templates/template.service");
const template_sse_service_1 = require("@features/templates/template-sse.service");
const group_service_1 = require("@features/groups/group.service");
const media_service_1 = require("@features/media/media.service");
// Messaging Services
const credential_service_1 = require("@features/messaging/services/credential.service");
const provider_registry_1 = require("@features/messaging/provider-registry");
const provider_factory_1 = require("@features/messaging/provider-factory");
const messaging_service_1 = require("@features/messaging/services/messaging.service");
const meta_media_service_1 = require("@features/messaging/services/meta-media.service");
const rate_limiter_service_1 = require("@features/messaging/services/rate-limiter.service");
const register_providers_1 = require("@features/messaging/register-providers");
// Channel Account Services
const channel_account_service_1 = require("@features/channel-accounts/channel-account.service");
// Webhook Services
const webhook_service_1 = require("@features/webhooks/webhook.service");
// Controllers
const customer_controller_1 = require("@features/customers/customer.controller");
const tag_controller_1 = require("@features/tags/tag.controller");
const broadcast_controller_1 = require("@features/broadcasts/broadcast.controller");
const template_controller_1 = require("@features/templates/template.controller");
const group_controller_1 = require("@features/groups/group.controller");
const media_controller_1 = require("@features/media/media.controller");
// Channel Account Controllers
const channel_account_controller_1 = require("@features/channel-accounts/channel-account.controller");
// Webhook Controllers
const webhook_controller_1 = require("@features/webhooks/webhook.controller");
// Jobs
const broadcast_queue_1 = require("../jobs/broadcast.queue");
const broadcast_scheduler_1 = require("../jobs/broadcast.scheduler");
const inbox_message_queue_1 = require("../jobs/inbox-message.queue");
// Teams
const team_repository_1 = require("@features/teams/repositories/team.repository");
const team_member_repository_1 = require("@features/teams/repositories/team-member.repository");
const team_channel_account_repository_1 = require("@features/teams/repositories/team-channel-account.repository");
const team_service_1 = require("@features/teams/services/team.service");
const team_controller_1 = require("@features/teams/team.controller");
// Inbox
const conversation_repository_1 = require("@features/inbox/repositories/conversation.repository");
const conversation_message_repository_1 = require("@features/inbox/repositories/conversation-message.repository");
const conversation_note_repository_1 = require("@features/inbox/repositories/conversation-note.repository");
const conversation_assignment_repository_1 = require("@features/inbox/repositories/conversation-assignment.repository");
const conversation_service_1 = require("@features/inbox/services/conversation.service");
const inbox_note_service_1 = require("@features/inbox/services/inbox-note.service");
const inbox_sse_service_1 = require("@features/inbox/services/inbox-sse.service");
const messaging_window_service_1 = require("@features/inbox/services/messaging-window.service");
const inbox_controller_1 = require("@features/inbox/inbox.controller");
// Health
const health_service_1 = require("@features/health/health.service");
const health_controller_1 = require("@features/health/health.controller");
// Custom Fields
const custom_field_repository_1 = require("@features/custom-fields/custom-field.repository");
const custom_field_service_1 = require("@features/custom-fields/custom-field.service");
const custom_field_controller_1 = require("@features/custom-fields/custom-field.controller");
// Invitations
const invitation_repository_1 = require("@features/invitations/invitation.repository");
const email_service_1 = require("@features/invitations/email.service");
const invitation_service_1 = require("@features/invitations/invitation.service");
const invitation_controller_1 = require("@features/invitations/invitation.controller");
// Database
const database_config_1 = require("./database.config");
// Register Repositories
tsyringe_1.container.registerSingleton(customer_repository_1.CustomerRepository);
tsyringe_1.container.registerSingleton(tag_repository_1.TagRepository);
tsyringe_1.container.registerSingleton(broadcast_repository_1.BroadcastRepository);
tsyringe_1.container.registerSingleton(template_repository_1.TemplateRepository);
tsyringe_1.container.registerSingleton(group_repository_1.GroupRepository);
tsyringe_1.container.registerSingleton(media_repository_1.MediaRepository);
// Register Channel/Provider Repositories
tsyringe_1.container.registerSingleton(channel_repository_1.ChannelRepository);
tsyringe_1.container.registerSingleton(provider_repository_1.ProviderRepository);
tsyringe_1.container.registerSingleton(channel_account_repository_1.ChannelAccountRepository);
tsyringe_1.container.registerSingleton(message_log_repository_1.MessageLogRepository);
// Register Services
tsyringe_1.container.registerSingleton(customer_service_1.CustomerService);
tsyringe_1.container.registerSingleton(tag_service_1.TagService);
tsyringe_1.container.registerSingleton(broadcast_service_1.BroadcastService);
tsyringe_1.container.registerSingleton(broadcast_sse_service_1.BroadcastSseService);
tsyringe_1.container.registerSingleton(broadcast_export_service_1.BroadcastExportService);
tsyringe_1.container.registerSingleton(template_service_1.TemplateService);
tsyringe_1.container.registerSingleton(template_sse_service_1.TemplateSseService);
tsyringe_1.container.registerSingleton(group_service_1.GroupService);
tsyringe_1.container.registerSingleton(media_service_1.MediaService);
// Register Redis Client (required by rate limiter)
tsyringe_1.container.register('RedisClient', { useValue: redis_config_1.redisClient });
// Register Messaging Services (order matters for dependencies)
tsyringe_1.container.registerSingleton('EncryptionKeyProvider', credential_service_1.EnvEncryptionKeyProvider);
tsyringe_1.container.registerSingleton(credential_service_1.CredentialService);
tsyringe_1.container.registerSingleton(provider_registry_1.ProviderRegistry);
tsyringe_1.container.registerSingleton(provider_factory_1.ProviderFactory);
tsyringe_1.container.registerSingleton(messaging_service_1.MessagingService);
tsyringe_1.container.registerSingleton(meta_media_service_1.MetaMediaService);
tsyringe_1.container.registerSingleton(rate_limiter_service_1.MessagingRateLimiterService);
// Register Channel Account Services
tsyringe_1.container.registerSingleton(channel_account_service_1.ChannelAccountService);
// Register Webhook Services
tsyringe_1.container.registerSingleton(webhook_service_1.WebhookService);
// Register Controllers
tsyringe_1.container.registerSingleton(customer_controller_1.CustomerController);
tsyringe_1.container.registerSingleton(tag_controller_1.TagController);
tsyringe_1.container.registerSingleton(broadcast_controller_1.BroadcastController);
tsyringe_1.container.registerSingleton(template_controller_1.TemplateController);
tsyringe_1.container.registerSingleton(group_controller_1.GroupController);
tsyringe_1.container.registerSingleton(media_controller_1.MediaController);
// Register Channel Account Controllers
tsyringe_1.container.registerSingleton(channel_account_controller_1.ChannelAccountController);
// Register Webhook Controllers
tsyringe_1.container.registerSingleton(webhook_controller_1.WebhookController);
// Register Jobs
tsyringe_1.container.registerSingleton(broadcast_queue_1.BroadcastQueue);
tsyringe_1.container.registerSingleton(broadcast_scheduler_1.BroadcastScheduler);
tsyringe_1.container.registerSingleton(inbox_message_queue_1.InboxMessageQueue);
// Register Teams Repositories
tsyringe_1.container.registerSingleton(team_repository_1.TeamRepository);
tsyringe_1.container.registerSingleton(team_member_repository_1.TeamMemberRepository);
tsyringe_1.container.registerSingleton(team_channel_account_repository_1.TeamChannelAccountRepository);
// Register Teams Services
tsyringe_1.container.registerSingleton(team_service_1.TeamService);
// Register Teams Controllers
tsyringe_1.container.registerSingleton(team_controller_1.TeamController);
// Register Inbox Repositories
tsyringe_1.container.registerSingleton(conversation_repository_1.ConversationRepository);
tsyringe_1.container.registerSingleton(conversation_message_repository_1.ConversationMessageRepository);
tsyringe_1.container.registerSingleton(conversation_note_repository_1.ConversationNoteRepository);
tsyringe_1.container.registerSingleton(conversation_assignment_repository_1.ConversationAssignmentRepository);
// Register Inbox Services
tsyringe_1.container.registerSingleton(conversation_service_1.ConversationService);
tsyringe_1.container.registerSingleton(inbox_note_service_1.InboxNoteService);
tsyringe_1.container.registerSingleton(inbox_sse_service_1.InboxSseService);
tsyringe_1.container.registerSingleton(messaging_window_service_1.MessagingWindowService);
// Register Inbox Controllers
tsyringe_1.container.registerSingleton(inbox_controller_1.InboxController);
// Register messaging providers (must be after ProviderRegistry is registered)
(0, register_providers_1.registerMessagingProviders)();
// Register DataSource for Health Service
tsyringe_1.container.register('DataSource', { useValue: database_config_1.AppDataSource });
// Register Health Services
tsyringe_1.container.registerSingleton(health_service_1.HealthService);
// Register Health Controllers
tsyringe_1.container.registerSingleton(health_controller_1.HealthController);
// Register Custom Fields
tsyringe_1.container.registerSingleton(custom_field_repository_1.CustomFieldRepository);
tsyringe_1.container.registerSingleton(custom_field_service_1.CustomFieldService);
tsyringe_1.container.registerSingleton(custom_field_controller_1.CustomFieldController);
// Register Invitations
tsyringe_1.container.registerSingleton(invitation_repository_1.InvitationRepository);
tsyringe_1.container.registerSingleton(email_service_1.EmailService);
tsyringe_1.container.registerSingleton(invitation_service_1.InvitationService);
tsyringe_1.container.registerSingleton(invitation_controller_1.InvitationController);
