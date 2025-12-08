"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPermissions = seedPermissions;
const database_config_1 = require("@config/database.config");
const permission_entity_1 = require("@features/permissions/permission.entity");
async function seedPermissions() {
    console.log('📋 Seeding permissions...');
    const permissionRepository = database_config_1.AppDataSource.getRepository(permission_entity_1.Permission);
    // Check if permissions already exist
    const existingCount = await permissionRepository.count();
    if (existingCount > 0) {
        console.log(`⏭️  Permissions already seeded (${existingCount} found), skipping...`);
        return;
    }
    const permissions = [];
    // Generate all permission combinations
    const resources = Object.values(permission_entity_1.PermissionResource);
    const actions = Object.values(permission_entity_1.PermissionAction);
    const scopes = Object.values(permission_entity_1.PermissionScope);
    for (const resource of resources) {
        for (const action of actions) {
            // manage:all implies full control
            if (action === permission_entity_1.PermissionAction.MANAGE) {
                permissions.push({
                    resource,
                    action,
                    scope: permission_entity_1.PermissionScope.ALL,
                    description: `Full control over ${resource}`,
                });
            }
            else {
                // For other actions, create both :all and :own scopes
                for (const scope of scopes) {
                    permissions.push({
                        resource,
                        action,
                        scope,
                        description: scope === permission_entity_1.PermissionScope.ALL
                            ? `Can ${action} all ${resource}`
                            : `Can ${action} own ${resource}`,
                    });
                }
            }
        }
    }
    // Insert all permissions
    await permissionRepository.save(permissions);
    console.log(`✅ Created ${permissions.length} permissions`);
}
