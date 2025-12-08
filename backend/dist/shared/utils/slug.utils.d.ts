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
export declare function generateSlug(name: string): string;
