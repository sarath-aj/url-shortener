// Base62 encoding: 0-9, a-z, A-Z (62 characters)
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a random base62 string of specified length
 * @param {number} length - Length of the generated string
 * @returns {string} - Random base62 string
 */
const generateBase62 = (length = 6) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * BASE62_CHARS.length);
    result += BASE62_CHARS[randomIndex];
  }
  return result;
};

/**
 * Encode a number to base62
 * @param {number} num - Number to encode
 * @returns {string} - Base62 encoded string
 */
const encodeBase62 = (num) => {
  if (num === 0) return BASE62_CHARS[0];
  
  let result = '';
  while (num > 0) {
    result = BASE62_CHARS[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
};

/**
 * Decode a base62 string to number
 * @param {string} str - Base62 string to decode
 * @returns {number} - Decoded number
 */
const decodeBase62 = (str) => {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE62_CHARS.indexOf(char);
    if (value === -1) throw new Error('Invalid base62 character');
    result = result * 62 + value;
  }
  return result;
};

/**
 * Check if a string is valid base62
 * @param {string} str - String to validate
 * @returns {boolean} - True if valid base62
 */
const isValidBase62 = (str) => {
  if (!str || typeof str !== 'string') return false;
  return str.split('').every(char => BASE62_CHARS.includes(char));
};

module.exports = {
  generateBase62,
  encodeBase62,
  decodeBase62,
  isValidBase62
};