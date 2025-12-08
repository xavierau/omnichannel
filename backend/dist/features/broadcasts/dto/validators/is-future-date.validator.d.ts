import { ValidationOptions } from 'class-validator';
/**
 * Custom validator decorator that ensures a date is in the future.
 * Used for scheduling broadcasts to ensure they are not scheduled in the past.
 *
 * @param validationOptions - Optional validation options
 * @returns PropertyDecorator
 */
export declare function IsFutureDate(validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
