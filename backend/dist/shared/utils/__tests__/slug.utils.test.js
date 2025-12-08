"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slug_utils_1 = require("../slug.utils");
describe('generateSlug', () => {
    describe('basic transformations', () => {
        it('should lowercase the input', () => {
            const slug = (0, slug_utils_1.generateSlug)('ACME Corp');
            // Extract base slug (without the random suffix)
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('acme-corp');
        });
        it('should replace spaces with hyphens', () => {
            const slug = (0, slug_utils_1.generateSlug)('My Company Name');
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('my-company-name');
        });
        it('should handle multiple consecutive spaces', () => {
            const slug = (0, slug_utils_1.generateSlug)('My    Company');
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('my-company');
        });
        it('should remove special characters', () => {
            const slug = (0, slug_utils_1.generateSlug)('Acme & Co!@#$%');
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('acme-co');
        });
        it('should keep alphanumeric characters', () => {
            const slug = (0, slug_utils_1.generateSlug)('Company123');
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('company123');
        });
        it('should handle leading and trailing spaces', () => {
            const slug = (0, slug_utils_1.generateSlug)('  Trim Me  ');
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('trim-me');
        });
        it('should handle apostrophes', () => {
            const slug = (0, slug_utils_1.generateSlug)("John's Company");
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('johns-company');
        });
    });
    describe('suffix generation', () => {
        it('should append a 4-character random suffix', () => {
            const slug = (0, slug_utils_1.generateSlug)('Test Company');
            const suffix = slug.substring(slug.lastIndexOf('-') + 1);
            expect(suffix).toMatch(/^[a-f0-9]{4}$/);
        });
        it('should generate unique slugs for the same input', () => {
            const slug1 = (0, slug_utils_1.generateSlug)('Same Company');
            const slug2 = (0, slug_utils_1.generateSlug)('Same Company');
            expect(slug1).not.toBe(slug2);
        });
    });
    describe('edge cases', () => {
        it('should throw error for empty string', () => {
            expect(() => (0, slug_utils_1.generateSlug)('')).toThrow('Name is required for slug generation');
        });
        it('should throw error for null input', () => {
            expect(() => (0, slug_utils_1.generateSlug)(null)).toThrow('Name is required for slug generation');
        });
        it('should throw error for undefined input', () => {
            expect(() => (0, slug_utils_1.generateSlug)(undefined)).toThrow('Name is required for slug generation');
        });
        it('should handle single character input', () => {
            const slug = (0, slug_utils_1.generateSlug)('A');
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('a');
        });
        it('should handle numbers only', () => {
            const slug = (0, slug_utils_1.generateSlug)('12345');
            const base = slug.substring(0, slug.lastIndexOf('-'));
            expect(base).toBe('12345');
        });
        it('should handle special characters only', () => {
            const slug = (0, slug_utils_1.generateSlug)('!@#$%');
            // Should result in just the random suffix since all chars are removed
            expect(slug).toMatch(/^-[a-f0-9]{4}$/);
        });
    });
    describe('format validation', () => {
        it('should produce URL-safe slugs', () => {
            const slug = (0, slug_utils_1.generateSlug)('Complex Name With Spaces & Symbols!');
            // Slug should only contain lowercase letters, numbers, and hyphens
            expect(slug).toMatch(/^[a-z0-9-]+$/);
        });
        it('should not have consecutive hyphens', () => {
            const slug = (0, slug_utils_1.generateSlug)('Test   Multiple   Spaces');
            expect(slug).not.toMatch(/--/);
        });
        it('should not start with a hyphen', () => {
            const slug = (0, slug_utils_1.generateSlug)('  Spaced Start');
            expect(slug).not.toMatch(/^-/);
        });
    });
});
