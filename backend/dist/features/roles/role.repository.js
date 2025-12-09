"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleRepository = void 0;
const tsyringe_1 = require("tsyringe");
const typeorm_1 = require("typeorm");
const database_config_1 = require("../../config/database.config");
const role_entity_1 = require("./role.entity");
const permission_entity_1 = require("../permissions/permission.entity");
let RoleRepository = class RoleRepository {
    _repo = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repo() {
        if (!this._repo) {
            this._repo = database_config_1.AppDataSource.getRepository(role_entity_1.Role);
        }
        return this._repo;
    }
    async findAll(options) {
        return this.repo.find({
            relations: options?.includePermissions ? ['permissions'] : [],
            order: { level: 'ASC', name: 'ASC' },
        });
    }
    async findById(id) {
        return this.repo.findOne({
            where: { id },
            relations: ['permissions'],
        });
    }
    async findByName(name) {
        return this.repo.findOne({
            where: { name },
            relations: ['permissions'],
        });
    }
    async findByLevel(level) {
        return this.repo.find({
            where: { level },
            relations: ['permissions'],
        });
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        return this.repo.findByIds(ids);
    }
    async create(data) {
        const role = this.repo.create({
            name: data.name,
            displayName: data.displayName,
            description: data.description || null,
            level: data.level,
            isSystem: data.isSystem || false,
            permissions: [],
        });
        return this.repo.save(role);
    }
    async update(id, data) {
        await this.repo.update(id, data);
        const role = await this.findById(id);
        if (!role) {
            throw new Error('Role not found after update');
        }
        return role;
    }
    async delete(id) {
        await this.repo.delete(id);
    }
    async addPermissions(roleId, permissionIds) {
        const role = await this.repo.findOne({
            where: { id: roleId },
            relations: ['permissions'],
        });
        if (!role) {
            throw new Error('Role not found');
        }
        // Get permission repository
        const permissionRepo = database_config_1.AppDataSource.getRepository(permission_entity_1.Permission);
        const permissions = await permissionRepo.find({ where: { id: (0, typeorm_1.In)(permissionIds) } });
        // Add new permissions (avoid duplicates)
        const existingIds = new Set(role.permissions.map((p) => p.id));
        for (const permission of permissions) {
            if (!existingIds.has(permission.id)) {
                role.permissions.push(permission);
            }
        }
        return this.repo.save(role);
    }
    async removePermissions(roleId, permissionIds) {
        const role = await this.repo.findOne({
            where: { id: roleId },
            relations: ['permissions'],
        });
        if (!role) {
            throw new Error('Role not found');
        }
        const idsToRemove = new Set(permissionIds);
        role.permissions = role.permissions.filter((p) => !idsToRemove.has(p.id));
        return this.repo.save(role);
    }
    async syncPermissions(roleId, permissionIds) {
        const role = await this.repo.findOne({
            where: { id: roleId },
            relations: ['permissions'],
        });
        if (!role) {
            throw new Error('Role not found');
        }
        if (permissionIds.length === 0) {
            role.permissions = [];
        }
        else {
            const permissionRepo = database_config_1.AppDataSource.getRepository(permission_entity_1.Permission);
            const permissions = await permissionRepo.find({ where: { id: (0, typeorm_1.In)(permissionIds) } });
            role.permissions = permissions;
        }
        return this.repo.save(role);
    }
    async countUsersWithRole(roleId) {
        const result = await this.repo
            .createQueryBuilder('role')
            .leftJoin('role.users', 'user')
            .where('role.id = :roleId', { roleId })
            .select('COUNT(DISTINCT user.id)', 'count')
            .getRawOne();
        return parseInt(result?.count || '0', 10);
    }
};
exports.RoleRepository = RoleRepository;
exports.RoleRepository = RoleRepository = __decorate([
    (0, tsyringe_1.singleton)()
], RoleRepository);
