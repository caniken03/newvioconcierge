#!/usr/bin/env tsx

import { db } from '../server/db';
import { users, tenants } from '../shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

interface BootstrapConfig {
  email: string;
  password: string;
  fullName: string;
}

async function createSuperAdmin(config: BootstrapConfig) {
  console.log('🚀 Starting VioConcierge bootstrap process...');

  try {
    // Check if super admin already exists
    const existingSuperAdmin = await db
      .select()
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (existingSuperAdmin.length > 0) {
      console.log('✅ Super admin already exists. Bootstrap not needed.');
      console.log(`📧 Existing super admin: ${existingSuperAdmin[0].email}`);
      return existingSuperAdmin[0];
    }

    // Check if user with this email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, config.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error(`User with email ${config.email} already exists`);
    }

    // Create platform tenant for super admin
    const [platformTenant] = await db
      .insert(tenants)
      .values({
        name: 'VioConcierge Platform',
        companyName: 'VioConcierge Inc.',
        contactEmail: config.email,
        tenantNumber: 'T-PLATFORM',
        status: 'active',
      })
      .returning();

    // Hash password
    const hashedPassword = await bcrypt.hash(config.password, 10);

    // Create super admin user
    const [superAdmin] = await db
      .insert(users)
      .values({
        email: config.email,
        fullName: config.fullName,
        hashedPassword,
        role: 'super_admin',
        tenantId: platformTenant.id,
        isActive: true,
      })
      .returning();

    console.log('✅ Super admin created successfully!');
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`👤 Name: ${superAdmin.fullName}`);
    console.log(`🔑 Role: ${superAdmin.role}`);
    console.log('');
    console.log('🎉 Bootstrap completed! You can now log in to the VioConcierge platform.');
    console.log('');
    console.log('Login credentials:');
    console.log(`📧 Email: ${config.email}`);
    console.log(`🔐 Password: [hidden for security]`);
    console.log('🌐 Access: http://localhost:5000');

    return superAdmin;

  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
}

async function main() {
  const config: BootstrapConfig = {
    email: process.env.ADMIN_EMAIL || 'admin@vioconcierge.com',
    password: process.env.ADMIN_PASSWORD || 'VioAdmin2024!',
    fullName: process.env.ADMIN_NAME || 'Platform Administrator',
  };

  console.log('');
  console.log('🏗️  VioConcierge Platform Bootstrap');
  console.log('=====================================');
  console.log('');
  console.log('This script will create the initial super admin account.');
  console.log('');
  console.log(`📧 Admin Email: ${config.email}`);
  console.log(`👤 Admin Name: ${config.fullName}`);
  console.log('🔐 Password: [configured]');
  console.log('');

  await createSuperAdmin(config);

  // Close database connection
  await db.$client.end();
  process.exit(0);
}

// Run bootstrap if this file is executed directly
main().catch((error) => {
  console.error('❌ Bootstrap script failed:', error);
  process.exit(1);
});

export { createSuperAdmin };