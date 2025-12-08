"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamMemberRole = void 0;
/**
 * Enum representing the role of a user within a team.
 *
 * - LEADER: Can manage team members and team settings
 * - MEMBER: Standard team member with read access to team resources
 */
var TeamMemberRole;
(function (TeamMemberRole) {
    TeamMemberRole["LEADER"] = "leader";
    TeamMemberRole["MEMBER"] = "member";
})(TeamMemberRole || (exports.TeamMemberRole = TeamMemberRole = {}));
