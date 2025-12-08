import { ValidationOptions } from 'class-validator';
/**
 * Maximum allowed size for customFields in bytes (roughly).
 * Set to 10KB to prevent abuse while allowing reasonable data storage.
 */
export declare const MAX_CUSTOM_FIELDS_SIZE: number;
/**
 * Maximum nesting depth allowed in customFields.
 */
export declare const MAX_CUSTOM_FIELDS_DEPTH = 3;
/**
 * Maximum number of keys allowed in customFields.
 */
export declare const MAX_CUSTOM_FIELDS_KEYS = 50;
/**
 * Recursively checks the depth of an object.
 */
export declare function getObjectDepth(obj: unknown, currentDepth?: number): number;
/**
 * Counts total keys in an object recursively.
 */
export declare function countKeys(obj: unknown): number;
/**
 * Validates that customFields values are primitives only (no functions, symbols, etc.)
 * Allows: string, number, boolean, null, arrays of primitives, and nested objects with primitives.
 */
export declare function validatePrimitiveValues(obj: unknown): boolean;
/**
 * Custom validator for customFields that enforces:
 * - Maximum size limit
 * - Maximum nesting depth
 * - Maximum number of keys
 * - Only primitive values (no functions, symbols, etc.)
 */
export declare function IsValidCustomFields(validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
