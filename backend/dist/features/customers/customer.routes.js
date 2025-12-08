"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const customer_controller_1 = require("./customer.controller");
const csrf_protection_1 = require("@middleware/csrf-protection");
const authenticate_1 = require("@middleware/authenticate");
const authorize_1 = require("@middleware/authorize");
const validate_dto_1 = require("@middleware/validate-dto");
const require_tenant_1 = require("@middleware/require-tenant");
const validate_uuid_1 = require("@middleware/validate-uuid");
const create_customer_dto_1 = require("./dto/create-customer.dto");
const update_customer_dto_1 = require("./dto/update-customer.dto");
const customer_query_dto_1 = require("./dto/customer-query.dto");
const bulk_delete_dto_1 = require("./dto/bulk-delete.dto");
const bulk_tags_dto_1 = require("./dto/bulk-tags.dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(customer_controller_1.CustomerController);
// All routes require authentication and tenant
router.use(authenticate_1.authenticate);
router.use(require_tenant_1.requireTenant);
// List all customers with pagination, search, and filters
router.get('/', (0, authorize_1.requirePermission)('customers', 'read', 'all'), (0, validate_dto_1.validateQueryDto)(customer_query_dto_1.CustomerQueryDto), controller.listCustomers);
// Export customers to CSV
router.get('/export', (0, authorize_1.requirePermission)('customers', 'read', 'all'), (0, validate_dto_1.validateQueryDto)(customer_query_dto_1.CustomerQueryDto), controller.exportCustomers);
// Bulk delete customers (must be before /:id route)
router.delete('/bulk', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'delete', 'all'), (0, validate_dto_1.validateDto)(bulk_delete_dto_1.BulkDeleteDto), controller.bulkDelete);
// Bulk update tags (must be before /:id route)
router.patch('/bulk/tags', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'update', 'all'), (0, validate_dto_1.validateDto)(bulk_tags_dto_1.BulkTagsDto), controller.bulkUpdateTags);
// Get specific customer
router.get('/:id', (0, authorize_1.requirePermission)('customers', 'read', 'all'), (0, validate_uuid_1.validateUuid)(), controller.getCustomer);
// Create a new customer
router.post('/', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'create', 'all'), (0, validate_dto_1.validateDto)(create_customer_dto_1.CreateCustomerDto), controller.createCustomer);
// Update a customer
router.put('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(update_customer_dto_1.UpdateCustomerDto), controller.updateCustomer);
// Delete a customer
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'delete', 'all'), (0, validate_uuid_1.validateUuid)(), controller.deleteCustomer);
exports.default = router;
