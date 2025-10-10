/**
 * Amount Validation Utility
 * 
 * Provides comprehensive validation for user-provided token amounts
 * to protect against invalid inputs, precision loss, and overflow attacks.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Maximum amount to prevent overflow attacks
const MAX_AMOUNT = 1e30;

// Minimum amount to prevent dust attacks
const MIN_AMOUNT = 1e-18;

/**
 * Remove commas from formatted number strings
 */
export const removeCommas = (value: string): string => {
  return value.replace(/,/g, '');
};

/**
 * Validate token amount input
 * 
 * @param amount - The amount string to validate
 * @param decimals - The token's decimal places
 * @returns ValidationResult with valid flag and optional error message
 */
export const validateAmount = (
  amount: string,
  decimals: number
): ValidationResult => {
  // Allow empty string (user is still typing)
  if (amount === '') {
    return { valid: true };
  }

  // Remove commas for validation
  const cleaned = removeCommas(amount);

  // Check for basic number format
  if (!/^\d*\.?\d*$/.test(cleaned)) {
    return { valid: false, error: 'Invalid number format' };
  }

  // If just a decimal point, allow it (user is typing)
  if (cleaned === '.') {
    return { valid: true };
  }

  // Parse the number
  const num = parseFloat(cleaned);

  // Check for valid number
  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number' };
  }

  // Check for finite number (no Infinity)
  if (!isFinite(num)) {
    return { valid: false, error: 'Number is too large' };
  }

  // Check for negative or zero
  if (num <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }

  // Check for minimum amount (prevent dust)
  if (num < MIN_AMOUNT) {
    return { valid: false, error: 'Amount too small' };
  }

  // Check for reasonable upper bound
  if (num > MAX_AMOUNT) {
    return { valid: false, error: 'Amount exceeds maximum limit' };
  }

  // Check decimal places don't exceed token decimals
  const decimalPlaces = (cleaned.split('.')[1] || '').length;
  if (decimalPlaces > decimals) {
    return {
      valid: false,
      error: `Maximum ${decimals} decimal places allowed`,
    };
  }

  return { valid: true };
};

/**
 * Validate amount before transaction submission
 * More strict validation for final submission
 * 
 * @param amount - The amount string to validate
 * @param decimals - The token's decimal places
 * @param balance - Optional user balance to check against
 * @returns ValidationResult with valid flag and optional error message
 */
export const validateAmountStrict = (
  amount: string,
  decimals: number,
  balance?: bigint
): ValidationResult => {
  // Remove commas
  const cleaned = removeCommas(amount);

  // Empty string is invalid for submission
  if (cleaned === '' || cleaned === '.') {
    return { valid: false, error: 'Amount is required' };
  }

  // Run standard validation
  const standardValidation = validateAmount(amount, decimals);
  if (!standardValidation.valid) {
    return standardValidation;
  }

  // Parse the number
  const num = parseFloat(cleaned);

  // Check for zero (already checked in standard, but double-check)
  if (num === 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  // Check against balance if provided
  if (balance !== undefined) {
    try {
      // Convert amount to wei/smallest unit for comparison
      const amountWei = BigInt(Math.floor(num * Math.pow(10, decimals)));
      
      if (amountWei > balance) {
        return { valid: false, error: 'Insufficient balance' };
      }
    } catch (error) {
      return { valid: false, error: 'Invalid amount for token decimals' };
    }
  }

  return { valid: true };
};

/**
 * Format number with commas for display
 * Preserves decimal places
 */
export const formatNumberWithCommas = (value: string): string => {
  if (!value) return '';
  
  const cleaned = removeCommas(value);
  const parts = cleaned.split('.');
  
  // Format integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return parts.join('.');
};

/**
 * Sanitize amount input
 * Removes invalid characters and enforces format
 */
export const sanitizeAmount = (value: string): string => {
  // Remove commas
  let cleaned = removeCommas(value);
  
  // Remove any non-digit, non-decimal characters
  cleaned = cleaned.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Remove leading zeros (but keep single zero before decimal)
  if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '');
  }
  
  return cleaned;
};

