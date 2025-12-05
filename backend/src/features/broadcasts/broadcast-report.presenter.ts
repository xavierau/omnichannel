import { Broadcast } from './broadcast.entity';
import { BroadcastStatus } from './enums';

/**
 * Response structure for broadcast metrics.
 */
export interface BroadcastMetricsResponse {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}

/**
 * Response structure for broadcast rates (percentages).
 */
export interface BroadcastRatesResponse {
  deliveryRate: number;
  readRate: number;
  failureRate: number;
}

/**
 * Full response structure for a broadcast report.
 */
export interface BroadcastReportResponse {
  id: string;
  name: string;
  status: BroadcastStatus;
  templateName: string;
  totalRecipients: number;
  metrics: BroadcastMetricsResponse;
  rates: BroadcastRatesResponse;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number | null;
}

/**
 * Calculates the delivery rate as a percentage.
 * Formula: delivered / sent * 100
 *
 * @param delivered - Number of delivered messages
 * @param sent - Number of sent messages
 * @returns Delivery rate percentage (0-100), rounded to 2 decimal places
 */
function calculateDeliveryRate(delivered: number, sent: number): number {
  if (sent === 0) {
    return 0;
  }
  return Math.round((delivered / sent) * 10000) / 100;
}

/**
 * Calculates the read rate as a percentage.
 * Formula: read / delivered * 100
 *
 * @param read - Number of read messages
 * @param delivered - Number of delivered messages
 * @returns Read rate percentage (0-100), rounded to 2 decimal places
 */
function calculateReadRate(read: number, delivered: number): number {
  if (delivered === 0) {
    return 0;
  }
  return Math.round((read / delivered) * 10000) / 100;
}

/**
 * Calculates the failure rate as a percentage.
 * Formula: failed / sent * 100
 *
 * @param failed - Number of failed messages
 * @param sent - Number of sent messages
 * @returns Failure rate percentage (0-100), rounded to 2 decimal places
 */
function calculateFailureRate(failed: number, sent: number): number {
  if (sent === 0) {
    return 0;
  }
  return Math.round((failed / sent) * 10000) / 100;
}

/**
 * Calculates the duration in seconds between two dates.
 *
 * @param startedAt - Start time
 * @param completedAt - End time
 * @returns Duration in seconds, or null if either date is missing
 */
function calculateDuration(startedAt: Date | null, completedAt: Date | null): number | null {
  if (!startedAt || !completedAt) {
    return null;
  }
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  return Math.round((end - start) / 1000);
}

/**
 * Transforms a Broadcast entity to its report response format.
 * Includes calculated metrics and percentages.
 *
 * @param broadcast - The broadcast entity to transform
 * @returns The broadcast report response object
 */
export function toBroadcastReportResponse(broadcast: Broadcast): BroadcastReportResponse {
  const { sentCount, deliveredCount, readCount, failedCount, totalRecipients } = broadcast;

  // Calculate pending messages
  const pending = Math.max(0, totalRecipients - sentCount);

  // Calculate rates
  const deliveryRate = calculateDeliveryRate(deliveredCount, sentCount);
  const readRate = calculateReadRate(readCount, deliveredCount);
  const failureRate = calculateFailureRate(failedCount, sentCount);

  // Calculate duration
  const duration = calculateDuration(broadcast.startedAt, broadcast.completedAt);

  return {
    id: broadcast.id,
    name: broadcast.name,
    status: broadcast.status,
    templateName: broadcast.templateName,
    totalRecipients: broadcast.totalRecipients,
    metrics: {
      sent: sentCount,
      delivered: deliveredCount,
      read: readCount,
      failed: failedCount,
      pending,
    },
    rates: {
      deliveryRate,
      readRate,
      failureRate,
    },
    scheduledAt: broadcast.scheduledAt,
    startedAt: broadcast.startedAt,
    completedAt: broadcast.completedAt,
    duration,
  };
}
