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
exports.Permission = exports.PermissionScope = exports.PermissionAction = exports.PermissionResource = void 0;
const typeorm_1 = require("typeorm");
const role_entity_1 = require("../roles/role.entity");
var PermissionResource;
(function (PermissionResource) {
    PermissionResource["BROADCASTS"] = "broadcasts";
    PermissionResource["CUSTOMERS"] = "customers";
    PermissionResource["TEMPLATES"] = "templates";
    PermissionResource["CONVERSATIONS"] = "conversations";
    PermissionResource["USERS"] = "users";
    PermissionResource["SETTINGS"] = "settings";
    PermissionResource["API_KEYS"] = "api_keys";
    PermissionResource["CHANNELS"] = "channels";
    PermissionResource["CUSTOM_FIELDS"] = "custom_fields";
    PermissionResource["NOTES"] = "notes";
    PermissionResource["TEAMS"] = "teams";
    PermissionResource["INBOX"] = "inbox";
    PermissionResource["INVITATIONS"] = "invitations";
})(PermissionResource || (exports.PermissionResource = PermissionResource = {}));
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["CREATE"] = "create";
    PermissionAction["READ"] = "read";
    PermissionAction["UPDATE"] = "update";
    PermissionAction["DELETE"] = "delete";
    PermissionAction["MANAGE"] = "manage";
    PermissionAction["MESSAGE"] = "message";
    PermissionAction["ASSIGN"] = "assign";
    PermissionAction["NOTE"] = "note";
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
var PermissionScope;
(function (PermissionScope) {
    PermissionScope["ALL"] = "all";
    PermissionScope["OWN"] = "own";
})(PermissionScope || (exports.PermissionScope = PermissionScope = {}));
let Permission = class Permission {
    id;
    resource;
    action;
    scope;
    description;
    roles;
    createdAt;
    updatedAt;
    // Helper method to get permission string format: resource:action:scope
    toString() {
        return `${this.resource}:${this.action}:${this.scope}`;
    }
};
exports.Permission = Permission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Permission.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PermissionResource,
    }),
    __metadata("design:type", String)
], Permission.prototype, "resource", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PermissionAction,
    }),
    __metadata("design:type", String)
], Permission.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PermissionScope,
    }),
    __metadata("design:type", String)
], Permission.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Permission.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => role_entity_1.Role, (role) => role.permissions),
    __metadata("design:type", Array)
], Permission.prototype, "roles", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Permission.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Permission.prototype, "updatedAt", void 0);
exports.Permission = Permission = __decorate([
    (0, typeorm_1.Entity)('permissions'),
    (0, typeorm_1.Index)(['resource', 'action', 'scope'], { unique: true })
], Permission);
