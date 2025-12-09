"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionRepository = void 0;
const tsyringe_1 = require("tsyringe");
const typeorm_1 = require("typeorm");
const database_config_1 = require("../../config/database.config");
const permission_entity_1 = require("./permission.entity");
let PermissionRepository = class PermissionRepository {
    _repo = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repo() {
        if (!this._repo) {
            this._repo = database_config_1.AppDataSource.getRepository(permission_entity_1.Permission);
        }
        return this._repo;
    }
    async findAll(options) {
        const where = {};
        if (options?.resource) {
            where.resource = options.resource;
        }
        if (options?.action) {
            where.action = options.action;
        }
        return this.repo.find({
            where: Object.keys(where).length > 0 ? where : undefined,
            order: { resource: 'ASC', action: 'ASC', scope: 'ASC' },
        });
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        return this.repo.find({ where: { id: (0, typeorm_1.In)(ids) } });
    }
    async findByResourceAction(resource, action, scope) {
        const where = { resource, action };
        if (scope) {
            where.scope = scope;
        }
        return this.repo.findOne({ where });
    }
    async findByResourceActionScope(resource, action, scope) {
        return this.repo.findOne({
            where: { resource, action, scope },
        });
    }
    async create(data) {
        const permission = this.repo.create({
            resource: data.resource,
            action: data.action,
            scope: data.scope,
            description: data.description || null,
        });
        return this.repo.save(permission);
    }
    async bulkCreate(data) {
        const permissions = data.map((d) => this.repo.create({
            resource: d.resource,
            action: d.action,
            scope: d.scope,
            description: d.description || null,
        }));
        return this.repo.save(permissions);
    }
    async delete(id) {
        await this.repo.delete(id);
    }
    async getAllGroupedByResource() {
        const permissions = await this.findAll();
        const grouped = new Map();
        for (const permission of permissions) {
            const existing = grouped.get(permission.resource) || [];
            existing.push(permission);
            grouped.set(permission.resource, existing);
        }
        return grouped;
    }
    async count() {
        return this.repo.count();
    }
};
exports.PermissionRepository = PermissionRepository;
exports.PermissionRepository = PermissionRepository = __decorate([
    (0, tsyringe_1.singleton)()
], PermissionRepository);
