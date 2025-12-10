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
exports.AgentUpdateStatusDto = void 0;
const class_validator_1 = require("class-validator");
const enums_1 = require("../../inbox/enums");
/**
 * DTO for updating a conversation's status via Agent API.
 *
 * Status transitions are validated by the ConversationService according to
 * the conversation state machine.
 *
 * Valid transitions:
 * - UNASSIGNED -> ACTIVE, WAITING, RESOLVED, CLOSED
 * - ACTIVE -> WAITING, RESOLVED, CLOSED, UNASSIGNED
 * - WAITING -> ACTIVE, RESOLVED, CLOSED
 * - RESOLVED -> ACTIVE, CLOSED
 * - CLOSED -> ACTIVE
 */
class AgentUpdateStatusDto {
    status;
}
exports.AgentUpdateStatusDto = AgentUpdateStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.ConversationStatus, {
        message: 'status must be one of: unassigned, active, waiting, resolved, closed',
    }),
    __metadata("design:type", String)
], AgentUpdateStatusDto.prototype, "status", void 0);
