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
exports.UserController = void 0;
const tsyringe_1 = require("tsyringe");
const user_service_1 = require("./user.service");
const async_handler_1 = require("@middleware/async-handler");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    getMe = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const permissions = await this.userService.getUserPermissions(user.id);
        res.json({
            data: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                emailVerified: user.emailVerified,
                roles: user.roles.map((r) => ({
                    id: r.id,
                    name: r.name,
                    displayName: r.displayName,
                })),
                permissions,
            },
        });
    });
    listUsers = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const result = await this.userService.listUsers({
            page,
            limit,
            status: status,
        });
        res.json({
            data: result.users.map((u) => ({
                id: u.id,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                status: u.status,
                emailVerified: u.emailVerified,
                roles: u.roles.map((r) => r.name),
                createdAt: u.createdAt,
            })),
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        });
    });
    getUser = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const user = await this.userService.findById(id);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: 'User not found',
            });
        }
        const permissions = await this.userService.getUserPermissions(user.id);
        res.json({
            data: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                emailVerified: user.emailVerified,
                roles: user.roles.map((r) => ({
                    id: r.id,
                    name: r.name,
                    displayName: r.displayName,
                })),
                permissions,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    });
    updateUser = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { firstName, lastName, status } = req.body;
        const user = await this.userService.updateUser(id, {
            firstName,
            lastName,
            status,
        });
        res.json({
            data: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                emailVerified: user.emailVerified,
            },
        });
    });
    deleteUser = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        await this.userService.deleteUser(id);
        res.status(204).send();
    });
    /**
     * GET /api/users/:id/roles
     * Get roles assigned to a user
     */
    getUserRoles = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const user = await this.userService.findById(id);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: 'User not found',
            });
        }
        res.json({
            data: user.roles.map((r) => ({
                id: r.id,
                name: r.name,
                displayName: r.displayName,
                level: r.level,
            })),
        });
    });
    /**
     * POST /api/users/:id/roles
     * Add roles to a user
     */
    addUserRoles = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { roleIds } = req.body;
        const currentUser = req.user;
        const user = await this.userService.addRoles(id, roleIds, currentUser?.id);
        res.json({
            data: {
                id: user.id,
                email: user.email,
                roles: user.roles.map((r) => ({
                    id: r.id,
                    name: r.name,
                    displayName: r.displayName,
                })),
            },
        });
    });
    /**
     * DELETE /api/users/:id/roles
     * Remove roles from a user
     */
    removeUserRoles = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { roleIds } = req.body;
        const currentUser = req.user;
        const user = await this.userService.removeRoles(id, roleIds, currentUser?.id);
        res.json({
            data: {
                id: user.id,
                email: user.email,
                roles: user.roles.map((r) => ({
                    id: r.id,
                    name: r.name,
                    displayName: r.displayName,
                })),
            },
        });
    });
    /**
     * PUT /api/users/:id/roles
     * Sync (replace) all roles for a user
     */
    syncUserRoles = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { roleIds } = req.body;
        const currentUser = req.user;
        const user = await this.userService.syncRoles(id, roleIds, currentUser?.id);
        res.json({
            data: {
                id: user.id,
                email: user.email,
                roles: user.roles.map((r) => ({
                    id: r.id,
                    name: r.name,
                    displayName: r.displayName,
                })),
            },
        });
    });
};
exports.UserController = UserController;
exports.UserController = UserController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(user_service_1.UserService)),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
