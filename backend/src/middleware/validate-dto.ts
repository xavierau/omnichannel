import { Request, Response, NextFunction } from 'express';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { BadRequestException } from '@shared/exceptions/http-exceptions';

/**
 * Formats validation errors into a consistent structure.
 */
const formatValidationErrors = (errors: ValidationError[]) => {
  return errors.map((error) => ({
    field: error.property,
    constraints: error.constraints,
    value: error.value,
  }));
};

/**
 * Middleware to validate request body against a DTO class using class-validator
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export const validateDto = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to class instance
      const dtoInstance = plainToClass(dtoClass, req.body);

      // Validate the instance
      const errors: ValidationError[] = await validate(dtoInstance, {
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
        forbidUnknownValues: true, // Throw error on unknown values
      });

      if (errors.length > 0) {
        throw new BadRequestException('Validation failed', formatValidationErrors(errors));
      }

      // Replace req.body with validated and transformed DTO instance
      req.body = dtoInstance;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate request query parameters against a DTO class using class-validator
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export const validateQueryDto = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to class instance
      const dtoInstance = plainToClass(dtoClass, req.query as object, {
        enableImplicitConversion: true,
      });

      // Validate the instance (less strict for query params)
      const errors: ValidationError[] = await validate(dtoInstance as object, {
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: false, // Allow extra query params (browser extensions, etc.)
        forbidUnknownValues: false,
        skipMissingProperties: true, // Query params are optional by default
      });

      if (errors.length > 0) {
        throw new BadRequestException('Query validation failed', formatValidationErrors(errors));
      }

      // Attach validated query to request for use in handlers
      (req as any).validatedQuery = dtoInstance;
      next();
    } catch (error) {
      next(error);
    }
  };
};
