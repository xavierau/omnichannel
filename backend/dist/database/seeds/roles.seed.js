"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRoles = seedRoles;
const database_config_1 = require("../../config/database.config");
const role_entity_1 = require("../../features/roles/role.entity");
const permission_entity_1 = require("../../features/permissions/permission.entity");
async function seedRoles() {
    console.log('👥 Seeding roles...');
    const roleRepository = database_config_1.AppDataSource.getRepository(role_entity_1.Role);
    const permissionRepository = database_config_1.AppDataSource.getRepository(permission_entity_1.Permission);
    // Check if roles already exist
    const existingCount = await roleRepository.count();
    if (existingCount > 0) {
        console.log(`⏭️  Roles already seeded (${existingCount} found), skipping...`);
        return;
    }
    // Helper to find permission by resource:action:scope
    const findPermission = async (resource, action, scope) => {
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
            permission_entity_1.PermissionResource.BROADCASTS,
            permission_entity_1.PermissionResource.CUSTOMERS,
            permission_entity_1.PermissionResource.TEMPLATES,
            permission_entity_1.PermissionResource.CONVERSATIONS,
            permission_entity_1.PermissionResource.CHANNELS,
            permission_entity_1.PermissionResource.CUSTOM_FIELDS,
            permission_entity_1.PermissionResource.NOTES,
            permission_entity_1.PermissionResource.SETTINGS,
            permission_entity_1.PermissionResource.INBOX,
            permission_entity_1.PermissionResource.INVITATIONS,
        ],
    })
        .andWhere('permission.action = :action', { action: permission_entity_1.PermissionAction.MANAGE })
        .andWhere('permission.scope = :scope', { scope: permission_entity_1.PermissionScope.ALL })
        .getMany();
    // Admin can read all users but not manage them
    const usersReadAll = await findPermission(permission_entity_1.PermissionResource.USERS, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.ALL);
    if (usersReadAll)
        adminPermissions.push(usersReadAll);
    const adminRole = roleRepository.create({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Manage broadcasts, customers, templates, and conversations. Can view users.',
        level: 2,
        isSystem: true,
        permissions: adminPermissions,
    });
    await roleRepository.save(adminRole);
    console.log('  ✓ Created Admin role with operational permissions');
    // 3. Manager Role - Create/edit own content, view all
    const managerPermissions = [];
    // Broadcasts: create own, read all, update own, delete own
    const broadcastsCreateOwn = await findPermission(permission_entity_1.PermissionResource.BROADCASTS, permission_entity_1.PermissionAction.CREATE, permission_entity_1.PermissionScope.OWN);
    const broadcastsReadAll = await findPermission(permission_entity_1.PermissionResource.BROADCASTS, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.ALL);
    const broadcastsUpdateOwn = await findPermission(permission_entity_1.PermissionResource.BROADCASTS, permission_entity_1.PermissionAction.UPDATE, permission_entity_1.PermissionScope.OWN);
    const broadcastsDeleteOwn = await findPermission(permission_entity_1.PermissionResource.BROADCASTS, permission_entity_1.PermissionAction.DELETE, permission_entity_1.PermissionScope.OWN);
    if (broadcastsCreateOwn)
        managerPermissions.push(broadcastsCreateOwn);
    if (broadcastsReadAll)
        managerPermissions.push(broadcastsReadAll);
    if (broadcastsUpdateOwn)
        managerPermissions.push(broadcastsUpdateOwn);
    if (broadcastsDeleteOwn)
        managerPermissions.push(broadcastsDeleteOwn);
    // Templates: create own, read all, update own
    const templatesCreateOwn = await findPermission(permission_entity_1.PermissionResource.TEMPLATES, permission_entity_1.PermissionAction.CREATE, permission_entity_1.PermissionScope.OWN);
    const templatesReadAll = await findPermission(permission_entity_1.PermissionResource.TEMPLATES, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.ALL);
    const templatesUpdateOwn = await findPermission(permission_entity_1.PermissionResource.TEMPLATES, permission_entity_1.PermissionAction.UPDATE, permission_entity_1.PermissionScope.OWN);
    if (templatesCreateOwn)
        managerPermissions.push(templatesCreateOwn);
    if (templatesReadAll)
        managerPermissions.push(templatesReadAll);
    if (templatesUpdateOwn)
        managerPermissions.push(templatesUpdateOwn);
    // Customers: read all, update all
    const customersReadAll = await findPermission(permission_entity_1.PermissionResource.CUSTOMERS, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.ALL);
    const customersUpdateAll = await findPermission(permission_entity_1.PermissionResource.CUSTOMERS, permission_entity_1.PermissionAction.UPDATE, permission_entity_1.PermissionScope.ALL);
    if (customersReadAll)
        managerPermissions.push(customersReadAll);
    if (customersUpdateAll)
        managerPermissions.push(customersUpdateAll);
    // Conversations: read all, update all
    const conversationsReadAll = await findPermission(permission_entity_1.PermissionResource.CONVERSATIONS, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.ALL);
    const conversationsUpdateAll = await findPermission(permission_entity_1.PermissionResource.CONVERSATIONS, permission_entity_1.PermissionAction.UPDATE, permission_entity_1.PermissionScope.ALL);
    if (conversationsReadAll)
        managerPermissions.push(conversationsReadAll);
    if (conversationsUpdateAll)
        managerPermissions.push(conversationsUpdateAll);
    const managerRole = roleRepository.create({
        name: 'manager',
        displayName: 'Manager',
        description: 'Create and edit own broadcasts and templates. View and update all customers and conversations.',
        level: 3,
        isSystem: true,
        permissions: managerPermissions,
    });
    await roleRepository.save(managerRole);
    console.log('  ✓ Created Manager role with team oversight permissions');
    // 4. Agent Role - Limited access, mainly view-only
    const agentPermissions = [];
    // Broadcasts: create own, read own, update own
    const agentBroadcastsCreateOwn = await findPermission(permission_entity_1.PermissionResource.BROADCASTS, permission_entity_1.PermissionAction.CREATE, permission_entity_1.PermissionScope.OWN);
    const agentBroadcastsReadOwn = await findPermission(permission_entity_1.PermissionResource.BROADCASTS, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.OWN);
    const agentBroadcastsUpdateOwn = await findPermission(permission_entity_1.PermissionResource.BROADCASTS, permission_entity_1.PermissionAction.UPDATE, permission_entity_1.PermissionScope.OWN);
    if (agentBroadcastsCreateOwn)
        agentPermissions.push(agentBroadcastsCreateOwn);
    if (agentBroadcastsReadOwn)
        agentPermissions.push(agentBroadcastsReadOwn);
    if (agentBroadcastsUpdateOwn)
        agentPermissions.push(agentBroadcastsUpdateOwn);
    // Customers: read all (view only)
    const agentCustomersReadAll = await findPermission(permission_entity_1.PermissionResource.CUSTOMERS, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.ALL);
    if (agentCustomersReadAll)
        agentPermissions.push(agentCustomersReadAll);
    // Conversations: read all, update own
    const agentConversationsReadAll = await findPermission(permission_entity_1.PermissionResource.CONVERSATIONS, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.ALL);
    const agentConversationsUpdateOwn = await findPermission(permission_entity_1.PermissionResource.CONVERSATIONS, permission_entity_1.PermissionAction.UPDATE, permission_entity_1.PermissionScope.OWN);
    if (agentConversationsReadAll)
        agentPermissions.push(agentConversationsReadAll);
    if (agentConversationsUpdateOwn)
        agentPermissions.push(agentConversationsUpdateOwn);
    // Templates: read all (view only)
    const agentTemplatesReadAll = await findPermission(permission_entity_1.PermissionResource.TEMPLATES, permission_entity_1.PermissionAction.READ, permission_entity_1.PermissionScope.ALL);
    if (agentTemplatesReadAll)
        agentPermissions.push(agentTemplatesReadAll);
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
