import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Maximum allowed size for customFields in bytes (roughly).
 * Set to 10KB to prevent abuse while allowing reasonable data storage.
 */
export const MAX_CUSTOM_FIELDS_SIZE = 10 * 1024;

/**
 * Maximum nesting depth allowed in customFields.
 */
export const MAX_CUSTOM_FIELDS_DEPTH = 3;

/**
 * Maximum number of keys allowed in customFields.
 */
export const MAX_CUSTOM_FIELDS_KEYS = 50;

/**
 * Recursively checks the depth of an object.
 */
export function getObjectDepth(obj: unknown, currentDepth = 0): number {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return currentDepth;
  }
  const depths = Object.values(obj).map((v) => getObjectDepth(v, currentDepth + 1));
  return depths.length > 0 ? Math.max(...depths) : currentDepth;
}

/**
 * Counts total keys in an object recursively.
 */
export function countKeys(obj: unknown): number {
  if (typeof obj !== 'object' || obj === null) {
    return 0;
  }
  if (Array.isArray(obj)) {
    return obj.reduce((count: number, item) => count + countKeys(item), 0);
  }
  return Object.keys(obj).length + Object.values(obj).reduce((count: number, v) => count + countKeys(v), 0);
}

/**
 * Validates that customFields values are primitives only (no functions, symbols, etc.)
 * Allows: string, number, boolean, null, arrays of primitives, and nested objects with primitives.
 */
export function validatePrimitiveValues(obj: unknown): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return true;
  }
  if (Array.isArray(obj)) {
    return obj.every((item) => validatePrimitiveValues(item));
  }
  if (typeof obj === 'object') {
    return Object.values(obj).every((v) => validatePrimitiveValues(v));
  }
  // Functions, symbols, etc. are not allowed
  return false;
}

/**
 * Custom validator for customFields that enforces:
 * - Maximum size limit
 * - Maximum nesting depth
 * - Maximum number of keys
 * - Only primitive values (no functions, symbols, etc.)
 */
export function IsValidCustomFields(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidCustomFields',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) {
            return true;
          }

          if (typeof value !== 'object' || Array.isArray(value)) {
            return false;
          }

          // Check size (rough estimate)
          const size = JSON.stringify(value).length;
          if (size > MAX_CUSTOM_FIELDS_SIZE) {
            return false;
          }

          // Check depth
          const depth = getObjectDepth(value);
          if (depth > MAX_CUSTOM_FIELDS_DEPTH) {
            return false;
          }

          // Check key count
          const keyCount = countKeys(value);
          if (keyCount > MAX_CUSTOM_FIELDS_KEYS) {
            return false;
          }

          // Check for primitive values only
          if (!validatePrimitiveValues(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `customFields must be an object with max ${MAX_CUSTOM_FIELDS_SIZE} bytes, max ${MAX_CUSTOM_FIELDS_DEPTH} levels of nesting, max ${MAX_CUSTOM_FIELDS_KEYS} keys, and only primitive values`;
        },
      },
    });
  };
}
