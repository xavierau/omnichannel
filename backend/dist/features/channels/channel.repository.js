"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const channel_entity_1 = require("./channel.entity");
let ChannelRepository = class ChannelRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(channel_entity_1.Channel);
        }
        return this._repository;
    }
    async findAll() {
        return this.repository.find({
            order: { name: 'ASC' },
        });
    }
    async findActive() {
        return this.repository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }
    async findById(id) {
        return this.repository.findOne({ where: { id } });
    }
    async findByCode(code) {
        return this.repository.findOne({ where: { code } });
    }
    async findByCodeOrFail(code) {
        const channel = await this.findByCode(code);
        if (!channel) {
            throw new Error(`Channel with code '${code}' not found`);
        }
        return channel;
    }
};
exports.ChannelRepository = ChannelRepository;
exports.ChannelRepository = ChannelRepository = __decorate([
    (0, tsyringe_1.singleton)()
], ChannelRepository);
