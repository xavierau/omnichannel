import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator decorator that ensures a date is in the future.
 * Used for scheduling broadcasts to ensure they are not scheduled in the past.
 *
 * @param validationOptions - Optional validation options
 * @returns PropertyDecorator
 */
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (!(value instanceof Date)) {
            return false;
          }

          // Allow a small buffer (1 minute) to account for request processing time
          const bufferMs = 60 * 1000;
          const now = new Date();
          const minTime = new Date(now.getTime() - bufferMs);

          return value > minTime;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a date in the future`;
        },
      },
    });
  };
}
