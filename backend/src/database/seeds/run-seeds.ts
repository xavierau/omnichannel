import 'reflect-metadata';
import { AppDataSource } from '@config/database.config';
import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { seedAdminUser } from './admin-user.seed';

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Seed in order (permissions → roles → admin user)
    await seedPermissions();
    await seedRoles();
    await seedAdminUser();

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runSeeds();
