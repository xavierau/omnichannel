import { Router } from 'express';
import { container } from 'tsyringe';
import { CustomerController } from './customer.controller';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';
import { validateDto, validateQueryDto } from '@middleware/validate-dto';
import { requireTenant } from '@middleware/require-tenant';
import { validateUuid } from '@middleware/validate-uuid';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkTagsDto } from './dto/bulk-tags.dto';

const router = Router();
const controller = container.resolve(CustomerController);

// All routes require authentication and tenant
router.use(authenticate);
router.use(requireTenant);

// List all customers with pagination, search, and filters
router.get(
  '/',
  requirePermission('customers', 'read', 'all'),
  validateQueryDto(CustomerQueryDto),
  controller.listCustomers
);

// Export customers to CSV
router.get(
  '/export',
  requirePermission('customers', 'read', 'all'),
  validateQueryDto(CustomerQueryDto),
  controller.exportCustomers
);

// Bulk delete customers (must be before /:id route)
router.delete(
  '/bulk',
  csrfValidateToken,
  requirePermission('customers', 'delete', 'all'),
  validateDto(BulkDeleteDto),
  controller.bulkDelete
);

// Bulk update tags (must be before /:id route)
router.patch(
  '/bulk/tags',
  csrfValidateToken,
  requirePermission('customers', 'update', 'all'),
  validateDto(BulkTagsDto),
  controller.bulkUpdateTags
);

// Get specific customer
router.get(
  '/:id',
  requirePermission('customers', 'read', 'all'),
  validateUuid(),
  controller.getCustomer
);

// Create a new customer
router.post(
  '/',
  csrfValidateToken,
  requirePermission('customers', 'create', 'all'),
  validateDto(CreateCustomerDto),
  controller.createCustomer
);

// Update a customer
router.put(
  '/:id',
  csrfValidateToken,
  requirePermission('customers', 'update', 'all'),
  validateUuid(),
  validateDto(UpdateCustomerDto),
  controller.updateCustomer
);

// Delete a customer
router.delete(
  '/:id',
  csrfValidateToken,
  requirePermission('customers', 'delete', 'all'),
  validateUuid(),
  controller.deleteCustomer
);

export default router;
