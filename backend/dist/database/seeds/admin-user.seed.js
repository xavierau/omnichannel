"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdminUser = seedAdminUser;
const database_config_1 = require("@config/database.config");
const user_entity_1 = require("@features/users/user.entity");
const role_entity_1 = require("@features/roles/role.entity");
const argon2 = __importStar(require("argon2"));
async function seedAdminUser() {
    console.log('👤 Seeding default admin user...');
    const userRepository = database_config_1.AppDataSource.getRepository(user_entity_1.User);
    const roleRepository = database_config_1.AppDataSource.getRepository(role_entity_1.Role);
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
        status: user_entity_1.UserStatus.ACTIVE,
        emailVerified: true,
        roles: [superAdminRole],
    });
    await userRepository.save(adminUser);
    console.log('✅ Created default admin user');
    console.log('  📧 Email: admin@example.com');
    console.log('  🔑 Password: ChangeMe123!');
    console.log('  ⚠️  IMPORTANT: Change this password immediately in production!');
}
