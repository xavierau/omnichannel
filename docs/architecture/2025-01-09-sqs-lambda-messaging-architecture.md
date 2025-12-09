# SQS + Lambda Messaging Architecture

## Overview

This document describes the architecture for migrating from BullMQ/Redis to AWS SQS + Lambda for message processing. The design uses provider-specific Lambda functions to handle the unique requirements of each messaging provider (Meta, Twilio, Sinch, etc.).

## Current Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Backend   │────▶│    Redis    │────▶│  Bull Workers   │────▶ Provider APIs
│  (Express)  │     │   (BullMQ)  │     │  (in-process)   │
└─────────────┘     └─────────────┘     └─────────────────┘
```

### Current Components

| Component | Location | Purpose |
|-----------|----------|---------|
| BroadcastQueue | `backend/src/jobs/broadcast.queue.ts` | Batch message orchestration |
| InboxMessageQueue | `backend/src/jobs/inbox-message.queue.ts` | 1:1 conversation messages |
| BroadcastScheduler | `backend/src/jobs/broadcast.scheduler.ts` | Scheduled broadcast polling |
| RateLimiterService | `backend/src/features/messaging/services/rate-limiter.service.ts` | Redis-based rate limiting |

### Current Job Types

| Job Type | Queue | Purpose |
|----------|-------|---------|
| `SEND_BROADCAST` | BroadcastQueue | Orchestrate broadcast sending |
| `PROCESS_RECIPIENT` | BroadcastQueue | Send to individual recipient |
| `SEND_MESSAGE` | InboxMessageQueue | Outbound conversation message |
| `PROCESS_INBOUND` | InboxMessageQueue | Process inbound webhook |

---

## Target Architecture

```
                                         ┌────────────────────┐
                                         │  Meta SQS Queue    │
                                         │      (FIFO)        │
                                         └─────────┬──────────┘
                                                   │
┌─────────────┐                                    ▼
│   Backend   │    ┌─────────────────┐    ┌────────────────────┐
│  (Express)  │───▶│  Router Lambda  │───▶│   Meta Lambda      │───▶ WhatsApp API
└─────────────┘    │  (optional)     │    └────────────────────┘
      │            └─────────────────┘             │
      │                    │                       │
      │                    │              ┌────────▼───────────┐
      │                    │              │    Meta DLQ        │
      │                    │              └────────────────────┘
      │                    │
      │                    │              ┌────────────────────┐
      │                    │              │  Twilio SQS Queue  │
      │                    │              │      (FIFO)        │
      │                    │              └─────────┬──────────┘
      │                    │                        │
      │                    │                        ▼
      │                    └─────────────▶┌────────────────────┐
      │                                   │  Twilio Lambda     │───▶ Twilio API
      │                                   └────────────────────┘
      │
      │            ┌─────────────────┐
      │            │  Callback SQS   │    ┌────────────────────┐
      │◀───────────│     Queue       │◀───│  All Lambdas       │
      │            └─────────────────┘    │  (status updates)  │
      │                                   └────────────────────┘
      │
      ▼
┌─────────────┐
│  EventBridge│───▶ Scheduled Broadcasts
│  Scheduler  │
└─────────────┘
```

---

## Component Specifications

### 1. SQS Queues

#### 1.1 Provider Message Queues (FIFO)

Each provider gets a dedicated FIFO queue for message ordering per channel account.

```yaml
# Meta Queue
MetaMessageQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: omnichannel-meta-messages.fifo
    FifoQueue: true
    ContentBasedDeduplication: false  # Use explicit deduplication ID
    VisibilityTimeout: 60             # 6x Lambda timeout
    MessageRetentionPeriod: 1209600   # 14 days
    ReceiveMessageWaitTimeSeconds: 20 # Long polling
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt MetaDLQ.Arn
      maxReceiveCount: 4              # 4 attempts total

MetaDLQ:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: omnichannel-meta-dlq.fifo
    FifoQueue: true
    MessageRetentionPeriod: 1209600   # 14 days
```

#### Queue Configuration by Provider

| Provider | Queue Name | Message Group ID | Concurrency |
|----------|------------|------------------|-------------|
| Meta | `omnichannel-meta-messages.fifo` | `channelAccountId` | 80 |
| Twilio | `omnichannel-twilio-messages.fifo` | `channelAccountId` | 100 |
| Sinch | `omnichannel-sinch-messages.fifo` | `channelAccountId` | 50 |

#### 1.2 Callback Queue (Standard)

For Lambda → Backend status updates. Standard queue for higher throughput.

```yaml
CallbackQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: omnichannel-callbacks
    VisibilityTimeout: 30
    MessageRetentionPeriod: 86400     # 1 day
```

#### 1.3 Broadcast Orchestration Queue (FIFO)

For broadcast job orchestration (expanding recipients).

```yaml
BroadcastOrchestrationQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: omnichannel-broadcast-orchestration.fifo
    FifoQueue: true
    VisibilityTimeout: 300            # 5 minutes for large broadcasts
    MessageRetentionPeriod: 1209600
```

---

### 2. Lambda Functions

#### 2.1 Provider Lambda Specifications

| Lambda | Memory | Timeout | Reserved Concurrency | Trigger |
|--------|--------|---------|---------------------|---------|
| meta-sender | 256 MB | 10s | 80 | Meta SQS |
| twilio-sender | 256 MB | 10s | 100 | Twilio SQS |
| sinch-sender | 256 MB | 10s | 50 | Sinch SQS |
| broadcast-orchestrator | 512 MB | 60s | 10 | Broadcast SQS |
| callback-processor | 128 MB | 5s | 20 | Callback SQS |

#### 2.2 Lambda Configuration

```yaml
MetaSenderLambda:
  Type: AWS::Lambda::Function
  Properties:
    FunctionName: omnichannel-meta-sender
    Runtime: nodejs20.x
    Handler: index.handler
    MemorySize: 256
    Timeout: 10
    ReservedConcurrentExecutions: 80  # Matches Meta rate limit
    Environment:
      Variables:
        CALLBACK_QUEUE_URL: !Ref CallbackQueue
        RATE_LIMIT_TABLE: !Ref RateLimitTable
        LOG_LEVEL: info
    VpcConfig:
      # If backend is in VPC, Lambda needs VPC access for callbacks
      SubnetIds: !Ref PrivateSubnets
      SecurityGroupIds: !Ref LambdaSecurityGroup
