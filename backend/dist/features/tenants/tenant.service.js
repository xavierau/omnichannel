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
exports.TenantService = void 0;
const tsyringe_1 = require("tsyringe");
const tenant_repository_1 = require("./tenant.repository");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../config/logger.config");
let TenantService = class TenantService {
    tenantRepository;
    constructor(tenantRepository) {
        this.tenantRepository = tenantRepository;
    }
    async findAll() {
        return this.tenantRepository.findAll();
    }
    async findById(id) {
        const tenant = await this.tenantRepository.findById(id);
        if (!tenant) {
            throw new http_exceptions_1.NotFoundException('Tenant not found');
        }
        return tenant;
    }
    async findBySlug(slug) {
        const tenant = await this.tenantRepository.findBySlug(slug);
        if (!tenant) {
            throw new http_exceptions_1.NotFoundException('Tenant not found');
        }
        return tenant;
    }
    async create(dto) {
        // Check for duplicate slug
        const exists = await this.tenantRepository.existsBySlug(dto.slug);
        if (exists) {
            throw new http_exceptions_1.ConflictException('Tenant with this slug already exists');
        }
        const tenant = await this.tenantRepository.create(dto);
        logger_config_1.auditLogger.info('Tenant created', {
            action: 'tenant.create',
            tenantId: tenant.id,
            slug: tenant.slug,
        });
        return tenant;
    }
    async update(id, dto) {
        const tenant = await this.findById(id);
        // Check for duplicate slug if being updated
        if (dto.slug && dto.slug !== tenant.slug) {
            const exists = await this.tenantRepository.existsBySlug(dto.slug, id);
            if (exists) {
                throw new http_exceptions_1.ConflictException('Tenant with this slug already exists');
            }
        }
        const updated = await this.tenantRepository.update(id, dto);
        if (!updated) {
            throw new http_exceptions_1.NotFoundException('Tenant not found');
        }
        logger_config_1.auditLogger.info('Tenant updated', {
            action: 'tenant.update',
            tenantId: id,
            changes: dto,
        });
        return updated;
    }
    async delete(id) {
        const tenant = await this.findById(id);
        const deleted = await this.tenantRepository.delete(id);
        if (!deleted) {
            throw new http_exceptions_1.NotFoundException('Tenant not found');
        }
        logger_config_1.auditLogger.info('Tenant deleted', {
            action: 'tenant.delete',
            tenantId: id,
            slug: tenant.slug,
        });
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(tenant_repository_1.TenantRepository)),
    __metadata("design:paramtypes", [tenant_repository_1.TenantRepository])
], TenantService);
