import CryptoJS from 'crypto-js';

// We use the same AES key as the backend. In production, this should be properly populated.
// If EXPO_PUBLIC_SMS_ENCRYPTION_KEY is missing, we fall back to a 32-byte default key.
const SMS_AES_KEY = process.env.EXPO_PUBLIC_SMS_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';

export const smsCrypto = {
  /**
   * Encrypts the plaintext SMS payload using AES-256-CBC.
   * Returns a base64 encoded string containing the IV and the Ciphertext.
   */
  encrypt: (plaintext: string): string => {
    // Generate a random 16-byte Initialization Vector
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Parse the 32-byte key
    const key = CryptoJS.enc.Utf8.parse(SMS_AES_KEY);
    
    // Encrypt using AES-CBC with PKCS7 Padding
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Combine IV (in hex) and ciphertext (in base64) to transmit over SMS
    // E.g., YATRI_SOS_ENC|<iv_hex>|<ciphertext_base64>
    return `YATRI_SOS_ENC|${iv.toString(CryptoJS.enc.Hex)}|${encrypted.toString()}`;
  }
};
