import { URL } from 'url';
import dns from 'dns/promises';
import { logger } from '@config/logger.config';

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
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);

  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    // Invalid IPv4 format - treat as suspicious
    return true;
  }

  const [a, b] = parts;

  // 10.0.0.0/8 - Private Class A
  if (a === 10) return true;

  // 172.16.0.0/12 - Private Class B (172.16.x.x - 172.31.x.x)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 - Private Class C
  if (a === 192 && b === 168) return true;

  // 127.0.0.0/8 - Loopback
  if (a === 127) return true;

  // 169.254.0.0/16 - Link-local (AWS metadata endpoint is 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 0.0.0.0/8 - "This" network
  if (a === 0) return true;

  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 - Reserved for future use / broadcast
  if (a >= 240) return true;

  return false;
}

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
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1)
  if (normalized === '::1') return true;

  // Unspecified (::)
  if (normalized === '::') return true;

  // Check for IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  const ipv4MappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4MappedMatch) {
    return isPrivateIPv4(ipv4MappedMatch[1]);
  }

  // Unique Local Address (fc00::/7 - starts with fc or fd)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Link-local (fe80::/10 - starts with fe80 through febf)
  if (normalized.match(/^fe[89ab]/)) {
    return true;
  }

  return false;
}

/**
 * Check if a hostname is a loopback/local reference.
 */
function isLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === 'localhost.localdomain' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local')
  );
}

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
export async function validateWebhookUrl(
  urlString: string,
  allowHttp = false
): Promise<UrlValidationResult> {
  let url: URL;

  // Parse the URL
  try {
    url = new URL(urlString);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // Check protocol (require HTTPS by default)
  const allowedProtocols = allowHttp ? ['http:', 'https:'] : ['https:'];
  if (!allowedProtocols.includes(url.protocol)) {
    return {
      isValid: false,
      error: `Protocol must be ${allowHttp ? 'HTTP or HTTPS' : 'HTTPS'}`,
    };
  }

  const hostname = url.hostname;

  // Block localhost and local hostnames
  if (isLocalHostname(hostname)) {
    return {
      isValid: false,
      error: 'Localhost and local hostnames are not allowed',
    };
  }

  // Check if hostname is an IP address
  if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    // Direct IPv4 address
    if (isPrivateIPv4(hostname)) {
      return {
        isValid: false,
        error: 'Private IP addresses are not allowed',
        resolvedIp: hostname,
      };
    }
    return { isValid: true, resolvedIp: hostname };
  }

  // Check for IPv6 literal (e.g., [::1])
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const ipv6 = hostname.slice(1, -1);
    if (isPrivateIPv6(ipv6)) {
      return {
        isValid: false,
        error: 'Private IPv6 addresses are not allowed',
        resolvedIp: ipv6,
      };
    }
    return { isValid: true, resolvedIp: ipv6 };
  }

  // Resolve hostname to IP addresses and check each one
  try {
    // Try IPv4 first
    const ipv4Addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const ipv6Addresses = await dns.resolve6(hostname).catch(() => [] as string[]);

    const allAddresses = [...ipv4Addresses, ...ipv6Addresses];

    if (allAddresses.length === 0) {
      return {
        isValid: false,
        error: 'Unable to resolve hostname',
      };
    }

    // Check all resolved addresses - reject if ANY is private
    for (const ip of ipv4Addresses) {
      if (isPrivateIPv4(ip)) {
        logger.warn('Webhook URL resolves to private IPv4', {
          hostname,
          resolvedIp: ip,
        });
        return {
          isValid: false,
          error: 'Hostname resolves to a private IP address',
          resolvedIp: ip,
        };
      }
    }

    for (const ip of ipv6Addresses) {
      if (isPrivateIPv6(ip)) {
        logger.warn('Webhook URL resolves to private IPv6', {
          hostname,
          resolvedIp: ip,
        });
        return {
          isValid: false,
          error: 'Hostname resolves to a private IPv6 address',
          resolvedIp: ip,
        };
      }
    }

    // All addresses are public
    return {
      isValid: true,
      resolvedIp: allAddresses[0],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'DNS resolution failed';
    logger.error('DNS resolution error during webhook URL validation', {
      hostname,
      error: errorMessage,
    });

    return {
      isValid: false,
      error: `DNS resolution failed: ${errorMessage}`,
    };
  }
}

/**
 * Custom error class for SSRF validation failures.
 */
export class SsrfValidationError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly resolvedIp?: string
  ) {
    super(message);
    this.name = 'SsrfValidationError';
  }
}
