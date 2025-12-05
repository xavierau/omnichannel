// Entity
export { Broadcast, VariableConfig, HeaderConfig, ButtonVariableConfig, TemplateVariablesConfig } from './broadcast.entity';

// Enums
export { BroadcastStatus, RecipientType } from './enums';

// DTOs
export {
  CreateBroadcastDto,
  UpdateBroadcastDto,
  BroadcastQueryDto,
  BulkActionDto,
  VariableConfigDto,
  HeaderConfigDto,
  ButtonVariableConfigDto,
  TemplateVariablesConfigDto,
} from './dto';

// Repository
export { BroadcastRepository, BroadcastQueryOptions, PaginatedResult, BroadcastMetrics } from './broadcast.repository';

// Service
export { BroadcastService } from './broadcast.service';

// Export Service
export { BroadcastExportService, BroadcastExportRow } from './broadcast-export.service';

// SSE Service
export { BroadcastSseService, BroadcastProgressEvent, SseEventType } from './broadcast-sse.service';

// Presenter
export {
  toBroadcastResponse,
  toBroadcastListResponse,
  toPaginatedBroadcastResponse,
  BroadcastResponse,
  BroadcastListResponse,
  PaginatedBroadcastResponse,
} from './broadcast.presenter';

// Report Presenter
export {
  toBroadcastReportResponse,
  BroadcastReportResponse,
  BroadcastMetricsResponse,
  BroadcastRatesResponse,
} from './broadcast-report.presenter';

// Controller
export { BroadcastController } from './broadcast.controller';

// Routes
export { default as broadcastRoutes } from './broadcast.routes';
