"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const tsyringe_1 = require("tsyringe");
const customer_repository_1 = require("./customer.repository");
const tag_repository_1 = require("../tags/tag.repository");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../config/logger.config");
let CustomerService = class CustomerService {
    customerRepository;
    tagRepository;
    constructor(customerRepository, tagRepository) {
        this.customerRepository = customerRepository;
        this.tagRepository = tagRepository;
    }
    async listCustomers(tenantId, options) {
        return this.customerRepository.findAll(tenantId, options);
    }
    async getCustomer(id, tenantId) {
        const customer = await this.customerRepository.findById(id, tenantId);
        if (!customer) {
            throw new http_exceptions_1.NotFoundException('Customer not found');
        }
        return customer;
    }
    async createCustomer(dto, tenantId) {
        // Check for duplicate WhatsApp number
        const exists = await this.customerRepository.existsByWhatsApp(dto.whatsappNumber, tenantId);
        if (exists) {
            throw new http_exceptions_1.ConflictException('Customer with this WhatsApp number already exists');
        }
        // Validate and fetch tags
        let tags = undefined;
        if (dto.tagIds && dto.tagIds.length > 0) {
            tags = await this.tagRepository.findByIds(dto.tagIds, tenantId);
            if (tags.length !== dto.tagIds.length) {
                throw new http_exceptions_1.BadRequestException('One or more tags not found');
            }
        }
        const customer = await this.customerRepository.create({
            name: dto.name,
            whatsappNumber: dto.whatsappNumber,
            customFields: dto.customFields || {},
            tenantId,
        }, tags);
        logger_config_1.auditLogger.info('Customer created', {
            action: 'customer.create',
            tenantId,
            customerId: customer.id,
            whatsappNumber: customer.whatsappNumber,
        });
        return customer;
    }
    async updateCustomer(id, dto, tenantId) {
        const customer = await this.getCustomer(id, tenantId);
        // Check for duplicate WhatsApp if being updated
        if (dto.whatsappNumber && dto.whatsappNumber !== customer.whatsappNumber) {
            const exists = await this.customerRepository.existsByWhatsApp(dto.whatsappNumber, tenantId, id);
            if (exists) {
                throw new http_exceptions_1.ConflictException('Customer with this WhatsApp number already exists');
            }
        }
        // Handle tags if provided
        let tags = undefined;
        if (dto.tagIds !== undefined) {
            if (dto.tagIds.length > 0) {
                tags = await this.tagRepository.findByIds(dto.tagIds, tenantId);
                if (tags.length !== dto.tagIds.length) {
                    throw new http_exceptions_1.BadRequestException('One or more tags not found');
                }
            }
            else {
                tags = [];
            }
        }
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.whatsappNumber !== undefined)
            updateData.whatsappNumber = dto.whatsappNumber;
        if (dto.customFields !== undefined) {
            // Merge custom fields instead of replacing
            updateData.customFields = {
                ...customer.customFields,
                ...dto.customFields,
            };
        }
        const updated = await this.customerRepository.update(id, tenantId, updateData, tags);
        if (!updated) {
            throw new http_exceptions_1.NotFoundException('Customer not found');
        }
        logger_config_1.auditLogger.info('Customer updated', {
            action: 'customer.update',
            tenantId,
            customerId: id,
            changes: Object.keys(dto),
        });
        return updated;
    }
    async deleteCustomer(id, tenantId) {
        const customer = await this.getCustomer(id, tenantId);
        const deleted = await this.customerRepository.delete(id, tenantId);
        if (!deleted) {
            throw new http_exceptions_1.NotFoundException('Customer not found');
        }
        logger_config_1.auditLogger.info('Customer deleted', {
            action: 'customer.delete',
            tenantId,
            customerId: id,
            whatsappNumber: customer.whatsappNumber,
        });
    }
    async bulkDelete(ids, tenantId) {
        const affected = await this.customerRepository.bulkDelete(ids, tenantId);
        logger_config_1.auditLogger.info('Customers bulk deleted', {
            action: 'customer.bulk_delete',
            tenantId,
            requestedCount: ids.length,
            deletedCount: affected,
        });
        return affected;
    }
    async bulkUpdateTags(customerIds, tagIds, action, tenantId) {
        // Validate tags exist
        const tags = tagIds.length > 0
            ? await this.tagRepository.findByIds(tagIds, tenantId)
            : [];
        if (tagIds.length > 0 && tags.length !== tagIds.length) {
            throw new http_exceptions_1.BadRequestException('One or more tags not found');
        }
        const affected = await this.customerRepository.bulkUpdateTags(customerIds, tags, action, tenantId);
        logger_config_1.auditLogger.info('Customers bulk tags updated', {
            action: 'customer.bulk_tags',
            tenantId,
            operation: action,
            requestedCount: customerIds.length,
            affectedCount: affected,
            tagCount: tagIds.length,
        });
        return affected;
    }
    async exportCustomers(tenantId, options) {
        const customers = await this.customerRepository.findAllForExport(tenantId, options);
        // Generate CSV
        const headers = ['ID', 'Name', 'WhatsApp Number', 'Tags', 'Created At', 'Updated At'];
        const rows = customers.map((c) => [
            this.escapeCsvField(c.id),
            this.escapeCsvField(c.name),
            this.escapeCsvField(c.whatsappNumber),
            this.escapeCsvField(c.tags.map((t) => t.name).join(', ')),
            this.escapeCsvField(c.createdAt.toISOString()),
            this.escapeCsvField(c.updatedAt.toISOString()),
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        logger_config_1.auditLogger.info('Customers exported', {
            action: 'customer.export',
            tenantId,
            count: customers.length,
        });
        return csv;
    }
    /**
     * Escape CSV field to prevent CSV injection attacks
     * Prefixes dangerous characters with single quote
     */
    escapeCsvField(value) {
        if (value === null || value === undefined)
            return '';
        const stringValue = String(value);
        // Check for formula injection characters
        const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];
        const needsQuoting = dangerousChars.some((char) => stringValue.startsWith(char)) ||
            stringValue.includes(',') ||
            stringValue.includes('"') ||
            stringValue.includes('\n');
        if (needsQuoting) {
            // Escape double quotes and wrap in quotes
            const escaped = stringValue.replace(/"/g, '""');
            // Prefix with single quote if starts with dangerous char (to prevent formula execution)
            const prefix = dangerousChars.some((char) => stringValue.startsWith(char))
                ? "'"
                : '';
            return `"${prefix}${escaped}"`;
        }
        return stringValue;
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(customer_repository_1.CustomerRepository)),
    __param(1, (0, tsyringe_1.inject)(tag_repository_1.TagRepository)),
    __metadata("design:paramtypes", [customer_repository_1.CustomerRepository,
        tag_repository_1.TagRepository])
], CustomerService);
