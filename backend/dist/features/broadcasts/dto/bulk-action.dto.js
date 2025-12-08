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
exports.BulkActionDto = void 0;
const class_validator_1 = require("class-validator");
/**
 * DTO for bulk operations on broadcasts.
 * Used for bulk delete and bulk status update operations.
 */
class BulkActionDto {
    ids;
}
exports.BulkActionDto = BulkActionDto;
__decorate([
    (0, class_validator_1.IsArray)({ message: 'IDs must be an array' }),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one ID is required' }),
    (0, class_validator_1.ArrayMaxSize)(100, { message: 'Cannot perform bulk operation on more than 100 broadcasts at once' }),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each ID must be a valid UUID' }),
    __metadata("design:type", Array)
], BulkActionDto.prototype, "ids", void 0);
