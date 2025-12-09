"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
let RefreshTokenRepository = class RefreshTokenRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(refresh_token_entity_1.RefreshToken);
        }
        return this._repository;
    }
    async create(data) {
        const token = this.repository.create(data);
        return this.repository.save(token);
    }
    /**
     * Find token by ID (constant-time lookup)
     * This prevents timing attacks by looking up the token directly by its ID
     */
    async findByTokenId(tokenId) {
        return this.repository.findOne({
            where: { tokenId, revoked: false },
            relations: ['user'],
        });
    }
    async findByUserId(userId) {
        return this.repository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async revokeToken(id) {
        await this.repository.update(id, { revoked: true });
    }
    async revokeAllUserTokens(userId) {
        await this.repository.update({ userId, revoked: false }, { revoked: true });
    }
    async deleteExpiredTokens() {
        await this.repository
            .createQueryBuilder()
            .delete()
            .where('expiresAt < :now', { now: new Date() })
            .execute();
    }
};
exports.RefreshTokenRepository = RefreshTokenRepository;
exports.RefreshTokenRepository = RefreshTokenRepository = __decorate([
    (0, tsyringe_1.singleton)()
], RefreshTokenRepository);