```

#### 2.3 Event Source Mapping

```yaml
MetaSQSTrigger:
  Type: AWS::Lambda::EventSourceMapping
  Properties:
    EventSourceArn: !GetAtt MetaMessageQueue.Arn
    FunctionName: !Ref MetaSenderLambda
    BatchSize: 10                     # Process up to 10 messages
    MaximumBatchingWindowInSeconds: 1 # Or wait 1 second
    FunctionResponseTypes:
      - ReportBatchItemFailures       # Partial batch failure support
```

---

### 3. Rate Limiting Strategy (No DynamoDB Required)

The architecture uses **SQS + Lambda concurrency** for rate limiting instead of a separate rate limit database. This is simpler, cheaper, and fully managed.

#### How It Works

```
Burst of 100K messages
         │
         ▼
    ┌─────────────┐
    │     SQS     │  ← Absorbs burst instantly (unlimited capacity)
    │    FIFO     │  ← Messages queue up, ordered by MessageGroupId
    └──────┬──────┘
           │
           ▼ (controlled drain rate)
    ┌─────────────┐
    │   Lambda    │  ← ReservedConcurrentExecutions = provider limit
    │  (max 80)   │  ← Auto-scales 0 → 80 based on queue depth
    └──────┬──────┘
           │
           ▼
    Provider API (80 req/sec max)
```

#### Rate Limit Configuration

| Provider | Lambda Concurrency | Provider Limit | Notes |
|----------|-------------------|----------------|-------|
| Meta | 80 | 80/sec | Standard tier |
| Twilio | 100 | 100/sec | Default |
| Sinch | 50 | 50/sec | Conservative |

#### Handling Provider 429 Responses

When a provider returns a rate limit error (HTTP 429 or error codes like Meta's 4, 17, 341, 368):

1. Lambda returns the message ID in `batchItemFailures`
2. SQS automatically retries after visibility timeout (60s)
3. Message stays in queue until successful or max retries exceeded
4. After max retries → Dead Letter Queue for investigation

```typescript
// In Lambda handler
export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const result = await sender.send(JSON.parse(record.body));

      if (!result.success && result.error?.retryable) {
        // Return to queue for retry
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    } catch (error) {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
```

#### Why Not DynamoDB?

| Approach | Complexity | Cost | Accuracy |
|----------|------------|------|----------|
| DynamoDB token bucket | High | ~$2.50/M msgs | Per-channel |
| Lambda concurrency | Zero | $0 | Per-provider |

For most use cases, per-provider rate limiting via Lambda concurrency is sufficient. If you later need per-channel-account rate limiting (e.g., different tiers), DynamoDB can be added.

#### Benefits of This Approach

1. **Zero infrastructure** - No database to manage
2. **Auto-scaling** - Lambda scales with queue depth
3. **Burst absorption** - SQS handles any spike
4. **Cost efficient** - Pay only for processed messages
5. **Self-healing** - Failed messages retry automatically

---

### 4. EventBridge Scheduler

Replace BroadcastScheduler polling with EventBridge.

```yaml
BroadcastScheduleRule:
  Type: AWS::Events::Rule
  Properties:
    Name: omnichannel-broadcast-scheduler
    ScheduleExpression: rate(1 minute)
    State: ENABLED
    Targets:
      - Id: BroadcastSchedulerLambda
        Arn: !GetAtt BroadcastSchedulerLambda.Arn
```

---

## Message Contracts

### 1. Outbound Message (Backend → Provider Queue)

```typescript
interface OutboundQueueMessage {
  // Metadata
  messageId: string;           // UUID, used for deduplication
  correlationId: string;       // For tracing across systems
  timestamp: string;           // ISO 8601
  version: '1.0';

  // Routing
  provider: 'meta' | 'twilio' | 'sinch';
  channelAccountId: string;

  // Tenant context
  tenantId: string;

  // Message context (for callbacks)
  context: {
    type: 'broadcast' | 'conversation';
    broadcastId?: string;
    conversationId?: string;
    internalMessageId: string;  // Database message ID
  };

  // Recipient
  recipient: {
    phoneNumber: string;        // E.164 format
    name?: string;
  };

  // Content
  contentType: 'text' | 'template' | 'image' | 'video' | 'audio' | 'document' | 'interactive';
  content: OutboundMessageContent;

  // Retry tracking
  attempt: number;
  maxAttempts: number;

  // Provider credentials (encrypted or reference)
  credentials: {
    type: 'reference';
    secretArn: string;          // AWS Secrets Manager ARN
  } | {
    type: 'inline';
    accessToken: string;        // For simple setups
    phoneNumberId: string;
  };
}

// Content type definitions
type OutboundMessageContent =
  | TextContent
  | TemplateContent
  | MediaContent
  | InteractiveContent;

interface TextContent {
  type: 'text';
  body: string;
  previewUrl?: boolean;
}

interface TemplateContent {
  type: 'template';
  templateName: string;
  languageCode: string;
  components: TemplateComponent[];
}

interface MediaContent {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  caption?: string;
  filename?: string;
}

interface InteractiveContent {
  type: 'interactive';
  interactiveType: 'button' | 'list' | 'product' | 'product_list';
  header?: InteractiveHeader;
  body: { text: string };
  footer?: { text: string };
  action: InteractiveAction;
}
```

### 2. Callback Message (Lambda → Backend)

```typescript
interface CallbackMessage {
  // Metadata
  correlationId: string;
  timestamp: string;
  version: '1.0';

  // Context
  tenantId: string;
  provider: 'meta' | 'twilio' | 'sinch';
  channelAccountId: string;

  // Message reference
  context: {
    type: 'broadcast' | 'conversation';
    broadcastId?: string;
    conversationId?: string;
    internalMessageId: string;
  };

  // Result
  status: 'sent' | 'failed' | 'rate_limited';

  // Success details
  providerMessageId?: string;
  sentAt?: string;

  // Failure details
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfter?: number;        // Seconds
    providerErrorCode?: string;
    providerErrorMessage?: string;
  };

  // Metrics
  metrics?: {
    processingTimeMs: number;
    attemptNumber: number;
    queuedAt: string;
    processedAt: string;
  };
}
```

### 3. Broadcast Orchestration Message

```typescript
interface BroadcastOrchestrationMessage {
  // Metadata
  orchestrationId: string;
  timestamp: string;
  version: '1.0';

