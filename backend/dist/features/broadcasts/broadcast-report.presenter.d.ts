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
 * Transforms a Broadcast entity to its report response format.
 * Includes calculated metrics and percentages.
 *
 * @param broadcast - The broadcast entity to transform
 * @returns The broadcast report response object
 */
export declare function toBroadcastReportResponse(broadcast: Broadcast): BroadcastReportResponse;
