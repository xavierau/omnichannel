/**
 * SSRF (Server-Side Request Forgery) protection utilities.
 *
 * Validates URLs to prevent requests to internal/private network addresses.
 * This is critical for webhook dispatching to prevent attackers from:
 * - Accessing internal services (e.g., metadata endpoints, internal APIs)
 * - Port scanning internal networks
 * - Bypassing firewalls
 *
 * Blocked addresses:
 * - Private IP ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 * - Loopback: 127.0.0.0/8, localhost, ::1
 * - Link-local: 169.254.0.0/16 (AWS metadata endpoint)
 * - IPv6 private/reserved ranges
 */
/**
 * Result of URL validation.
 */
export interface UrlValidationResult {
    isValid: boolean;
    error?: string;
    resolvedIp?: string;
}
/**
 * Check if an IPv4 address is in a private/reserved range.
 *
 * Private ranges per RFC 1918 and other reserved ranges:
 * - 10.0.0.0/8: Class A private network
 * - 172.16.0.0/12: Class B private network
 * - 192.168.0.0/16: Class C private network
 * - 127.0.0.0/8: Loopback
 * - 169.254.0.0/16: Link-local (AWS/cloud metadata)
 * - 0.0.0.0/8: "This" network
 * - 224.0.0.0/4: Multicast
 * - 240.0.0.0/4: Reserved for future use
 */
export declare function isPrivateIPv4(ip: string): boolean;
/**
 * Check if an IPv6 address is in a private/reserved range.
 *
 * Reserved IPv6 ranges:
 * - ::1 - Loopback
 * - :: - Unspecified
 * - fc00::/7 - Unique Local Address (ULA)
 * - fe80::/10 - Link-local
 * - ::ffff:0:0/96 - IPv4-mapped addresses (check the IPv4 part)
 */
export declare function isPrivateIPv6(ip: string): boolean;
/**
 * Validate a webhook URL for SSRF vulnerabilities.
 *
 * Performs the following checks:
 * 1. URL is valid and uses HTTPS (HTTP allowed for testing if explicitly enabled)
 * 2. Hostname is not a local/loopback reference
 * 3. Resolved IP addresses are not in private/reserved ranges
 *
 * @param urlString - The URL to validate
 * @param allowHttp - Allow HTTP URLs (default: false, only HTTPS)
 * @returns Validation result with error details if invalid
 */
export declare function validateWebhookUrl(urlString: string, allowHttp?: boolean): Promise<UrlValidationResult>;
/**
 * Custom error class for SSRF validation failures.
 */
export declare class SsrfValidationError extends Error {
    readonly url: string;
    readonly resolvedIp?: string | undefined;
    constructor(message: string, url: string, resolvedIp?: string | undefined);
}
