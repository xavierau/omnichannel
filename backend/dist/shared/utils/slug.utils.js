"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = generateSlug;
const crypto = __importStar(require("crypto"));
/**
 * Generate a URL-friendly slug from a name string.
 *
 * @param name - The input string to convert to a slug
 * @returns A lowercase slug with a random 4-character suffix for uniqueness
 *
 * @example
 * generateSlug('Acme Corp') // Returns 'acme-corp-a1b2'
 * generateSlug('My Company!') // Returns 'my-company-c3d4'
 */
function generateSlug(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Name is required for slug generation');
    }
    // Lowercase the input
    let slug = name.toLowerCase();
    // Replace spaces with hyphens
    slug = slug.replace(/\s+/g, '-');
    // Remove special characters (keep alphanumeric and hyphens)
    slug = slug.replace(/[^a-z0-9-]/g, '');
    // Remove consecutive hyphens
    slug = slug.replace(/-+/g, '-');
    // Remove leading and trailing hyphens
    slug = slug.replace(/^-|-$/g, '');
    // Generate a 4-character random suffix for uniqueness
    const suffix = crypto.randomBytes(2).toString('hex');
    return `${slug}-${suffix}`;
}
