import { TemplateSubmissionJobData } from '../template-submission.queue';

/**
 * Interface for template submission queue.
 * Enables dependency inversion for TemplateService.
 */
export interface ITemplateSubmissionQueue {
  queueSubmission(data: TemplateSubmissionJobData): Promise<void>;
}

/**
 * DI token for ITemplateSubmissionQueue.
 */
export const ITemplateSubmissionQueue = Symbol('ITemplateSubmissionQueue');
