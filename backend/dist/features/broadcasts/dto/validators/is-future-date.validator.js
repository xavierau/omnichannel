"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsFutureDate = IsFutureDate;
const class_validator_1 = require("class-validator");
/**
 * Custom validator decorator that ensures a date is in the future.
 * Used for scheduling broadcasts to ensure they are not scheduled in the past.
 *
 * @param validationOptions - Optional validation options
 * @returns PropertyDecorator
 */
function IsFutureDate(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isFutureDate',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                validate(value, args) {
                    if (!(value instanceof Date)) {
                        return false;
                    }
                    // Allow a small buffer (1 minute) to account for request processing time
                    const bufferMs = 60 * 1000;
                    const now = new Date();
                    const minTime = new Date(now.getTime() - bufferMs);
                    return value > minTime;
                },
                defaultMessage(args) {
                    return `${args.property} must be a date in the future`;
                },
            },
        });
    };
}
