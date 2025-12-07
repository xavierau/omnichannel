import { singleton } from 'tsyringe';

/**
 * Service for managing WhatsApp Cloud API 24-hour messaging window compliance.
 *
 * WhatsApp Business API requires that businesses can only send freeform messages
 * within 24 hours of the last customer message. After 24 hours, only pre-approved
 * template messages can be sent.
 *
 * This service provides utilities to:
 * - Check if the messaging window is currently open
 * - Calculate when the window expires
 * - Get the remaining time before window closure
 *
 * @see https://developers.facebook.com/docs/whatsapp/conversation-types
 */
@singleton()
export class MessagingWindowService {
  /**
   * The duration of the messaging window in hours.
   * WhatsApp Cloud API specifies a 24-hour window.
   */
  private readonly WINDOW_HOURS = 24;

  /**
   * Checks if the 24-hour messaging window is currently open.
   *
   * The window is open if:
   * - A customer message was received within the last 24 hours
   *
   * The window is closed if:
   * - No customer message has ever been received (null)
   * - More than 24 hours have passed since the last customer message
   *
   * @param lastCustomerMessageAt - Timestamp of the last customer message, or null if none
   * @returns true if freeform messages can be sent, false otherwise
   */
  isWindowOpen(lastCustomerMessageAt: Date | null): boolean {
    if (!lastCustomerMessageAt) {
      return false;
    }

    const windowEnd = this.getWindowExpiry(lastCustomerMessageAt);
    return new Date() < windowEnd;
  }

  /**
   * Calculates when the messaging window expires.
   *
   * @param lastCustomerMessageAt - Timestamp of the last customer message
   * @returns The date/time when the 24-hour window closes
   */
  getWindowExpiry(lastCustomerMessageAt: Date): Date {
    return new Date(lastCustomerMessageAt.getTime() + this.WINDOW_HOURS * 60 * 60 * 1000);
  }

  /**
   * Gets the remaining time in the messaging window.
   *
   * @param lastCustomerMessageAt - Timestamp of the last customer message, or null if none
   * @returns Remaining time in milliseconds, or null if no customer message exists.
   *          Returns 0 if the window has expired.
   */
  getTimeRemaining(lastCustomerMessageAt: Date | null): number | null {
    if (!lastCustomerMessageAt) {
      return null;
    }

    const windowEnd = this.getWindowExpiry(lastCustomerMessageAt);
    const remaining = windowEnd.getTime() - Date.now();

    return remaining > 0 ? remaining : 0;
  }
}
