/**
 * Mobile number rules, kept in one place so every form behaves the same:
 * exactly ten digits, digits only, first digit 6-9 (Indian mobile).
 *
 * The server enforces the same rule in backend/src/validators/peopleValidators.js
 * (PHONE); this module only makes the input impossible to fill in wrongly.
 */
export const MOBILE_PATTERN = /^[6-9]\d{9}$/;
export const MOBILE_MESSAGE = 'Enter a 10-digit mobile number (digits only)';

/** Strip everything that is not a digit and never exceed `max` characters. */
export function digitsOnly(value, max = 10) {
  return String(value ?? '').replace(/\D/g, '').slice(0, max);
}

/** Spread onto an <input> to get a numeric, ten-digit mobile field. */
export const mobileInputProps = {
  type: 'tel',
  inputMode: 'numeric',
  autoComplete: 'tel',
  maxLength: 10,
  pattern: '[6-9][0-9]{9}',
};

export function isValidMobile(value) {
  return MOBILE_PATTERN.test(String(value ?? '').trim());
}
