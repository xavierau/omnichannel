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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWebhookSettingsDto = void 0;
const class_validator_1 = require("class-validator");
/**
 * DTO for updating webhook settings.
 *
 * Validates the request body for PATCH /api/channel-accounts/:id/webhook-settings
 */
class UpdateWebhookSettingsDto {
    /**
     * The webhook URL to receive event notifications.
     * Must be HTTPS in production.
     * Set to null or empty string to disable webhooks.
     */
    webhookUrl;
    /**
     * Whether webhook events are enabled.
     * If set to false, this will clear the webhookUrl.
     */
    webhookEventsEnabled;
}
exports.UpdateWebhookSettingsDto = UpdateWebhookSettingsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.webhookUrl !== null && o.webhookUrl !== ''),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUrl)({
        protocols: ['https'],
        require_protocol: true,
        require_tld: true,
    }, { message: 'webhookUrl must be a valid HTTPS URL' }),
    __metadata("design:type", Object)
], UpdateWebhookSettingsDto.prototype, "webhookUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateWebhookSettingsDto.prototype, "webhookEventsEnabled", void 0);
