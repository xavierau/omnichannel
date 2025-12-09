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
exports.TeamController = void 0;
const tsyringe_1 = require("tsyringe");
const team_service_1 = require("./services/team.service");
const async_handler_1 = require("../../middleware/async-handler");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const enums_1 = require("./enums");
/**
 * Controller for team management operations.
 *
 * Handles HTTP request/response mapping for:
 * - Team CRUD operations
 * - Team member management
 * - Team channel account access control
 */
let TeamController = class TeamController {
    teamService;
    constructor(teamService) {
        this.teamService = teamService;
    }
    // ============================================================================
    // Team CRUD Operations
    // ============================================================================
    /**
     * GET /teams
     * List all teams for the current tenant.
     */
    listTeams = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const teams = await this.teamService.getTeams(tenantId);
        res.json({
            data: teams,
        });
    });
    /**
     * POST /teams
     * Create a new team.
     */
    createTeam = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { name, description } = req.body;
        const team = await this.teamService.createTeam(tenantId, name, description);
        res.status(201).json({
            data: team,
        });
    });
    /**
     * GET /teams/:id
     * Get a specific team by ID.
     */
    getTeam = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const team = await this.teamService.getTeam(tenantId, id);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        res.json({
            data: team,
        });
    });
    /**
     * PATCH /teams/:id
     * Update an existing team.
     */
    updateTeam = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const team = await this.teamService.updateTeam(tenantId, id, req.body);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        res.json({
            data: team,
        });
    });
    /**
     * DELETE /teams/:id
     * Delete a team.
     */
    deleteTeam = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const deleted = await this.teamService.deleteTeam(tenantId, id);
        if (!deleted) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        res.status(204).send();
    });
    // ============================================================================
    // Team Member Management
    // ============================================================================
    /**
     * GET /teams/:id/members
     * List all members of a team.
     */
    listMembers = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        // Verify team exists and belongs to tenant
        const team = await this.teamService.getTeam(tenantId, id);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        const members = await this.teamService.getTeamMembers(id);
        res.json({
            data: members,
        });
    });
    /**
     * POST /teams/:id/members
     * Add a member to a team.
     */
    addMember = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { userId, role } = req.body;
        // Verify team exists and belongs to tenant
        const team = await this.teamService.getTeam(tenantId, id);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        const member = await this.teamService.addMember(id, userId, role ?? enums_1.TeamMemberRole.MEMBER);
        res.status(201).json({
            data: member,
        });
    });
    /**
     * DELETE /teams/:id/members/:userId
     * Remove a member from a team.
     */
    removeMember = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id, userId } = req.params;
        // Verify team exists and belongs to tenant
        const team = await this.teamService.getTeam(tenantId, id);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        const removed = await this.teamService.removeMember(id, userId);
        if (!removed) {
            throw new http_exceptions_1.NotFoundException('Member not found in team');
        }
        res.status(204).send();
    });
    /**
     * PATCH /teams/:id/members/:userId/role
     * Update a team member's role.
     */
    updateMemberRole = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id, userId } = req.params;
        const { role } = req.body;
        // Verify team exists and belongs to tenant
        const team = await this.teamService.getTeam(tenantId, id);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        const member = await this.teamService.updateMemberRole(id, userId, role);
        if (!member) {
            throw new http_exceptions_1.NotFoundException('Member not found in team');
        }
        res.json({
            data: member,
        });
    });
    // ============================================================================
    // Team Channel Account Management
    // ============================================================================
    /**
     * GET /teams/:id/channel-accounts
     * List all channel accounts associated with a team.
     */
    listChannelAccounts = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        // Verify team exists and belongs to tenant
        const team = await this.teamService.getTeam(tenantId, id);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        const channelAccounts = await this.teamService.getTeamChannelAccounts(id);
        res.json({
            data: channelAccounts,
        });
    });
    /**
     * POST /teams/:id/channel-accounts
     * Add a channel account to a team.
     */
    addChannelAccount = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { channelAccountId } = req.body;
        // Verify team exists and belongs to tenant
        const team = await this.teamService.getTeam(tenantId, id);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        const association = await this.teamService.addChannelAccount(id, channelAccountId);
        res.status(201).json({
            data: association,
        });
    });
    /**
     * DELETE /teams/:id/channel-accounts/:channelAccountId
     * Remove a channel account from a team.
     */
    removeChannelAccount = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { id, channelAccountId } = req.params;
        // Verify team exists and belongs to tenant
        const team = await this.teamService.getTeam(tenantId, id);
        if (!team) {
            throw new http_exceptions_1.NotFoundException('Team not found');
        }
        const removed = await this.teamService.removeChannelAccount(id, channelAccountId);
        if (!removed) {
            throw new http_exceptions_1.NotFoundException('Channel account not associated with team');
        }
        res.status(204).send();
    });
};
exports.TeamController = TeamController;
exports.TeamController = TeamController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(team_service_1.TeamService)),
    __metadata("design:paramtypes", [team_service_1.TeamService])
], TeamController);
