import { Request, Response, NextFunction } from 'express';
import { BadRequestException } from '@shared/exceptions/http-exceptions';

/**
 * UUID v4 regex pattern for validation.
 * Matches standard UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where y is one of 8, 9, a, or b
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID v4.
 *
 * @param value - The string to validate
 * @returns true if the value is a valid UUID v4
 */
export const isValidUuid = (value: string): boolean => {
  return UUID_V4_REGEX.test(value);
};

/**
 * Middleware factory that validates path parameters are valid UUIDs.
 *
 * @param paramNames - The names of the path parameters to validate (defaults to ['id'])
 * @returns Express middleware function
 *
 * @example
 * // Validate the :id parameter
 * router.get('/:id', validateUuid(), controller.getById);
 *
 * // Validate multiple parameters
 * router.get('/:userId/orders/:orderId', validateUuid('userId', 'orderId'), controller.getOrder);
 */
export const validateUuid = (...paramNames: string[]) => {
  // Default to 'id' if no parameters specified
  const paramsToValidate = paramNames.length > 0 ? paramNames : ['id'];

  return (req: Request, res: Response, next: NextFunction): void => {
    for (const paramName of paramsToValidate) {
      const value = req.params[paramName];

      if (value === undefined) {
        // Parameter not present in route - skip validation
        continue;
      }

      if (!isValidUuid(value)) {
        return next(
          new BadRequestException(`Invalid ${paramName}: must be a valid UUID`)
        );
      }
    }

    next();
  };
};