  // Context
  tenantId: string;
  broadcastId: string;

  // Action
  action: 'expand_recipients' | 'check_completion';

  // For expand_recipients
  expansion?: {
    channelAccountId: string;
    templateName: string;
    templateLanguage: string;
    templateVariables: TemplateVariablesConfig;
    recipientSource: {
      type: 'group' | 'customer_list';
      groupId?: string;
      customerIds?: string[];
    };
    batchSize: number;
    batchOffset: number;
  };
}
```

---

## Lambda Implementation

### Directory Structure

```
lambdas/
├── package.json
├── tsconfig.json
├── shared/
│   ├── interfaces/
│   │   ├── message.interface.ts
│   │   ├── callback.interface.ts
│   │   └── provider.interface.ts
│   ├── services/
│   │   ├── callback.service.ts       # Send status updates to backend
│   │   ├── secrets.service.ts        # Fetch credentials from Secrets Manager
│   │   └── metrics.service.ts        # CloudWatch metrics
│   ├── utils/
│   │   ├── logger.ts
│   │   └── phone.ts
│   └── errors/
│       ├── base.error.ts
│       └── provider.error.ts
│
├── meta/
│   ├── handler.ts                    # Lambda entry point
│   ├── meta-sender.service.ts        # Meta Cloud API client
│   ├── meta-api.client.ts            # HTTP client for Meta
│   ├── meta-error-handler.ts         # Error code mapping
│   └── __tests__/
│       ├── handler.test.ts
│       └── meta-sender.test.ts
│
├── twilio/
│   ├── handler.ts
│   ├── twilio-sender.service.ts
│   ├── twilio-api.client.ts
│   └── twilio-error-handler.ts
│
├── sinch/
│   ├── handler.ts
│   ├── sinch-sender.service.ts
│   └── sinch-error-handler.ts
│
├── broadcast-orchestrator/
│   ├── handler.ts
│   └── recipient-expander.service.ts
│
└── callback-processor/               # (Optional) Process callback queue
    └── handler.ts
```

> **Note**: Rate limiting is handled entirely by Lambda's `ReservedConcurrentExecutions`. No DynamoDB or custom rate limiter code needed.

### Shared Interfaces

```typescript
// shared/interfaces/provider.interface.ts

export interface IMessageSender {
  /**
   * Send a message through the provider
   * @throws ProviderError on failure
   * @throws RateLimitError when rate limited
   */
  send(message: OutboundQueueMessage): Promise<SendResult>;
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  sentAt: Date;
  error?: ProviderError;
}

export interface ProviderError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  rawError?: unknown;
}
```

### Meta Lambda Handler

```typescript
// meta/handler.ts

import { SQSHandler, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { MetaSenderService } from './meta-sender.service';
import { CallbackService } from '../shared/services/callback.service';
import { Logger } from '../shared/utils/logger';
import { OutboundQueueMessage, CallbackMessage } from '../shared/interfaces';

const logger = new Logger('meta-handler');
const sender = new MetaSenderService();
const callbackService = new CallbackService();

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Rate limiting is handled by Lambda's ReservedConcurrentExecutions (80)
  // SQS automatically throttles when Lambda is at max concurrency

  for (const record of event.Records) {
    const messageId = record.messageId;

    try {
      const message: OutboundQueueMessage = JSON.parse(record.body);

      logger.info('Processing message', {
        correlationId: message.correlationId,
        recipient: maskPhone(message.recipient.phoneNumber),
        contentType: message.contentType,
        attempt: message.attempt,
      });

      // Send message
      const result = await sender.send(message);

      // Send callback to backend
      const callback: CallbackMessage = {
        correlationId: message.correlationId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        tenantId: message.tenantId,
        provider: 'meta',
        channelAccountId: message.channelAccountId,
        context: message.context,
        status: result.success ? 'sent' : 'failed',
        providerMessageId: result.providerMessageId,
        sentAt: result.sentAt?.toISOString(),
        error: result.error ? {
          code: result.error.code,
          message: result.error.message,
          retryable: result.error.retryable,
          retryAfter: result.error.retryAfterSeconds,
        } : undefined,
        metrics: {
          processingTimeMs: Date.now() - new Date(message.timestamp).getTime(),
          attemptNumber: message.attempt,
          queuedAt: message.timestamp,
          processedAt: new Date().toISOString(),
        },
      };

      await callbackService.send(callback);

      // If failed and retryable, return to queue for SQS retry
      if (!result.success && result.error?.retryable) {
        batchItemFailures.push({ itemIdentifier: messageId });
      }

    } catch (error) {
      logger.error('Unexpected error processing message', { messageId, error });
      batchItemFailures.push({ itemIdentifier: messageId });
    }
  }

  return { batchItemFailures };
};

function maskPhone(phone: string): string {
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}
```

### Meta Sender Service

```typescript
// meta/meta-sender.service.ts

import { IMessageSender, SendResult, OutboundQueueMessage, ProviderError } from '../shared/interfaces';
import { MetaApiClient } from './meta-api.client';
import { MetaErrorHandler } from './meta-error-handler';
import { SecretsService } from '../shared/services/secrets.service';
import { Logger } from '../shared/utils/logger';

const logger = new Logger('meta-sender');

