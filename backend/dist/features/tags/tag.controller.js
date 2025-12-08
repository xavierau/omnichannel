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
exports.TagController = void 0;
const tsyringe_1 = require("tsyringe");
const tag_service_1 = require("./tag.service");
const async_handler_1 = require("@middleware/async-handler");
/**
 * Transforms a Tag entity to its API response format.
 */
function toTagResponse(tag) {
    return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
    };
}
let TagController = class TagController {
    tagService;
    constructor(tagService) {
        this.tagService = tagService;
    }
    listTags = (0, async_handler_1.asyncHandler)(async (req, res) => {
        // tenantId is guaranteed by requireTenant middleware
        const tenantId = req.tenantId;
        const tags = await this.tagService.findAll(tenantId);
        res.json({
            data: tags.map(toTagResponse),
        });
    });
    getTag = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const tag = await this.tagService.findById(id, tenantId);
        res.json({
            data: toTagResponse(tag),
        });
    });
    createTag = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const tag = await this.tagService.create(req.body, tenantId);
        res.status(201).json({
            data: toTagResponse(tag),
        });
    });
    updateTag = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const tag = await this.tagService.update(id, req.body, tenantId);
        res.json({
            data: toTagResponse(tag),
        });
    });
    deleteTag = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        await this.tagService.delete(id, tenantId);
        res.status(204).send();
    });
};
exports.TagController = TagController;
exports.TagController = TagController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(tag_service_1.TagService)),
    __metadata("design:paramtypes", [tag_service_1.TagService])
], TagController);
