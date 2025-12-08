"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomFieldRoutes = createCustomFieldRoutes;
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const custom_field_controller_1 = require("./custom-field.controller");
const authenticate_1 = require("../../middleware/authenticate");
/**
 * Create routes for custom field management.
 *
 * @returns Express router
 */
function createCustomFieldRoutes() {
    const router = (0, express_1.Router)();
    const controller = tsyringe_1.container.resolve(custom_field_controller_1.CustomFieldController);
    // All routes require authentication
    router.use(authenticate_1.authenticate);
    // Reorder fields (must be before /:id routes to avoid conflict)
    router.patch('/reorder', (req, res, next) => controller.reorder(req, res, next));
    // List all custom fields for tenant
    router.get('/', (req, res, next) => controller.list(req, res, next));
    // Get a specific custom field
    router.get('/:id', (req, res, next) => controller.get(req, res, next));
    // Create a new custom field
    router.post('/', (req, res, next) => controller.create(req, res, next));
    // Update a custom field
    router.put('/:id', (req, res, next) => controller.update(req, res, next));
    // Delete a custom field
    router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
    return router;
}