export class MetaSenderService implements IMessageSender {
  private secretsService = new SecretsService();
  private errorHandler = new MetaErrorHandler();

  async send(message: OutboundQueueMessage): Promise<SendResult> {
    // Get credentials
    const credentials = await this.getCredentials(message.credentials);
    const client = new MetaApiClient(credentials);

    try {
      let response: MetaApiResponse;

      switch (message.contentType) {
        case 'template':
          response = await this.sendTemplate(client, message);
          break;
        case 'text':
          response = await this.sendText(client, message);
          break;
        case 'image':
        case 'video':
        case 'audio':
        case 'document':
          response = await this.sendMedia(client, message);
          break;
        case 'interactive':
          response = await this.sendInteractive(client, message);
          break;
        default:
          throw new Error(`Unsupported content type: ${message.contentType}`);
      }

      return {
        success: true,
        providerMessageId: response.messages[0].id,
        sentAt: new Date(),
      };

    } catch (error) {
      const providerError = this.errorHandler.handle(error);

      logger.warn('Message send failed', {
        correlationId: message.correlationId,
        error: providerError,
      });

      return {
        success: false,
        sentAt: new Date(),
        error: providerError,
      };
    }
  }

  private async sendTemplate(client: MetaApiClient, message: OutboundQueueMessage): Promise<MetaApiResponse> {
    const content = message.content as TemplateContent;

    return client.sendMessage({
      messaging_product: 'whatsapp',
      to: message.recipient.phoneNumber,
      type: 'template',
      template: {
        name: content.templateName,
        language: { code: content.languageCode },
        components: content.components,
      },
    });
  }

  private async sendText(client: MetaApiClient, message: OutboundQueueMessage): Promise<MetaApiResponse> {
    const content = message.content as TextContent;

    return client.sendMessage({
      messaging_product: 'whatsapp',
      to: message.recipient.phoneNumber,
      type: 'text',
      text: {
        body: content.body,
        preview_url: content.previewUrl,
      },
    });
  }

  private async sendMedia(client: MetaApiClient, message: OutboundQueueMessage): Promise<MetaApiResponse> {
    const content = message.content as MediaContent;

    return client.sendMessage({
      messaging_product: 'whatsapp',
      to: message.recipient.phoneNumber,
      type: message.contentType,
      [message.contentType]: {
        link: content.url,
        caption: content.caption,
        filename: content.filename,
      },
    });
  }

  private async sendInteractive(client: MetaApiClient, message: OutboundQueueMessage): Promise<MetaApiResponse> {
    const content = message.content as InteractiveContent;

    return client.sendMessage({
      messaging_product: 'whatsapp',
      to: message.recipient.phoneNumber,
      type: 'interactive',
      interactive: {
        type: content.interactiveType,
        header: content.header,
        body: content.body,
        footer: content.footer,
        action: content.action,
      },
    });
  }

  private async getCredentials(config: OutboundQueueMessage['credentials']): Promise<MetaCredentials> {
    if (config.type === 'inline') {
      return {
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
      };
    }

    return this.secretsService.getSecret<MetaCredentials>(config.secretArn);
  }
}

interface MetaCredentials {
  accessToken: string;
  phoneNumberId: string;
}

interface MetaApiResponse {
  messaging_product: string;
  contacts: Array<{ wa_id: string }>;
  messages: Array<{ id: string }>;
}
```

### Meta Error Handler

```typescript
// meta/meta-error-handler.ts

import { ProviderError } from '../shared/interfaces';

// Meta error codes that indicate rate limiting
const RATE_LIMIT_CODES = [4, 17, 341, 368];

// Meta error codes that are retryable
const RETRYABLE_CODES = [
  ...RATE_LIMIT_CODES,
  1,      // Unknown error (transient)
  2,      // Service temporarily unavailable
  -1,     // Network errors
];

// Meta error codes that are NOT retryable
const NON_RETRYABLE_CODES = [
  100,    // Invalid parameter
  131030, // Recipient not on WhatsApp
  131031, // Business account not verified
  131047, // Re-engagement message outside 24h window
  131051, // Unsupported message type
  132000, // Template not found
  132001, // Template paused
  132005, // Template param count mismatch
  132007, // Template format error
  132012, // Template param format mismatch
  132015, // Template rejected
];

export class MetaErrorHandler {
  handle(error: unknown): ProviderError {
    // Network/fetch error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error connecting to Meta API',
        retryable: true,
        rawError: error,
      };
    }

    // Meta API error response
    if (this.isMetaApiError(error)) {
      const metaError = error.error;
      const code = metaError.code;

      // Rate limit specific handling
      if (RATE_LIMIT_CODES.includes(code)) {
        return {
          code: 'RATE_LIMITED',
          message: metaError.message,
          retryable: true,
          retryAfterSeconds: this.extractRetryAfter(error),
          rawError: error,
        };
      }

      // Known non-retryable errors
      if (NON_RETRYABLE_CODES.includes(code)) {
        return {
          code: `META_${code}`,
          message: metaError.message,
          retryable: false,
          rawError: error,
        };
      }

      // Known retryable errors
      if (RETRYABLE_CODES.includes(code)) {
        return {
          code: `META_${code}`,
          message: metaError.message,
          retryable: true,
          rawError: error,
        };
      }

      // Unknown Meta error - default to non-retryable
      return {
        code: `META_${code}`,
        message: metaError.message,
        retryable: false,
        rawError: error,
      };
    }

    // Unknown error - default to retryable for safety
    return {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      retryable: true,
      rawError: error,
    };
  }

  private isMetaApiError(error: unknown): error is MetaApiError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as MetaApiError).error === 'object'
    );
  }

  private extractRetryAfter(error: MetaApiError): number {
    // Try to extract from error details
    const details = error.error.error_data?.details;
    if (details && typeof details === 'string') {
      const match = details.match(/retry after (\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // Default backoff: 60 seconds
    return 60;
  }
}

interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_data?: {
      details?: string;
    };
  };
}
```

### Callback Service

```typescript
// shared/services/callback.service.ts

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { CallbackMessage } from '../interfaces';
import { Logger } from '../utils/logger';

