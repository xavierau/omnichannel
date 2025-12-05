import 'reflect-metadata';
import { container } from 'tsyringe';

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
container.registerSingleton(GroupService);
container.registerSingleton(MediaService);

// Register Messaging Services (order matters for dependencies)
container.registerSingleton('EncryptionKeyProvider', EnvEncryptionKeyProvider);
container.registerSingleton(CredentialService);
container.registerSingleton(ProviderRegistry);
container.registerSingleton(ProviderFactory);
container.registerSingleton(MessagingService);

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

// Register messaging providers (must be after ProviderRegistry is registered)
registerMessagingProviders();

export { container };
