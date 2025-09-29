import { parsePhoneNumber, isValidPhoneNumber, E164Number } from 'libphonenumber-js';

/**
 * Phone normalization utility for VioConcierge
 * 
 * Addresses critical security vulnerability where Unicode bidirectional text control 
 * characters (‪ and ‬) and other formatting contaminate phone numbers, causing:
 * - Retell API E.164 validation failures
 * - Bypass of abuse protection systems
 * - Inconsistent deduplication
 * 
 * This utility ensures all phone numbers are canonicalized to valid E.164 format.
 */

export interface PhoneNormalizationResult {
  success: boolean;
  normalizedPhone?: string;
  originalPhone: string;
  error?: string;
  warnings?: string[];
}

/**
 * Normalizes a phone number to E.164 format with comprehensive Unicode sanitization
 * 
 * @param phone Raw phone number string from user input
 * @param defaultCountry Default country code for parsing (defaults to 'GB' for UK)
 * @returns PhoneNormalizationResult with success status and normalized phone
 */
export function normalizePhoneNumber(
  phone: string | null | undefined,
  defaultCountry: string = 'GB'
): PhoneNormalizationResult {
  const originalPhone = phone || '';
  const warnings: string[] = [];

  // Handle null/undefined/empty input
  if (!phone || typeof phone !== 'string') {
    return {
      success: false,
      originalPhone,
      error: 'Phone number is required and must be a string'
    };
  }

  try {
    // Step 1: Strip Unicode bidirectional text control characters and other invisible chars
    // These are the characters that caused the production issue: ‪ and ‬
    let sanitized = phone
      .replace(/[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g, '') // Bidirectional text controls
      .replace(/[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ') // Various Unicode spaces to normal space
      .replace(/[\uFEFF]/g, '') // Byte order mark
      .trim();

    if (sanitized !== phone) {
      warnings.push('Removed Unicode formatting characters from phone number');
    }

    // Step 2: Remove common formatting characters but preserve + and digits
    sanitized = sanitized.replace(/[^\+\d\s\-\(\)\.]/g, '');

    // Step 3: Parse using libphonenumber-js for robust validation
    const parsedPhone = parsePhoneNumber(sanitized, defaultCountry as any);
    
    if (!parsedPhone) {
      return {
        success: false,
        originalPhone,
        warnings,
        error: `Unable to parse phone number "${sanitized}" with country ${defaultCountry}`
      };
    }

    // Step 4: Validate the parsed number
    if (!parsedPhone.isValid()) {
      return {
        success: false,
        originalPhone,
        warnings,
        error: `Invalid phone number format: ${parsedPhone.formatInternational()}`
      };
    }

    // Step 5: Get E.164 format (the canonical representation)
    const normalizedPhone = parsedPhone.format('E.164') as E164Number;

    // Step 6: Final validation using the library's validator
    if (!isValidPhoneNumber(normalizedPhone)) {
      return {
        success: false,
        originalPhone,
        warnings,
        error: `Normalized phone number ${normalizedPhone} failed final validation`
      };
    }

    return {
      success: true,
      normalizedPhone,
      originalPhone,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      success: false,
      originalPhone,
      warnings,
      error: `Phone normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validates if a phone number is already in normalized E.164 format
 * 
 * @param phone Phone number to validate
 * @returns boolean indicating if phone is in valid E.164 format
 */
export function isNormalizedPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // E.164 format must start with + and contain only digits after
  if (!/^\+\d{1,15}$/.test(phone)) {
    return false;
  }

  return isValidPhoneNumber(phone);
}

/**
 * Bulk normalize phone numbers for data migration
 * 
 * @param phones Array of phone numbers to normalize
 * @param defaultCountry Default country for parsing
 * @returns Array of normalization results
 */
export function bulkNormalizePhoneNumbers(
  phones: string[],
  defaultCountry: string = 'GB'
): PhoneNormalizationResult[] {
  return phones.map(phone => normalizePhoneNumber(phone, defaultCountry));
}

/**
 * Extract unique normalized phone numbers for deduplication
 * 
 * @param phones Array of phone numbers
 * @param defaultCountry Default country for parsing
 * @returns Array of unique normalized phone numbers (successful only)
 */
export function getUniqueNormalizedPhones(
  phones: string[],
  defaultCountry: string = 'GB'
): string[] {
  const normalized = new Set<string>();
  
  for (const phone of phones) {
    const result = normalizePhoneNumber(phone, defaultCountry);
    if (result.success && result.normalizedPhone) {
      normalized.add(result.normalizedPhone);
    }
  }
  
  return Array.from(normalized);
}