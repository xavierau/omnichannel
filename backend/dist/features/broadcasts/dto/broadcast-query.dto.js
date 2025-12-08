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
exports.BroadcastQueryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const enums_1 = require("../enums");
const enums_2 = require("../../templates/enums");
/**
 * DTO for broadcast list query parameters.
 * Supports filtering, searching, pagination, and sorting.
 */
class BroadcastQueryDto {
    search;
    statuses;
    templateCategories;
    dateFrom;
    dateTo;
    page = 1;
    limit = 10;
    sortBy = 'createdAt';
    sortOrder = 'desc';
}
exports.BroadcastQueryDto = BroadcastQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BroadcastQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        // Handle comma-separated string or array
        if (typeof value === 'string') {
            return value.split(',').filter((v) => v.trim());
        }
        return value;
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(enums_1.BroadcastStatus, { each: true, message: 'Invalid broadcast status' }),
    __metadata("design:type", Array)
], BroadcastQueryDto.prototype, "statuses", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        // Handle comma-separated string or array
        if (typeof value === 'string') {
            return value.split(',').filter((v) => v.trim());
        }
        return value;
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(enums_2.TemplateCategory, { each: true, message: 'Invalid template category' }),
    __metadata("design:type", Array)
], BroadcastQueryDto.prototype, "templateCategories", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'dateFrom must be a valid ISO date string' }),
    __metadata("design:type", String)
], BroadcastQueryDto.prototype, "dateFrom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'dateTo must be a valid ISO date string' }),
    __metadata("design:type", String)
], BroadcastQueryDto.prototype, "dateTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'Page must be at least 1' }),
    __metadata("design:type", Number)
], BroadcastQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'Limit must be at least 1' }),
    (0, class_validator_1.Max)(100, { message: 'Limit must not exceed 100' }),
    __metadata("design:type", Number)
], BroadcastQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['name', 'createdAt', 'scheduledAt', 'status', 'updatedAt'], {
        message: 'sortBy must be one of: name, createdAt, scheduledAt, status, updatedAt',
    }),
    __metadata("design:type", String)
], BroadcastQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['asc', 'desc', 'ASC', 'DESC'], {
        message: 'sortOrder must be one of: asc, desc',
    }),
    __metadata("design:type", String)
], BroadcastQueryDto.prototype, "sortOrder", void 0);
