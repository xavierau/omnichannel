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
exports.GroupController = void 0;
const tsyringe_1 = require("tsyringe");
const group_service_1 = require("./group.service");
const async_handler_1 = require("@middleware/async-handler");
const group_presenter_1 = require("./group.presenter");
/**
 * Controller for customer group management endpoints.
 * Handles HTTP requests and delegates to GroupService.
 */
let GroupController = class GroupController {
    groupService;
    constructor(groupService) {
        this.groupService = groupService;
    }
    /**
     * GET /groups
     * Lists all groups with pagination, search, and filtering.
     */
    listGroups = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const options = {
            search: req.query.search,
            isStatic: req.query.isStatic !== undefined
                ? req.query.isStatic === 'true'
                : undefined,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
        const result = await this.groupService.listGroups(tenantId, options);
        res.json((0, group_presenter_1.toPaginatedGroupResponse)(result.data, result.total, result.page, result.limit, result.totalPages));
    });
    /**
     * GET /groups/:id
     * Gets a single group by ID with member count.
     */
    getGroup = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const group = await this.groupService.getGroup(tenantId, id);
        res.json({
            data: (0, group_presenter_1.toGroupResponse)(group, group.memberCount),
        });
    });
    /**
     * GET /groups/:id/members
     * Gets paginated members of a group.
     */
    getGroupMembers = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await this.groupService.getGroupMembers(tenantId, id, page, limit);
        res.json((0, group_presenter_1.toPaginatedMemberResponse)(result.data, result.total, result.page, result.limit, result.totalPages));
    });
    /**
     * POST /groups
     * Creates a new customer group.
     */
    createGroup = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const group = await this.groupService.createGroup(req.body, tenantId);
        // Get member count for response
        const memberCount = group.isStatic
            ? group.memberIds?.length ?? 0
            : 0; // Dynamic groups show 0 initially, will be calculated on demand
        res.status(201).json({
            data: (0, group_presenter_1.toGroupResponse)(group, memberCount),
        });
    });
    /**
     * PATCH /groups/:id
     * Updates an existing customer group.
     */
    updateGroup = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        await this.groupService.updateGroup(id, req.body, tenantId);
        // Get updated member count
        const groupWithCount = await this.groupService.getGroup(tenantId, id);
        res.json({
            data: (0, group_presenter_1.toGroupResponse)(groupWithCount, groupWithCount.memberCount),
        });
    });
    /**
     * DELETE /groups/:id
     * Deletes a customer group.
     */
    deleteGroup = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        await this.groupService.deleteGroup(id, tenantId);
        res.status(204).send();
    });
};
exports.GroupController = GroupController;
exports.GroupController = GroupController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(group_service_1.GroupService)),
    __metadata("design:paramtypes", [group_service_1.GroupService])
], GroupController);
