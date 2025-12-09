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
exports.PermissionController = void 0;
const tsyringe_1 = require("tsyringe");
const permission_service_1 = require("./permission.service");
const async_handler_1 = require("../../middleware/async-handler");
const permission_dto_1 = require("./dto/permission.dto");
let PermissionController = class PermissionController {
    permissionService;
    constructor(permissionService) {
        this.permissionService = permissionService;
    }
    /**
     * GET /api/permissions
     * List all permissions with optional filtering
     */
    list = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const resource = req.query.resource;
        const action = req.query.action;
        const permissions = await this.permissionService.findAll({ resource, action });
        res.json({
            data: permissions.map((p) => permission_dto_1.PermissionResponseDto.fromEntity(p)),
        });
    });
    /**
     * GET /api/permissions/grouped
     * Get all permissions grouped by resource
     */
    getGrouped = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const grouped = await this.permissionService.getAllGroupedByResource();
        res.json({
            data: permission_dto_1.GroupedPermissionsResponseDto.fromGroupedMap(grouped),
        });
    });
    /**
     * GET /api/permissions/meta
     * Get permission metadata (available resources, actions, scopes)
     */
    getMeta = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const count = await this.permissionService.count();
        res.json({
            data: {
                resources: this.permissionService.getAvailableResources(),
                actions: this.permissionService.getAvailableActions(),
                scopes: this.permissionService.getAvailableScopes(),
                totalCount: count,
            },
        });
    });
    /**
     * GET /api/permissions/:id
     * Get permission by ID
     */
    getById = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const permission = await this.permissionService.findById(id);
        res.json({
            data: permission_dto_1.PermissionResponseDto.fromEntity(permission),
        });
    });
};
exports.PermissionController = PermissionController;
exports.PermissionController = PermissionController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(permission_service_1.PermissionCrudService)),
    __metadata("design:paramtypes", [permission_service_1.PermissionCrudService])
], PermissionController);
