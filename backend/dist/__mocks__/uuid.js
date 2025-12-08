"use strict";
/**
 * Mock for uuid module used in tests.
 * Provides deterministic UUID generation for testing purposes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMockUuid = exports.v4 = void 0;
let callCount = 0;
exports.v4 = jest.fn(() => {
    callCount++;
    return `mock-uuid-${callCount.toString().padStart(4, '0')}`;
});
const resetMockUuid = () => {
    callCount = 0;
    exports.v4.mockClear();
};
exports.resetMockUuid = resetMockUuid;
