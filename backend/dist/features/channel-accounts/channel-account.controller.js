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
exports.ChannelAccountController = void 0;
const tsyringe_1 = require("tsyringe");
const channel_account_service_1 = require("./channel-account.service");
const logger_config_1 = require("../../config/logger.config");
/**
 * Controller for channel account management.
 *
 * Handles HTTP requests for CRUD operations on channel accounts.
 */
let ChannelAccountController = class ChannelAccountController {
    channelAccountService;
    constructor(channelAccountService) {
        this.channelAccountService = channelAccountService;
    }
    /**
     * GET /api/channel-accounts
     * List all channel accounts for the tenant.
     */
    async list(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const channelCode = req.query.channelCode;
            const accounts = await this.channelAccountService.getByTenant(tenantId, channelCode);
            res.json({ data: accounts });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/channel-accounts/:id
     * Get a specific channel account.
     */
    async get(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const account = await this.channelAccountService.getById(id, tenantId);
            if (!account) {
                res.status(404).json({ error: 'Channel account not found' });
                return;
            }
            res.json({ data: account });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/channel-accounts
     * Create a new channel account.
     */
    async create(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const dto = req.body;
            // Validate required fields
            if (!dto.name || !dto.channelCode || !dto.credentials) {
                res.status(400).json({
                    error: 'Missing required fields: name, channelCode, credentials',
                });
                return;
            }
            const account = await this.channelAccountService.create(tenantId, dto);
            logger_config_1.logger.info('Channel account created via API', {
                channelAccountId: account.id,
                tenantId,
                channelCode: dto.channelCode,
            });
            res.status(201).json({ data: account });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(400).json({ error: error.message });
                return;
            }
            if (error instanceof Error && error.message.includes('Missing required')) {
                res.status(400).json({ error: error.message });
                return;
            }
            next(error);
        }
    }
    /**
     * PUT /api/channel-accounts/:id
     * Update a channel account.
     */
    async update(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const dto = req.body;
            const account = await this.channelAccountService.update(id, tenantId, dto);
            if (!account) {
                res.status(404).json({ error: 'Channel account not found' });
                return;
            }
            logger_config_1.logger.info('Channel account updated via API', {
                channelAccountId: id,
                tenantId,
            });
            res.json({ data: account });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Missing required')) {
                res.status(400).json({ error: error.message });
                return;
            }
            next(error);
        }
    }
    /**
     * DELETE /api/channel-accounts/:id
     * Delete a channel account.
     */
    async delete(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const deleted = await this.channelAccountService.delete(id, tenantId);
            if (!deleted) {
                res.status(404).json({ error: 'Channel account not found' });
                return;
            }
            logger_config_1.logger.info('Channel account deleted via API', {
                channelAccountId: id,
                tenantId,
            });
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/channel-accounts/:id/test
     * Test connection to the provider.
     */
    async testConnection(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const result = await this.channelAccountService.testConnection(id, tenantId);
            if (result.success) {
                res.json({
                    data: {
                        success: true,
                        message: 'Connection successful',
                        accountInfo: result.accountInfo,
                    },
                });
            }
            else {
                res.status(400).json({
                    data: {
                        success: false,
                        message: 'Connection failed',
                        error: result.error,
                    },
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /api/channel-accounts/:id/primary
     * Set channel account as primary for its channel type.
     */
    async setPrimary(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const success = await this.channelAccountService.setPrimary(id, tenantId);
            if (!success) {
                res.status(404).json({ error: 'Channel account not found' });
                return;
            }
            res.json({ data: { success: true, message: 'Channel account set as primary' } });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/channel-accounts/:id/sync-templates
     * Sync templates from the provider.
     */
    async syncTemplates(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const result = await this.channelAccountService.syncTemplates(id, tenantId);
            if (result.success) {
                res.json({
                    data: {
                        success: true,
                        templates: result.templates,
                        count: result.templates?.length || 0,
                    },
                });
            }
            else {
                res.status(400).json({
                    data: {
                        success: false,
                        error: result.error,
                    },
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/channel-accounts/:id/webhook-config
     * Get webhook configuration for Meta setup.
     *
     * Returns the webhook URL and verify token needed to configure
     * webhooks in Meta's developer portal.
     */
    async getWebhookConfig(req, res, next) {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            if (!tenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const config = await this.channelAccountService.generateWebhookConfig(id, tenantId);
            res.json({
                data: {
                    webhookUrl: config.webhookUrl,
                    verifyToken: config.verifyToken,
                    instructions: {
                        step1: 'Go to Meta Developer Portal > Your App > WhatsApp > Configuration',
                        step2: 'In the Webhook section, click "Edit"',
                        step3: 'Enter the Callback URL (webhookUrl) and Verify token (verifyToken)',
                        step4: 'Click "Verify and save"',
                        step5: 'Subscribe to the "messages" webhook field',
                    },
                },
            });
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Channel account not found') {
                res.status(404).json({ error: error.message });
                return;
            }
            next(error);
        }
    }
};
exports.ChannelAccountController = ChannelAccountController;
exports.ChannelAccountController = ChannelAccountController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(channel_account_service_1.ChannelAccountService)),
    __metadata("design:paramtypes", [channel_account_service_1.ChannelAccountService])
], ChannelAccountController);
