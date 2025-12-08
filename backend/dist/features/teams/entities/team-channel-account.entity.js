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
exports.TeamChannelAccount = void 0;
const typeorm_1 = require("typeorm");
const team_entity_1 = require("./team.entity");
const channel_account_entity_1 = require("../../channel-accounts/channel-account.entity");
/**
 * TeamChannelAccount entity represents the association between a team
 * and a channel account. This enables team-based access control where
 * team members can only access conversations from their assigned channel accounts.
 */
let TeamChannelAccount = class TeamChannelAccount {
    id;
    teamId;
    team;
    channelAccountId;
    channelAccount;
    createdAt;
};
exports.TeamChannelAccount = TeamChannelAccount;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TeamChannelAccount.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'team_id' }),
    __metadata("design:type", String)
], TeamChannelAccount.prototype, "teamId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => team_entity_1.Team, (team) => team.channelAccounts, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'team_id' }),
    __metadata("design:type", team_entity_1.Team)
], TeamChannelAccount.prototype, "team", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'channel_account_id' }),
    __metadata("design:type", String)
], TeamChannelAccount.prototype, "channelAccountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => channel_account_entity_1.ChannelAccount, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'channel_account_id' }),
    __metadata("design:type", channel_account_entity_1.ChannelAccount)
], TeamChannelAccount.prototype, "channelAccount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TeamChannelAccount.prototype, "createdAt", void 0);
exports.TeamChannelAccount = TeamChannelAccount = __decorate([
    (0, typeorm_1.Entity)('team_channel_accounts'),
    (0, typeorm_1.Index)(['teamId', 'channelAccountId'], { unique: true })
], TeamChannelAccount);
