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
exports.RoleController = void 0;
const tsyringe_1 = require("tsyringe");
const role_service_1 = require("./role.service");
const async_handler_1 = require("../../middleware/async-handler");
const role_dto_1 = require("./dto/role.dto");
let RoleController = class RoleController {
    roleService;
    constructor(roleService) {
        this.roleService = roleService;
    }
    /**
     * GET /api/roles
     * List all roles
     */
    list = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const includePermissions = req.query.includePermissions === 'true';
        const roles = await this.roleService.findAll({ includePermissions });
        res.json({
            data: roles.map((role) => role_dto_1.RoleResponseDto.fromEntity(role, includePermissions)),
        });
    });
    /**
     * GET /api/roles/:id
     * Get role by ID
     */
    getById = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const role = await this.roleService.findById(id);
        const userCount = await this.roleService.getUserCount(id);
        res.json({
            data: role_dto_1.RoleResponseDto.fromEntity(role, true, userCount),
        });
    });
    /**
     * POST /api/roles
     * Create a new role
     */
    create = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const role = await this.roleService.create(req.body, user?.id);
        res.status(201).json({
            data: role_dto_1.RoleResponseDto.fromEntity(role),
        });
    });
    /**
     * PATCH /api/roles/:id
     * Update a role
     */
    update = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const user = req.user;
        const role = await this.roleService.update(id, req.body, user?.id);
        res.json({
            data: role_dto_1.RoleResponseDto.fromEntity(role),
        });
    });
    /**
     * DELETE /api/roles/:id
     * Delete a role
     */
    delete = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const user = req.user;
        await this.roleService.delete(id, user?.id);
        res.status(204).send();
    });
    /**
     * POST /api/roles/:id/permissions
     * Add permissions to a role
     */
    addPermissions = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { permissionIds } = req.body;
        const user = req.user;
        const role = await this.roleService.addPermissions(id, permissionIds, user?.id);
        res.json({
            data: role_dto_1.RoleResponseDto.fromEntity(role),
        });
    });
    /**
     * DELETE /api/roles/:id/permissions
     * Remove permissions from a role
     */
    removePermissions = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { permissionIds } = req.body;
        const user = req.user;
        const role = await this.roleService.removePermissions(id, permissionIds, user?.id);
        res.json({
            data: role_dto_1.RoleResponseDto.fromEntity(role),
        });
    });
    /**
     * PUT /api/roles/:id/permissions
     * Sync (replace) all permissions for a role
     */
    syncPermissions = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { permissionIds } = req.body;
        const user = req.user;
        const role = await this.roleService.syncPermissions(id, permissionIds, user?.id);
        res.json({
            data: role_dto_1.RoleResponseDto.fromEntity(role),
        });
    });
};
exports.RoleController = RoleController;
exports.RoleController = RoleController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(role_service_1.RoleService)),
    __metadata("design:paramtypes", [role_service_1.RoleService])
], RoleController);
