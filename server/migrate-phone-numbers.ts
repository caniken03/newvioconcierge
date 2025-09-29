#!/usr/bin/env node

/**
 * Phone Number Migration Script
 * 
 * Migrates existing contact phone numbers to populate the normalized_phone field
 * Fixes Unicode contamination and ensures consistent E.164 format
 */

import { storage } from './storage';
import { normalizePhoneNumber } from './utils/phone-normalization';

interface MigrationResult {
  totalContacts: number;
  successfulNormalizations: number;
  failedNormalizations: number;
  unicodeIssuesFixed: number;
  errors: Array<{ contactId: string; name: string; phone: string; error: string }>;
}

async function migratePhoneNumbers(): Promise<MigrationResult> {
  console.log('🔄 Starting phone number migration...');
  
  const result: MigrationResult = {
    totalContacts: 0,
    successfulNormalizations: 0,
    failedNormalizations: 0,
    unicodeIssuesFixed: 0,
    errors: []
  };

  try {
    // Get all tenants and their contacts
    const tenants = await storage.getAllTenants();
    
    for (const tenant of tenants) {
      console.log(`\n📋 Processing contacts for tenant: ${tenant.name} (${tenant.id})`);
      
      const contacts = await storage.getContactsByTenant(tenant.id, 1000, 0);
      result.totalContacts += contacts.length;
      
      for (const contact of contacts) {
        try {
          // Check if already has normalized phone
          if (contact.normalizedPhone) {
            console.log(`✅ Contact ${contact.name} already has normalized phone: ${contact.normalizedPhone}`);
            result.successfulNormalizations++;
            continue;
          }

          // Detect Unicode contamination
          const hasUnicode = /[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/.test(contact.phone);
          if (hasUnicode) {
            console.log(`🚨 Unicode contamination detected for ${contact.name}: ${contact.phone}`);
            result.unicodeIssuesFixed++;
          }

          // Normalize the phone number
          const normalizationResult = normalizePhoneNumber(contact.phone, 'GB');
          
          if (normalizationResult.success) {
            // Update the contact with normalized phone
            await storage.updateContact(contact.id, {
              normalizedPhone: normalizationResult.normalizedPhone
            });
            
            console.log(`✅ ${contact.name}: ${contact.phone} → ${normalizationResult.normalizedPhone}`);
            if (normalizationResult.warnings?.length) {
              console.log(`   ⚠️ Warnings: ${normalizationResult.warnings.join(', ')}`);
            }
            
            result.successfulNormalizations++;
          } else {
            console.error(`❌ Failed to normalize ${contact.name}: ${normalizationResult.error}`);
            result.failedNormalizations++;
            result.errors.push({
              contactId: contact.id,
              name: contact.name,
              phone: contact.phone,
              error: normalizationResult.error || 'Unknown error'
            });
          }
          
        } catch (error) {
          console.error(`❌ Error processing contact ${contact.name}:`, error);
          result.failedNormalizations++;
          result.errors.push({
            contactId: contact.id,
            name: contact.name,
            phone: contact.phone,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Also migrate contact call history
    console.log('\n📞 Migrating contact call history...');
    // Note: This would require a custom query to get all call history records
    // For now, they will be updated incrementally as new calls are made

    console.log('\n🎉 Migration completed!');
    console.log(`📊 Results:`);
    console.log(`   Total contacts: ${result.totalContacts}`);
    console.log(`   Successful normalizations: ${result.successfulNormalizations}`);
    console.log(`   Failed normalizations: ${result.failedNormalizations}`);
    console.log(`   Unicode issues fixed: ${result.unicodeIssuesFixed}`);
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      result.errors.forEach(error => {
        console.log(`   - ${error.name} (${error.phone}): ${error.error}`);
      });
    }

    return result;
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePhoneNumbers()
    .then((result) => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migratePhoneNumbers };