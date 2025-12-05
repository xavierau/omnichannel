import { AppDataSource } from '@config/database.config';
import { User, UserStatus } from '@features/users/user.entity';
import { Role } from '@features/roles/role.entity';
import * as argon2 from 'argon2';

export async function seedAdminUser() {
  console.log('👤 Seeding default admin user...');

  const userRepository = AppDataSource.getRepository(User);
  const roleRepository = AppDataSource.getRepository(Role);

  // Check if admin user already exists
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@example.com' },
  });

  if (existingAdmin) {
    console.log('⏭️  Admin user already exists, skipping...');
    return;
  }

  // Find super_admin role
  const superAdminRole = await roleRepository.findOne({
    where: { name: 'super_admin' },
  });

  if (!superAdminRole) {
    throw new Error('Super Admin role not found! Please run role seeding first.');
  }

  // Hash password directly (entity hooks don't fire reliably during seeding)
  const passwordHash = await argon2.hash('ChangeMe123!');

  // Create admin user
  const adminUser = userRepository.create({
    email: 'admin@example.com',
    passwordHash: passwordHash,
    firstName: 'System',
    lastName: 'Administrator',
    status: UserStatus.ACTIVE,
    emailVerified: true,
    roles: [superAdminRole],
  });

  await userRepository.save(adminUser);

  console.log('✅ Created default admin user');
  console.log('  📧 Email: admin@example.com');
  console.log('  🔑 Password: ChangeMe123!');
  console.log('  ⚠️  IMPORTANT: Change this password immediately in production!');
}
