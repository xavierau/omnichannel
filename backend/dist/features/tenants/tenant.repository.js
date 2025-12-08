"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const tenant_entity_1 = require("./tenant.entity");
let TenantRepository = class TenantRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(tenant_entity_1.Tenant);
        }
        return this._repository;
    }
    async findById(id) {
        return this.repository.findOne({ where: { id } });
    }
    async findBySlug(slug) {
        return this.repository.findOne({ where: { slug } });
    }
    async findAll() {
        return this.repository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }
    async create(data) {
        const tenant = this.repository.create(data);
        return this.repository.save(tenant);
    }
    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }
    async delete(id) {
        const result = await this.repository.delete(id);
        return (result.affected ?? 0) > 0;
    }
    async existsBySlug(slug, excludeId) {
        const query = this.repository
            .createQueryBuilder('tenant')
            .where('tenant.slug = :slug', { slug });
        if (excludeId) {
            query.andWhere('tenant.id != :excludeId', { excludeId });
        }
        const count = await query.getCount();
        return count > 0;
    }
};
exports.TenantRepository = TenantRepository;
exports.TenantRepository = TenantRepository = __decorate([
    (0, tsyringe_1.singleton)()
], TenantRepository);