const logger = new Logger('callback-service');

export class CallbackService {
  private sqs: SQSClient;
  private queueUrl: string;

  constructor() {
    this.sqs = new SQSClient({});
    this.queueUrl = process.env.CALLBACK_QUEUE_URL!;
  }

  async send(callback: CallbackMessage): Promise<void> {
    try {
      await this.sqs.send(new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(callback),
        MessageAttributes: {
          'tenantId': {
            DataType: 'String',
            StringValue: callback.tenantId,
          },
          'status': {
            DataType: 'String',
            StringValue: callback.status,
          },
          'provider': {
            DataType: 'String',
            StringValue: callback.provider,
          },
        },
      }));

      logger.debug('Callback sent', {
        correlationId: callback.correlationId,
        status: callback.status,
      });

    } catch (error) {
      logger.error('Failed to send callback', { error, callback });
      // Don't throw - callback failure shouldn't fail the message send
    }
  }
}
```

---

## Backend Integration

### Queue Abstraction Layer

```typescript
// backend/src/jobs/interfaces/message-queue.interface.ts

export interface IMessageQueue {
  /**
   * Enqueue an outbound message for delivery
   */
  enqueueOutbound(message: OutboundMessageRequest): Promise<string>;

  /**
   * Enqueue a broadcast orchestration job
   */
  enqueueBroadcast(broadcast: BroadcastRequest): Promise<string>;

  /**
   * Cancel a scheduled broadcast
   */
  cancelBroadcast(broadcastId: string): Promise<void>;

  /**
   * Get queue statistics
   */
  getStats(): Promise<QueueStats>;
}

export interface OutboundMessageRequest {
  tenantId: string;
  channelAccountId: string;
  provider: 'meta' | 'twilio' | 'sinch';

  context: {
    type: 'broadcast' | 'conversation';
    broadcastId?: string;
    conversationId?: string;
    internalMessageId: string;
  };

  recipient: {
    phoneNumber: string;
    name?: string;
  };

  contentType: string;
  content: unknown;

  // Scheduling
  delay?: number;  // milliseconds
}

export interface BroadcastRequest {
  tenantId: string;
  broadcastId: string;
  scheduledAt?: Date;
}

export interface QueueStats {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}
```

### SQS Implementation

```typescript
// backend/src/jobs/sqs-message-queue.ts

import { SQSClient, SendMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { injectable } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import {
  IMessageQueue,
  OutboundMessageRequest,
  BroadcastRequest,
  QueueStats
} from './interfaces/message-queue.interface';
import { ChannelAccountRepository } from '../features/channel-accounts/channel-account.repository';

@injectable()
export class SQSMessageQueue implements IMessageQueue {
  private sqs: SQSClient;

  private queueUrls: Record<string, string> = {
    meta: process.env.META_QUEUE_URL!,
    twilio: process.env.TWILIO_QUEUE_URL!,
    sinch: process.env.SINCH_QUEUE_URL!,
  };

  private broadcastQueueUrl = process.env.BROADCAST_QUEUE_URL!;

  constructor(
    private channelAccountRepository: ChannelAccountRepository,
  ) {
    this.sqs = new SQSClient({
      region: process.env.AWS_REGION,
    });
  }

  async enqueueOutbound(request: OutboundMessageRequest): Promise<string> {
    const messageId = uuidv4();
    const correlationId = uuidv4();

    // Get credentials reference
    const channelAccount = await this.channelAccountRepository.findById(
      request.channelAccountId,
      request.tenantId,
    );

    const queueUrl = this.queueUrls[request.provider];
    if (!queueUrl) {
      throw new Error(`Unknown provider: ${request.provider}`);
    }

    const message: OutboundQueueMessage = {
      messageId,
      correlationId,
      timestamp: new Date().toISOString(),
      version: '1.0',

      provider: request.provider,
      channelAccountId: request.channelAccountId,
      tenantId: request.tenantId,

      context: request.context,

      recipient: request.recipient,
      contentType: request.contentType,
      content: request.content,

      attempt: 1,
      maxAttempts: 4,

      credentials: {
        type: 'reference',
        secretArn: channelAccount.credentialsSecretArn,
      },
    };

    await this.sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageDeduplicationId: messageId,
      MessageGroupId: request.channelAccountId, // FIFO ordering per channel
      DelaySeconds: request.delay ? Math.min(Math.floor(request.delay / 1000), 900) : undefined,
    }));

    return messageId;
  }

  async enqueueBroadcast(request: BroadcastRequest): Promise<string> {
    const orchestrationId = uuidv4();

    const message: BroadcastOrchestrationMessage = {
      orchestrationId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      tenantId: request.tenantId,
      broadcastId: request.broadcastId,
      action: 'expand_recipients',
    };

    const delay = request.scheduledAt
      ? Math.max(0, Math.floor((request.scheduledAt.getTime() - Date.now()) / 1000))
      : 0;

    await this.sqs.send(new SendMessageCommand({
      QueueUrl: this.broadcastQueueUrl,
      MessageBody: JSON.stringify(message),
      MessageDeduplicationId: orchestrationId,
      MessageGroupId: request.broadcastId,
      DelaySeconds: Math.min(delay, 900), // Max 15 minutes
    }));

    return orchestrationId;
  }

  async cancelBroadcast(broadcastId: string): Promise<void> {
    // SQS doesn't support message deletion by content
    // Instead, the Lambda should check broadcast status before processing
    // This is a no-op for SQS implementation
  }

  async getStats(): Promise<QueueStats> {
    // Would need CloudWatch metrics for accurate stats
    // This is a simplified implementation
    return {
      pending: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
    };
  }
}
```

### Callback Handler (Backend)

```typescript
// backend/src/features/callbacks/callback.controller.ts

import { Router } from 'express';
import { injectable } from 'tsyringe';
import { CallbackService } from './callback.service';
import { Logger } from '../../shared/logger';

