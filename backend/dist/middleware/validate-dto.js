"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQueryDto = exports.validateDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const http_exceptions_1 = require("../shared/exceptions/http-exceptions");
/**
 * Formats validation errors into a consistent structure.
 */
const formatValidationErrors = (errors) => {
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
const validateDto = (dtoClass) => {
    return async (req, res, next) => {
        try {
            // Transform plain object to class instance
            const dtoInstance = (0, class_transformer_1.plainToClass)(dtoClass, req.body);
            // Validate the instance
            const errors = await (0, class_validator_1.validate)(dtoInstance, {
                whitelist: true, // Strip properties that don't have decorators
                forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
                forbidUnknownValues: true, // Throw error on unknown values
            });
            if (errors.length > 0) {
                throw new http_exceptions_1.BadRequestException('Validation failed', formatValidationErrors(errors));
            }
            // Replace req.body with validated and transformed DTO instance
            req.body = dtoInstance;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateDto = validateDto;
/**
 * Middleware to validate request query parameters against a DTO class using class-validator
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
const validateQueryDto = (dtoClass) => {
    return async (req, res, next) => {
        try {
            // Transform plain object to class instance
            const dtoInstance = (0, class_transformer_1.plainToClass)(dtoClass, req.query, {
                enableImplicitConversion: true,
            });
            // Validate the instance (less strict for query params)
            const errors = await (0, class_validator_1.validate)(dtoInstance, {
                whitelist: true, // Strip properties that don't have decorators
                forbidNonWhitelisted: false, // Allow extra query params (browser extensions, etc.)
                forbidUnknownValues: false,
                skipMissingProperties: true, // Query params are optional by default
            });
            if (errors.length > 0) {
                throw new http_exceptions_1.BadRequestException('Query validation failed', formatValidationErrors(errors));
            }
            // Attach validated query to request for use in handlers
            req.validatedQuery = dtoInstance;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateQueryDto = validateQueryDto;
