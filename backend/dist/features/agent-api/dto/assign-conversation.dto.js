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
exports.AgentAssignConversationDto = void 0;
const class_validator_1 = require("class-validator");
/**
 * DTO for assigning a conversation to an operator via Agent API.
 *
 * The target operator must:
 * - Exist in the same tenant
 * - Have access to the conversation's channel account
 */
class AgentAssignConversationDto {
    operatorId;
}
exports.AgentAssignConversationDto = AgentAssignConversationDto;
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'operatorId must be a valid UUID' }),
    __metadata("design:type", String)
], AgentAssignConversationDto.prototype, "operatorId", void 0);
