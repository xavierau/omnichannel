"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = void 0;
const tsyringe_1 = require("tsyringe");
/**
 * Registry for provider implementations.
 * Allows dynamic provider registration and lookup.
 */
let ProviderRegistry = class ProviderRegistry {
    providers = new Map();
    /**
     * Register a provider implementation.
     *
     * @param providerCode - Unique provider code (e.g., 'meta_cloud_api')
     * @param providerClass - Provider implementation class constructor
     */
    register(providerCode, providerClass) {
        if (this.providers.has(providerCode)) {
            throw new Error(`Provider '${providerCode}' is already registered`);
        }
        this.providers.set(providerCode, providerClass);
    }
    /**
     * Get a provider implementation by code.
     *
     * @param providerCode - Provider code to look up
     * @returns Provider constructor or undefined
     */
    get(providerCode) {
        return this.providers.get(providerCode);
    }
    /**
     * Check if a provider is registered.
     *
     * @param providerCode - Provider code to check
     * @returns true if provider is registered
     */
    has(providerCode) {
        return this.providers.has(providerCode);
    }
    /**
     * List all registered provider codes.
     *
     * @returns Array of registered provider codes
     */
    listProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Create a new instance of a provider (uninitialized).
     *
     * @param providerCode - Provider code
     * @returns New provider instance
     */
    createInstance(providerCode) {
        const ProviderClass = this.get(providerCode);
        if (!ProviderClass) {
            throw new Error(`Provider '${providerCode}' is not registered`);
        }
        return new ProviderClass();
    }
};
exports.ProviderRegistry = ProviderRegistry;
exports.ProviderRegistry = ProviderRegistry = __decorate([
    (0, tsyringe_1.singleton)()
], ProviderRegistry);
