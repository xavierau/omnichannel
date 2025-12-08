"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("@config/database.config");
const invitation_entity_1 = require("./invitation.entity");
let InvitationRepository = class InvitationRepository {
    _repository = null;
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(invitation_entity_1.Invitation);
        }
        return this._repository;
    }
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['tenant', 'inviter'],
        });
    }
    async findByTokenHash(tokenHash) {
        return this.repository.findOne({
            where: { tokenHash },
            relations: ['tenant', 'inviter'],
        });
    }
    async findByEmail(email) {
        return this.repository.find({
            where: { email },
            relations: ['tenant', 'inviter'],
            order: { createdAt: 'DESC' },
        });
    }
    async findByTenantAndEmail(tenantId, email) {
        return this.repository.findOne({
            where: { tenantId, email },
            relations: ['tenant', 'inviter'],
        });
    }
    /**
     * Find all invitations for a tenant with optional filtering and pagination.
     *
     * Eager loads both 'inviter' and 'tenant' relations to prevent N+1 queries
     * when formatting responses that include inviter and tenant names.
     *
     * @param tenantId - The tenant ID to filter by
     * @param options - Optional status filter and pagination options
     * @returns Tuple of [invitations, total count]
     */
    async findByTenant(tenantId, options) {
        const query = this.repository
            .createQueryBuilder('invitation')
            .leftJoinAndSelect('invitation.inviter', 'inviter')
            .leftJoinAndSelect('invitation.tenant', 'tenant')
            .where('invitation.tenant_id = :tenantId', { tenantId });
        if (options?.status) {
            query.andWhere('invitation.status = :status', { status: options.status });
        }
        if (options?.skip !== undefined) {
            query.skip(options.skip);
        }
        if (options?.take !== undefined) {
            query.take(options.take);
        }
        query.orderBy('invitation.created_at', 'DESC');
        return query.getManyAndCount();
    }
    async findPendingByTenant(tenantId) {
        return this.repository.find({
            where: {
                tenantId,
                status: invitation_entity_1.InvitationStatus.PENDING,
            },
            relations: ['inviter'],
            order: { createdAt: 'DESC' },
        });
    }
    async create(data) {
        const invitation = this.repository.create(data);
        return this.repository.save(invitation);
    }
    async update(id, data) {
        await this.repository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Invitation not found after update');
        }
        return updated;
    }
    async delete(id) {
        await this.repository.delete(id);
    }
    async save(invitation) {
        return this.repository.save(invitation);
    }
    async markAsAccepted(id) {
        return this.update(id, {
            status: invitation_entity_1.InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
        });
    }
    async markAsDeclined(id) {
        return this.update(id, {
            status: invitation_entity_1.InvitationStatus.DECLINED,
        });
    }
    async markAsExpired(id) {
        return this.update(id, {
            status: invitation_entity_1.InvitationStatus.EXPIRED,
        });
    }
    async expireOldInvitations() {
        const result = await this.repository
            .createQueryBuilder()
            .update(invitation_entity_1.Invitation)
            .set({ status: invitation_entity_1.InvitationStatus.EXPIRED })
            .where('status = :status', { status: invitation_entity_1.InvitationStatus.PENDING })
            .andWhere('expires_at < :now', { now: new Date() })
            .execute();
        return result.affected || 0;
    }
};
exports.InvitationRepository = InvitationRepository;
exports.InvitationRepository = InvitationRepository = __decorate([
    (0, tsyringe_1.singleton)()
], InvitationRepository);
