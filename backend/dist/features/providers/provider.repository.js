"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const provider_entity_1 = require("./provider.entity");
let ProviderRepository = class ProviderRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(provider_entity_1.Provider);
        }
        return this._repository;
    }
    async findAll() {
        return this.repository.find({
            relations: ['channel'],
            order: { name: 'ASC' },
        });
    }
    async findActive() {
        return this.repository.find({
            where: { isActive: true },
            relations: ['channel'],
            order: { name: 'ASC' },
        });
    }
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['channel'],
        });
    }
    async findByCode(code) {
        return this.repository.findOne({
            where: { code },
            relations: ['channel'],
        });
    }
    async findByCodeOrFail(code) {
        const provider = await this.findByCode(code);
        if (!provider) {
            throw new Error(`Provider with code '${code}' not found`);
        }
        return provider;
    }
    async findByChannelId(channelId) {
        return this.repository.find({
            where: { channelId, isActive: true },
            relations: ['channel'],
            order: { name: 'ASC' },
        });
    }
    async findByChannel(channelId, options) {
        const where = { channelId };
        if (options?.isActive !== undefined) {
            where.isActive = options.isActive;
        }
        return this.repository.find({
            where,
            relations: ['channel'],
            order: { name: 'ASC' },
        });
    }
    async findByChannelCode(channelCode) {
        return this.repository
            .createQueryBuilder('provider')
            .innerJoin('provider.channel', 'channel')
            .where('channel.code = :channelCode', { channelCode })
            .andWhere('provider.is_active = :isActive', { isActive: true })
            .orderBy('provider.name', 'ASC')
            .getMany();
    }
};
exports.ProviderRepository = ProviderRepository;
exports.ProviderRepository = ProviderRepository = __decorate([
    (0, tsyringe_1.singleton)()
], ProviderRepository);
