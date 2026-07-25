// Web Crypto API helpers for AES-256-GCM encryption with a PBKDF2-derived key.
// No external crypto libraries are used — everything relies on `crypto.subtle`,
// which is available in all modern browsers under a secure context (https / localhost).

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const AES_KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes, recommended size for AES-GCM

/**
 * Generates a cryptographically random salt, suitable for PBKDF2.
 * The salt is not secret and can be stored/transmitted in the clear
 * alongside the ciphertext it protects.
 */
export function generateSalt(length = SALT_LENGTH) {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generates a fresh random IV for a single AES-GCM encryption operation.
 * An IV must never be reused with the same key.
 */
export function generateIV() {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/** Converts an ArrayBuffer/TypedArray to a base64 string. */
export function bufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Converts a base64 string back into a Uint8Array. */
export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives an AES-256-GCM CryptoKey from a password and salt using PBKDF2-SHA256
 * with 100000 iterations. The password itself is never stored anywhere — only
 * the derived, non-extractable CryptoKey is kept in memory by the caller.
 */
export async function deriveKey(password, saltBytes) {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH
    },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a JSON-serializable value with AES-256-GCM under the given key.
 * A fresh random IV is generated for every call and prepended to the
 * ciphertext; the whole thing is returned as a single base64 string so it's
 * easy to store in IndexedDB or embed in a URL query parameter.
 */
export async function encryptJSON(obj, key) {
  const iv = generateIV();
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bufferToBase64(combined);
}

/**
 * Reverses encryptJSON(). If the key is wrong (wrong password/PIN) or the
 * payload was tampered with, AES-GCM authentication fails and
 * `crypto.subtle.decrypt` rejects — the rejection propagates to the caller
 * so it can be handled cleanly (e.g. "wrong password") instead of silently
 * returning garbage.
 */
export async function decryptJSON(payload, key) {
  const combined = base64ToBuffer(payload);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
}
