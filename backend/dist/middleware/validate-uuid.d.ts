import { Request, Response, NextFunction } from 'express';
/**
 * Validates that a string is a valid UUID v4.
 *
 * @param value - The string to validate
 * @returns true if the value is a valid UUID v4
 */
export declare const isValidUuid: (value: string) => boolean;
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
export declare const validateUuid: (...paramNames: string[]) => (req: Request, res: Response, next: NextFunction) => void;
