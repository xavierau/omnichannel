"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const user_entity_1 = require("./user.entity");
let UserRepository = class UserRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     * This prevents errors when the DI container instantiates this class before
     * the database connection is established.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(user_entity_1.User);
        }
        return this._repository;
    }
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['roles', 'roles.permissions'],
        });
    }
    async findByEmail(email) {
        return this.repository.findOne({
            where: { email },
            relations: ['roles', 'roles.permissions'],
        });
    }
    async create(userData) {
        const user = this.repository.create(userData);
        return this.repository.save(user);
    }
    async update(id, userData) {
        await this.repository.update(id, userData);
        const updatedUser = await this.findById(id);
        if (!updatedUser) {
            throw new Error('User not found after update');
        }
        return updatedUser;
    }
    async delete(id) {
        await this.repository.delete(id);
    }
    async findAll(options) {
        const query = this.repository.createQueryBuilder('user')
            .leftJoinAndSelect('user.roles', 'roles')
            .leftJoinAndSelect('roles.permissions', 'permissions');
        if (options?.status) {
            query.where('user.status = :status', { status: options.status });
        }
        if (options?.skip) {
            query.skip(options.skip);
        }
        if (options?.take) {
            query.take(options.take);
        }
        return query.getManyAndCount();
    }
    async updateLastLogin(id) {
        await this.repository.update(id, {
            lastLoginAt: new Date(),
        });
    }
    async save(user) {
        return this.repository.save(user);
    }
    /**
     * Find users by tenant ID who can be assigned inbox conversations.
     * Includes users who belong to active teams within the tenant.
     *
     * @param tenantId - The tenant ID for isolation
     * @returns Array of users with inbox access
     */
    async findOperatorsByTenant(tenantId) {
        return this.repository
            .createQueryBuilder('user')
            .innerJoin('team_members', 'tm', 'tm.user_id = user.id')
            .innerJoin('teams', 't', 't.id = tm.team_id')
            .where('user.tenant_id = :tenantId', { tenantId })
            .andWhere('user.status = :status', { status: 'active' })
            .andWhere('t.is_active = :isActive', { isActive: true })
            .select([
            'user.id',
            'user.firstName',
            'user.lastName',
            'user.email',
        ])
            .distinct(true)
            .orderBy('user.firstName', 'ASC')
            .addOrderBy('user.lastName', 'ASC')
            .getMany();
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, tsyringe_1.singleton)()
], UserRepository);
