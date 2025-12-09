"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const tag_entity_1 = require("./tag.entity");
let TagRepository = class TagRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(tag_entity_1.Tag);
        }
        return this._repository;
    }
    async findById(id, tenantId) {
        return this.repository.findOne({
            where: { id, tenantId },
        });
    }
    async findByIds(ids, tenantId) {
        if (ids.length === 0)
            return [];
        return this.repository
            .createQueryBuilder('tag')
            .where('tag.id IN (:...ids)', { ids })
            .andWhere('tag.tenant_id = :tenantId', { tenantId })
            .getMany();
    }
    async findByTenantId(tenantId) {
        return this.repository.find({
            where: { tenantId },
            order: { name: 'ASC' },
        });
    }
    async findByName(name, tenantId) {
        return this.repository.findOne({
            where: { name, tenantId },
        });
    }
    async create(data) {
        const tag = this.repository.create(data);
        return this.repository.save(tag);
    }
    async update(id, tenantId, data) {
        await this.repository.update({ id, tenantId }, data);
        return this.findById(id, tenantId);
    }
    async delete(id, tenantId) {
        const result = await this.repository.delete({ id, tenantId });
        return (result.affected ?? 0) > 0;
    }
    async existsByName(name, tenantId, excludeId) {
        const query = this.repository
            .createQueryBuilder('tag')
            .where('tag.name = :name', { name })
            .andWhere('tag.tenant_id = :tenantId', { tenantId });
        if (excludeId) {
            query.andWhere('tag.id != :excludeId', { excludeId });
        }
        const count = await query.getCount();
        return count > 0;
    }
};
exports.TagRepository = TagRepository;
exports.TagRepository = TagRepository = __decorate([
    (0, tsyringe_1.singleton)()
], TagRepository);
