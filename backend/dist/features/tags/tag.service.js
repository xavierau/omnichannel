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
exports.TagService = void 0;
const tsyringe_1 = require("tsyringe");
const tag_repository_1 = require("./tag.repository");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../config/logger.config");
let TagService = class TagService {
    tagRepository;
    constructor(tagRepository) {
        this.tagRepository = tagRepository;
    }
    async findAll(tenantId) {
        return this.tagRepository.findByTenantId(tenantId);
    }
    async findById(id, tenantId) {
        const tag = await this.tagRepository.findById(id, tenantId);
        if (!tag) {
            throw new http_exceptions_1.NotFoundException('Tag not found');
        }
        return tag;
    }
    async findByIds(ids, tenantId) {
        return this.tagRepository.findByIds(ids, tenantId);
    }
    async create(dto, tenantId) {
        // Check for duplicate name within tenant
        const exists = await this.tagRepository.existsByName(dto.name, tenantId);
        if (exists) {
            throw new http_exceptions_1.ConflictException('Tag with this name already exists');
        }
        const tag = await this.tagRepository.create({
            ...dto,
            tenantId,
        });
        logger_config_1.auditLogger.info('Tag created', {
            action: 'tag.create',
            tenantId,
            tagId: tag.id,
            tagName: tag.name,
        });
        return tag;
    }
    async update(id, dto, tenantId) {
        const tag = await this.findById(id, tenantId);
        // Check for duplicate name if being updated
        if (dto.name && dto.name !== tag.name) {
            const exists = await this.tagRepository.existsByName(dto.name, tenantId, id);
            if (exists) {
                throw new http_exceptions_1.ConflictException('Tag with this name already exists');
            }
        }
        const updated = await this.tagRepository.update(id, tenantId, dto);
        if (!updated) {
            throw new http_exceptions_1.NotFoundException('Tag not found');
        }
        logger_config_1.auditLogger.info('Tag updated', {
            action: 'tag.update',
            tenantId,
            tagId: id,
            changes: dto,
        });
        return updated;
    }
    async delete(id, tenantId) {
        const tag = await this.findById(id, tenantId);
        const deleted = await this.tagRepository.delete(id, tenantId);
        if (!deleted) {
            throw new http_exceptions_1.NotFoundException('Tag not found');
        }
        logger_config_1.auditLogger.info('Tag deleted', {
            action: 'tag.delete',
            tenantId,
            tagId: id,
            tagName: tag.name,
        });
    }
};
exports.TagService = TagService;
exports.TagService = TagService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(tag_repository_1.TagRepository)),
    __metadata("design:paramtypes", [tag_repository_1.TagRepository])
], TagService);
