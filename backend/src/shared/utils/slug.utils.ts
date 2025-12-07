import * as crypto from 'crypto';

/**
 * Generate a URL-friendly slug from a name string.
 *
 * @param name - The input string to convert to a slug
 * @returns A lowercase slug with a random 4-character suffix for uniqueness
 *
 * @example
 * generateSlug('Acme Corp') // Returns 'acme-corp-a1b2'
 * generateSlug('My Company!') // Returns 'my-company-c3d4'
 */
export function generateSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required for slug generation');
  }

  // Lowercase the input
  let slug = name.toLowerCase();

  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-');

  // Remove special characters (keep alphanumeric and hyphens)
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // Remove consecutive hyphens
  slug = slug.replace(/-+/g, '-');

  // Remove leading and trailing hyphens
  slug = slug.replace(/^-|-$/g, '');

  // Generate a 4-character random suffix for uniqueness
  const suffix = crypto.randomBytes(2).toString('hex');

  return `${slug}-${suffix}`;
}
