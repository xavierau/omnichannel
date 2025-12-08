import { Request, Response, NextFunction } from 'express';
import { ClassConstructor } from 'class-transformer';
/**
 * Middleware to validate request body against a DTO class using class-validator
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export declare const validateDto: <T extends object>(dtoClass: ClassConstructor<T>) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to validate request query parameters against a DTO class using class-validator
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export declare const validateQueryDto: <T extends object>(dtoClass: ClassConstructor<T>) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
