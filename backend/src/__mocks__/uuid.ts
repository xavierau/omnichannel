/**
 * Mock for uuid module used in tests.
 * Provides deterministic UUID generation for testing purposes.
 */

let callCount = 0;

export const v4 = jest.fn(() => {
  callCount++;
  return `mock-uuid-${callCount.toString().padStart(4, '0')}`;
});

export const resetMockUuid = (): void => {
  callCount = 0;
  v4.mockClear();
};