const logger = new Logger('callback-controller');

@injectable()
export class CallbackController {
  router = Router();

  constructor(private callbackService: CallbackService) {
    // This endpoint receives callbacks from Lambda via API Gateway
    // or directly if using VPC
    this.router.post('/callbacks/message-status', this.handleMessageStatus.bind(this));
  }

  private async handleMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const callback: CallbackMessage = req.body;

      logger.debug('Received message callback', {
        correlationId: callback.correlationId,
        status: callback.status,
      });

      await this.callbackService.processMessageCallback(callback);

      res.status(200).json({ success: true });

    } catch (error) {
      logger.error('Failed to process callback', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

```typescript
// backend/src/features/callbacks/callback.service.ts

import { injectable } from 'tsyringe';
import { MessageRepository } from '../inbox/message.repository';
import { BroadcastRepository } from '../broadcasts/broadcast.repository';
import { SSEService } from '../sse/sse.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CallbackMessage } from './callback.interface';

@injectable()
export class CallbackService {
  constructor(
    private messageRepository: MessageRepository,
    private broadcastRepository: BroadcastRepository,
    private sseService: SSEService,
    private auditLogService: AuditLogService,
  ) {}

  async processMessageCallback(callback: CallbackMessage): Promise<void> {
    const { context, status, providerMessageId, error } = callback;

    // Update message status
    if (status === 'sent') {
      await this.messageRepository.update(context.internalMessageId, {
        status: 'SENT',
        providerMessageId,
        sentAt: callback.sentAt ? new Date(callback.sentAt) : new Date(),
      });
    } else {
      await this.messageRepository.update(context.internalMessageId, {
        status: 'FAILED',
        errorCode: error?.code,
        errorMessage: error?.message,
      });
    }

    // Emit SSE event
    this.sseService.emitToTenant(callback.tenantId, 'message:status', {
      messageId: context.internalMessageId,
      status: status === 'sent' ? 'SENT' : 'FAILED',
      providerMessageId,
      error,
    });

    // Update broadcast metrics if applicable
    if (context.type === 'broadcast' && context.broadcastId) {
      if (status === 'sent') {
        await this.broadcastRepository.incrementSentCount(context.broadcastId);
      } else {
        await this.broadcastRepository.incrementFailedCount(context.broadcastId);
      }

      // Check if broadcast is complete
      const broadcast = await this.broadcastRepository.findById(context.broadcastId);
      if (broadcast && broadcast.sentCount + broadcast.failedCount >= broadcast.totalRecipients) {
        await this.broadcastRepository.update(context.broadcastId, {
          status: 'COMPLETED',
          completedAt: new Date(),
        });

        this.sseService.emitToTenant(callback.tenantId, 'broadcast:completed', {
          broadcastId: context.broadcastId,
        });
      }
    }

    // Audit log
    await this.auditLogService.log({
      tenantId: callback.tenantId,
      action: status === 'sent' ? 'MESSAGE_SENT' : 'MESSAGE_FAILED',
      resourceType: 'message',
      resourceId: context.internalMessageId,
      metadata: {
        provider: callback.provider,
        providerMessageId,
        error,
        metrics: callback.metrics,
      },
    });
  }
}
```

---

## Infrastructure as Code (CDK)

```typescript
// infrastructure/lib/messaging-stack.ts

import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface MessagingStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
}

export class MessagingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // ==================== Dead Letter Queues ====================

    const metaDlq = new sqs.Queue(this, 'MetaDLQ', {
      queueName: `omnichannel-meta-dlq-${environment}.fifo`,
      fifo: true,
      retentionPeriod: cdk.Duration.days(14),
    });

    const twilioDlq = new sqs.Queue(this, 'TwilioDLQ', {
      queueName: `omnichannel-twilio-dlq-${environment}.fifo`,
      fifo: true,
      retentionPeriod: cdk.Duration.days(14),
    });

    // ==================== Provider Queues ====================

    const metaQueue = new sqs.Queue(this, 'MetaQueue', {
      queueName: `omnichannel-meta-messages-${environment}.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(14),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      deadLetterQueue: {
        queue: metaDlq,
        maxReceiveCount: 4,
      },
    });

    const twilioQueue = new sqs.Queue(this, 'TwilioQueue', {
      queueName: `omnichannel-twilio-messages-${environment}.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(14),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      deadLetterQueue: {
        queue: twilioDlq,
        maxReceiveCount: 4,
      },
    });

    // ==================== Callback Queue ====================

    const callbackQueue = new sqs.Queue(this, 'CallbackQueue', {
      queueName: `omnichannel-callbacks-${environment}`,
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(1),
    });

    // ==================== Broadcast Orchestration Queue ====================

    const broadcastQueue = new sqs.Queue(this, 'BroadcastQueue', {
      queueName: `omnichannel-broadcast-orchestration-${environment}.fifo`,
      fifo: true,
      visibilityTimeout: cdk.Duration.minutes(5),
      retentionPeriod: cdk.Duration.days(14),
    });

    // ==================== Lambda Functions ====================

    // Shared Lambda layer
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambdas/dist/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for messaging lambdas',
    });

    // Meta Sender Lambda
    const metaSenderLambda = new lambda.Function(this, 'MetaSenderLambda', {
      functionName: `omnichannel-meta-sender-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/dist/meta'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      reservedConcurrentExecutions: 80,
      layers: [sharedLayer],
      environment: {
        CALLBACK_QUEUE_URL: callbackQueue.queueUrl,
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Twilio Sender Lambda
    const twilioSenderLambda = new lambda.Function(this, 'TwilioSenderLambda', {
      functionName: `omnichannel-twilio-sender-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/dist/twilio'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      reservedConcurrentExecutions: 100,  // Twilio rate limit
      layers: [sharedLayer],
      environment: {
        CALLBACK_QUEUE_URL: callbackQueue.queueUrl,
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
    });

    // Broadcast Orchestrator Lambda
    const broadcastOrchestratorLambda = new lambda.Function(this, 'BroadcastOrchestratorLambda', {
      functionName: `omnichannel-broadcast-orchestrator-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/dist/broadcast-orchestrator'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      reservedConcurrentExecutions: 10,
      layers: [sharedLayer],
      environment: {
        META_QUEUE_URL: metaQueue.queueUrl,
        TWILIO_QUEUE_URL: twilioQueue.queueUrl,
        DATABASE_SECRET_ARN: `arn:aws:secretsmanager:${this.region}:${this.account}:secret:omnichannel/database-${environment}`,
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
    });

    // ==================== Event Source Mappings ====================

    metaSenderLambda.addEventSource(new lambdaEventSources.SqsEventSource(metaQueue, {
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(1),
      reportBatchItemFailures: true,
    }));

    twilioSenderLambda.addEventSource(new lambdaEventSources.SqsEventSource(twilioQueue, {
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(1),
      reportBatchItemFailures: true,
    }));

    broadcastOrchestratorLambda.addEventSource(new lambdaEventSources.SqsEventSource(broadcastQueue, {
      batchSize: 1,
      reportBatchItemFailures: true,
    }));

    // ==================== Permissions ====================

    // SQS permissions
    callbackQueue.grantSendMessages(metaSenderLambda);
    callbackQueue.grantSendMessages(twilioSenderLambda);

    metaQueue.grantSendMessages(broadcastOrchestratorLambda);
    twilioQueue.grantSendMessages(broadcastOrchestratorLambda);

    // Secrets Manager permissions (for provider credentials)
    metaSenderLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:omnichannel/meta/*`],
    }));

    twilioSenderLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:omnichannel/twilio/*`],
    }));

    // ==================== Outputs ====================

    new cdk.CfnOutput(this, 'MetaQueueUrl', {
      value: metaQueue.queueUrl,
      exportName: `omnichannel-meta-queue-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'TwilioQueueUrl', {
      value: twilioQueue.queueUrl,
      exportName: `omnichannel-twilio-queue-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'BroadcastQueueUrl', {
      value: broadcastQueue.queueUrl,
      exportName: `omnichannel-broadcast-queue-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'CallbackQueueUrl', {
      value: callbackQueue.queueUrl,
      exportName: `omnichannel-callback-queue-url-${environment}`,
    });
  }
}
```

---

## Migration Strategy

### Phase 1: Preparation (No Production Impact)

1. **Create queue abstraction interface** in backend
2. **Implement both BullMQ and SQS** adapters
3. **Add feature flag** for queue selection
4. **Deploy Lambda infrastructure** (disabled triggers)
5. **Test in dev environment**

### Phase 2: Shadow Mode

1. **Enable dual-write**: Send to both BullMQ and SQS
2. **Disable SQS Lambda triggers**: Messages queue but don't process
3. **Monitor queue depths** and message patterns
4. **Validate message format** compatibility

### Phase 3: Gradual Migration

1. **Enable Lambda triggers** with low concurrency
2. **Route 5% traffic to SQS** (by tenant or random)
3. **Monitor success rates, latency, costs**
4. **Gradually increase** to 25%, 50%, 100%
5. **Keep BullMQ as fallback** during transition

### Phase 4: Cleanup

1. **Remove BullMQ** code paths
2. **Decommission Redis** (if no other use)
3. **Remove feature flags**
4. **Update documentation**

### Rollback Plan

At any point:
1. Disable Lambda triggers
2. Set feature flag to BullMQ
3. All traffic returns to BullMQ immediately

---

## Monitoring & Observability

### CloudWatch Metrics

| Metric | Source | Alarm Threshold |
|--------|--------|-----------------|
| ApproximateNumberOfMessagesVisible | SQS | > 1000 for 5 min |
| ApproximateAgeOfOldestMessage | SQS | > 300 seconds |
| NumberOfMessagesReceived | SQS DLQ | > 0 |
| Errors | Lambda | > 5% error rate |
| Duration | Lambda | p99 > 8000ms |
| Throttles | Lambda | > 0 |

### CloudWatch Dashboard

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Message Queue Depth",
        "metrics": [
          ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "omnichannel-meta-messages-prod.fifo"],
          ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "omnichannel-twilio-messages-prod.fifo"]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Lambda Invocations & Errors",
        "metrics": [
          ["AWS/Lambda", "Invocations", "FunctionName", "omnichannel-meta-sender-prod"],
          ["AWS/Lambda", "Errors", "FunctionName", "omnichannel-meta-sender-prod"]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Dead Letter Queue Messages",
        "metrics": [
          ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "omnichannel-meta-dlq-prod.fifo"],
          ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "omnichannel-twilio-dlq-prod.fifo"]
        ]
      }
    }
  ]
}
```

### X-Ray Tracing

Enable X-Ray for end-to-end tracing:

```typescript
// In Lambda handler
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { SQSClient } from '@aws-sdk/client-sqs';

const sqs = captureAWSv3Client(new SQSClient({}));
```

---

## Cost Estimation

### SQS Costs (per million messages)

| Component | Cost |
|-----------|------|
| Standard Queue Requests | $0.40 |
| FIFO Queue Requests | $0.50 |
| Data Transfer (same region) | Free |

### Lambda Costs

| Component | Cost |
|-----------|------|
| Requests | $0.20 per million |
| Duration (256MB) | $0.0000042 per 100ms |
| Duration (512MB) | $0.0000083 per 100ms |

### Example: 1M Messages/Month (No DynamoDB)

| Component | Calculation | Cost |
|-----------|-------------|------|
| SQS (FIFO) | 1M × $0.50/M | $0.50 |
| Lambda Invocations | 1M × $0.20/M | $0.20 |
| Lambda Duration | 1M × 200ms × $0.0000042 | $0.84 |
| **Total** | | **~$1.54/month** |

### Example: 10M Messages/Month

| Component | Calculation | Cost |
|-----------|-------------|------|
| SQS (FIFO) | 10M × $0.50/M | $5.00 |
| Lambda Invocations | 10M × $0.20/M | $2.00 |
| Lambda Duration | 10M × 200ms × $0.0000042 | $8.40 |
| **Total** | | **~$15.40/month** |

### Comparison with Current (BullMQ/Redis)

| Volume | Redis (ElastiCache) | SQS + Lambda |
|--------|---------------------|--------------|
| 1M msgs/month | ~$12-15 (t3.micro) | ~$1.50 |
| 10M msgs/month | ~$25-30 (t3.small) | ~$15 |
| 100M msgs/month | ~$50-80 (t3.medium) | ~$150 |

**Key insight**: SQS + Lambda is cheaper at low-medium volumes and scales linearly. Redis has fixed costs but better unit economics at very high volumes.

### Burst Handling (No Extra Cost)

The serverless architecture handles bursts automatically:

| Scenario | SQS + Lambda | Redis + BullMQ |
|----------|--------------|----------------|
| Christmas spike (10x normal) | Messages queue, Lambda auto-scales | May need to scale Redis manually |
| Black Friday (100K messages in 1 hour) | Absorbed by SQS, processed at rate limit | Possible Redis memory pressure |
| Idle periods | $0 cost | Still paying for Redis instance |

---

## Security Considerations

### 1. Encryption

- **SQS**: Enable SSE with AWS managed keys (default) or CMK
- **DynamoDB**: Enable encryption at rest
- **Lambda Environment Variables**: Use AWS Secrets Manager for sensitive values

### 2. Network Security

- **VPC**: Deploy Lambdas in VPC if backend is in VPC
- **Security Groups**: Restrict outbound to only required endpoints
- **VPC Endpoints**: Use for SQS, DynamoDB, Secrets Manager

### 3. IAM

- **Least Privilege**: Each Lambda only accesses its required queues
- **Resource-based Policies**: Restrict queue access to specific Lambdas
- **Service-linked Roles**: Use for automatic permissions

### 4. Credential Management

- **AWS Secrets Manager**: Store provider API credentials
- **Rotation**: Enable automatic rotation for credentials
- **Access Logging**: Enable CloudTrail for Secrets Manager access

---

## Testing Strategy

### Unit Tests

```typescript
// meta/meta-sender.test.ts

describe('MetaSenderService', () => {
  it('should send text message successfully', async () => {
    const mockClient = {
      sendMessage: jest.fn().mockResolvedValue({
        messages: [{ id: 'wamid.123' }],
      }),
    };

    const sender = new MetaSenderService();
    sender['client'] = mockClient;

    const result = await sender.send({
      contentType: 'text',
      content: { type: 'text', body: 'Hello' },
      recipient: { phoneNumber: '+1234567890' },
      // ... other required fields
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBe('wamid.123');
  });

  it('should handle rate limit error', async () => {
    const mockClient = {
      sendMessage: jest.fn().mockRejectedValue({
        error: { code: 4, message: 'Rate limited' },
      }),
    };

    const sender = new MetaSenderService();
    sender['client'] = mockClient;

    const result = await sender.send({/* ... */});

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('RATE_LIMITED');
    expect(result.error?.retryable).toBe(true);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/meta-queue.test.ts

describe('Meta Queue Integration', () => {
  it('should process message end-to-end', async () => {
    // 1. Send message to queue
    const messageId = await sqsMessageQueue.enqueueOutbound({
      provider: 'meta',
      // ... message details
    });

    // 2. Wait for Lambda to process (use test queue with short visibility timeout)
    await waitForProcessing(messageId, 10000);

    // 3. Check callback queue
    const callback = await receiveCallback(messageId);

    expect(callback.status).toBe('sent');
    expect(callback.providerMessageId).toBeDefined();
  });
});
```

### Load Tests

```bash
# Use Artillery or k6 for load testing
artillery run load-test.yml

# load-test.yml
config:
  target: "https://sqs.us-east-1.amazonaws.com"
  phases:
    - duration: 60
      arrivalRate: 100  # 100 messages/second

scenarios:
  - flow:
      - post:
          url: "/queue-url"
          json:
            # message payload
```

---

## Appendix

### A. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `META_QUEUE_URL` | Meta SQS queue URL | `https://sqs.us-east-1.amazonaws.com/123/omnichannel-meta-messages.fifo` |
| `TWILIO_QUEUE_URL` | Twilio SQS queue URL | `https://sqs.us-east-1.amazonaws.com/123/omnichannel-twilio-messages.fifo` |
| `BROADCAST_QUEUE_URL` | Broadcast orchestration queue | `https://sqs.us-east-1.amazonaws.com/123/omnichannel-broadcast.fifo` |
| `CALLBACK_QUEUE_URL` | Callback queue URL | `https://sqs.us-east-1.amazonaws.com/123/omnichannel-callbacks` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `LOG_LEVEL` | Logging level | `info` |

### B. Error Code Reference

#### Meta Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 4 | API rate limit | Retry with backoff |
| 17 | User rate limit | Retry with backoff |
| 100 | Invalid parameter | Don't retry, log error |
| 131030 | Not on WhatsApp | Don't retry, mark failed |
| 131047 | Outside 24h window | Don't retry, use template |
| 341 | Too many requests | Retry with backoff |
| 368 | Temporarily blocked | Retry with long backoff |

#### Twilio Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 20429 | Too many requests | Retry with backoff |
| 21211 | Invalid phone | Don't retry |
| 21608 | Unverified number | Don't retry |
| 30003 | Unreachable | Retry once |

### C. Useful Commands

```bash
# View queue metrics
aws sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible

# Purge queue (dev only!)
aws sqs purge-queue --queue-url $QUEUE_URL

# View DLQ messages
aws sqs receive-message \
  --queue-url $DLQ_URL \
  --max-number-of-messages 10

# Invoke Lambda manually
aws lambda invoke \
  --function-name omnichannel-meta-sender-dev \
  --payload '{"Records":[...]}' \
  response.json

# View Lambda logs
aws logs tail /aws/lambda/omnichannel-meta-sender-dev --follow
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-09 | Claude | Initial architecture document |