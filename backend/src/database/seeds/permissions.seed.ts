import { AppDataSource } from '@config/database.config';
import {
  Permission,
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '@features/permissions/permission.entity';

export async function seedPermissions() {
  console.log('📋 Seeding permissions...');

  const permissionRepository = AppDataSource.getRepository(Permission);

  // Check if permissions already exist
  const existingCount = await permissionRepository.count();
  if (existingCount > 0) {
    console.log(`⏭️  Permissions already seeded (${existingCount} found), skipping...`);
    return;
  }

  const permissions: Partial<Permission>[] = [];

  // Generate all permission combinations
  const resources = Object.values(PermissionResource);
  const actions = Object.values(PermissionAction);
  const scopes = Object.values(PermissionScope);

  for (const resource of resources) {
    for (const action of actions) {
      // manage:all implies full control
      if (action === PermissionAction.MANAGE) {
        permissions.push({
          resource,
          action,
          scope: PermissionScope.ALL,
          description: `Full control over ${resource}`,
        });
      } else {
        // For other actions, create both :all and :own scopes
        for (const scope of scopes) {
          permissions.push({
            resource,
            action,
            scope,
            description:
              scope === PermissionScope.ALL
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
