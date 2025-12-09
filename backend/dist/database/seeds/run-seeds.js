"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const database_config_1 = require("../../config/database.config");
const permissions_seed_1 = require("./permissions.seed");
const roles_seed_1 = require("./roles.seed");
const admin_user_seed_1 = require("./admin-user.seed");
async function runSeeds() {
    try {
        console.log('🌱 Starting database seeding...');
        // Initialize database connection
        await database_config_1.AppDataSource.initialize();
        console.log('✅ Database connection established');
        // Seed in order (permissions → roles → admin user)
        await (0, permissions_seed_1.seedPermissions)();
        await (0, roles_seed_1.seedRoles)();
        await (0, admin_user_seed_1.seedAdminUser)();
        console.log('🎉 Database seeding completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
    finally {
        if (database_config_1.AppDataSource.isInitialized) {
            await database_config_1.AppDataSource.destroy();
        }
    }
}
runSeeds();
