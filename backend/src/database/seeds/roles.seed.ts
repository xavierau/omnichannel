import { AppDataSource } from '@config/database.config';
import { Role } from '@features/roles/role.entity';
import {
  Permission,
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '@features/permissions/permission.entity';

export async function seedRoles() {
  console.log('👥 Seeding roles...');

  const roleRepository = AppDataSource.getRepository(Role);
  const permissionRepository = AppDataSource.getRepository(Permission);

  // Check if roles already exist
  const existingCount = await roleRepository.count();
  if (existingCount > 0) {
    console.log(`⏭️  Roles already seeded (${existingCount} found), skipping...`);
    return;
  }

  // Helper to find permission by resource:action:scope
  const findPermission = async (
    resource: PermissionResource,
    action: PermissionAction,
    scope: PermissionScope
  ): Promise<Permission | null> => {
    return permissionRepository.findOne({ where: { resource, action, scope } });
  };

  // 1. Super Admin Role - ALL permissions
  const superAdminPermissions = await permissionRepository.find();
  const superAdminRole = roleRepository.create({
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access including user management and system configuration',
    level: 1,
    isSystem: true,
    permissions: superAdminPermissions,
  });
  await roleRepository.save(superAdminRole);
  console.log('  ✓ Created Super Admin role with all permissions');

  // 2. Admin Role - Operational permissions (manage all resources except users)
  const adminPermissions = await permissionRepository
    .createQueryBuilder('permission')
    .where('permission.resource IN (:...resources)', {
      resources: [
        PermissionResource.BROADCASTS,
        PermissionResource.CUSTOMERS,
        PermissionResource.TEMPLATES,
        PermissionResource.CONVERSATIONS,
        PermissionResource.CHANNELS,
        PermissionResource.CUSTOM_FIELDS,
        PermissionResource.NOTES,
        PermissionResource.SETTINGS,
        PermissionResource.INBOX,
        PermissionResource.INVITATIONS,
      ],
    })
    .andWhere('permission.action = :action', { action: PermissionAction.MANAGE })
    .andWhere('permission.scope = :scope', { scope: PermissionScope.ALL })
    .getMany();

  // Admin can read all users but not manage them
  const usersReadAll = await findPermission(
    PermissionResource.USERS,
    PermissionAction.READ,
    PermissionScope.ALL
  );
  if (usersReadAll) adminPermissions.push(usersReadAll);

  const adminRole = roleRepository.create({
    name: 'admin',
    displayName: 'Administrator',
    description:
      'Manage broadcasts, customers, templates, and conversations. Can view users.',
    level: 2,
    isSystem: true,
    permissions: adminPermissions,
  });
  await roleRepository.save(adminRole);
  console.log('  ✓ Created Admin role with operational permissions');

  // 3. Manager Role - Create/edit own content, view all
  const managerPermissions: Permission[] = [];

  // Broadcasts: create own, read all, update own, delete own
  const broadcastsCreateOwn = await findPermission(
    PermissionResource.BROADCASTS,
    PermissionAction.CREATE,
    PermissionScope.OWN
  );
  const broadcastsReadAll = await findPermission(
    PermissionResource.BROADCASTS,
    PermissionAction.READ,
    PermissionScope.ALL
  );
  const broadcastsUpdateOwn = await findPermission(
    PermissionResource.BROADCASTS,
    PermissionAction.UPDATE,
    PermissionScope.OWN
  );
  const broadcastsDeleteOwn = await findPermission(
    PermissionResource.BROADCASTS,
    PermissionAction.DELETE,
    PermissionScope.OWN
  );
  if (broadcastsCreateOwn) managerPermissions.push(broadcastsCreateOwn);
  if (broadcastsReadAll) managerPermissions.push(broadcastsReadAll);
  if (broadcastsUpdateOwn) managerPermissions.push(broadcastsUpdateOwn);
  if (broadcastsDeleteOwn) managerPermissions.push(broadcastsDeleteOwn);

  // Templates: create own, read all, update own
  const templatesCreateOwn = await findPermission(
    PermissionResource.TEMPLATES,
    PermissionAction.CREATE,
    PermissionScope.OWN
  );
  const templatesReadAll = await findPermission(
    PermissionResource.TEMPLATES,
    PermissionAction.READ,
    PermissionScope.ALL
  );
  const templatesUpdateOwn = await findPermission(
    PermissionResource.TEMPLATES,
    PermissionAction.UPDATE,
    PermissionScope.OWN
  );
  if (templatesCreateOwn) managerPermissions.push(templatesCreateOwn);
  if (templatesReadAll) managerPermissions.push(templatesReadAll);
  if (templatesUpdateOwn) managerPermissions.push(templatesUpdateOwn);

  // Customers: read all, update all
  const customersReadAll = await findPermission(
    PermissionResource.CUSTOMERS,
    PermissionAction.READ,
    PermissionScope.ALL
  );
  const customersUpdateAll = await findPermission(
    PermissionResource.CUSTOMERS,
    PermissionAction.UPDATE,
    PermissionScope.ALL
  );
  if (customersReadAll) managerPermissions.push(customersReadAll);
  if (customersUpdateAll) managerPermissions.push(customersUpdateAll);

  // Conversations: read all, update all
  const conversationsReadAll = await findPermission(
    PermissionResource.CONVERSATIONS,
    PermissionAction.READ,
    PermissionScope.ALL
  );
  const conversationsUpdateAll = await findPermission(
    PermissionResource.CONVERSATIONS,
    PermissionAction.UPDATE,
    PermissionScope.ALL
  );
  if (conversationsReadAll) managerPermissions.push(conversationsReadAll);
  if (conversationsUpdateAll) managerPermissions.push(conversationsUpdateAll);

  const managerRole = roleRepository.create({
    name: 'manager',
    displayName: 'Manager',
    description:
      'Create and edit own broadcasts and templates. View and update all customers and conversations.',
    level: 3,
    isSystem: true,
    permissions: managerPermissions,
  });
  await roleRepository.save(managerRole);
  console.log('  ✓ Created Manager role with team oversight permissions');

  // 4. Agent Role - Limited access, mainly view-only
  const agentPermissions: Permission[] = [];

  // Broadcasts: create own, read own, update own
  const agentBroadcastsCreateOwn = await findPermission(
    PermissionResource.BROADCASTS,
    PermissionAction.CREATE,
    PermissionScope.OWN
  );
  const agentBroadcastsReadOwn = await findPermission(
    PermissionResource.BROADCASTS,
    PermissionAction.READ,
    PermissionScope.OWN
  );
  const agentBroadcastsUpdateOwn = await findPermission(
    PermissionResource.BROADCASTS,
    PermissionAction.UPDATE,
    PermissionScope.OWN
  );
  if (agentBroadcastsCreateOwn) agentPermissions.push(agentBroadcastsCreateOwn);
  if (agentBroadcastsReadOwn) agentPermissions.push(agentBroadcastsReadOwn);
  if (agentBroadcastsUpdateOwn) agentPermissions.push(agentBroadcastsUpdateOwn);

  // Customers: read all (view only)
  const agentCustomersReadAll = await findPermission(
    PermissionResource.CUSTOMERS,
    PermissionAction.READ,
    PermissionScope.ALL
  );
  if (agentCustomersReadAll) agentPermissions.push(agentCustomersReadAll);

  // Conversations: read all, update own
  const agentConversationsReadAll = await findPermission(
    PermissionResource.CONVERSATIONS,
    PermissionAction.READ,
    PermissionScope.ALL
  );
  const agentConversationsUpdateOwn = await findPermission(
    PermissionResource.CONVERSATIONS,
    PermissionAction.UPDATE,
    PermissionScope.OWN
  );
  if (agentConversationsReadAll) agentPermissions.push(agentConversationsReadAll);
  if (agentConversationsUpdateOwn) agentPermissions.push(agentConversationsUpdateOwn);

  // Templates: read all (view only)
  const agentTemplatesReadAll = await findPermission(
    PermissionResource.TEMPLATES,
    PermissionAction.READ,
    PermissionScope.ALL
  );
  if (agentTemplatesReadAll) agentPermissions.push(agentTemplatesReadAll);

  const agentRole = roleRepository.create({
    name: 'agent',
    displayName: 'Agent/Operator',
    description: 'Limited access. Handle customer interactions and view content.',
    level: 4,
    isSystem: true,
    permissions: agentPermissions,
  });
  await roleRepository.save(agentRole);
  console.log('  ✓ Created Agent role with limited operational permissions');

  console.log('✅ Created 4 roles with appropriate permissions');
}
