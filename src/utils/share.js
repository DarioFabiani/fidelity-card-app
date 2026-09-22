import {
  deriveKey, encryptJSON, decryptJSON, generateSalt, bufferToBase64, base64ToBuffer,
  PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS
} from './crypto';
import { normalizeColor } from './color';
import { normalizeFormat } from '../constants/barcodeFormats';

// Excludes characters that are easily confused when read aloud or copied by
// hand: 0/O, 1/I/L, 5/S, 8/B. 28 symbols, 8 of them -> ~38 bits.
const CODE_ALPHABET = '2346789ACDEFGHJKMNPQRTUVWXYZ';
const CODE_LENGTH = 8;

/**
 * Share code used to derive the link's encryption key.
 *
 * Uses crypto.getRandomValues, not Math.random: the shared link is public, so
 * an attacker holds the ciphertext and can brute-force offline with no rate
 * limiting. A 6-digit PIN from a predictable PRNG (V8's Math.random is
 * xorshift128+, not a CSPRNG) falls in seconds on a GPU; this keeps the
 * search space out of reach while staying dictatable over the phone.
 *
 * Rejection sampling keeps the distribution uniform — taking a raw byte mod 28
 * would make the first few letters more likely than the rest.
 */
function generateShareCode() {
  const max = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  let code = '';
  while (code.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
    for (const byte of bytes) {
      if (byte < max && code.length < CODE_LENGTH) {
        code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      }
    }
  }
  return code;
}

function toBase64Url(value) {
  return value.replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Back to standard base64. Links made before the switch contain '+' and '/'
 * already, and those characters never appear in base64url — so the two
 * alphabets are disjoint and this one function reads both formats.
 */
function fromBase64Url(value) {
  return value.replace(/-/g, '+').replace(/_/g, '/');
}

// A link is `salt.sealed.iterations`. Links made before the count was part
// of it are `salt.sealed` and used the legacy count. The bounds keep a
// hand-crafted link from freezing the page on key derivation.
const MIN_LINK_ITERATIONS = 10000;
const MAX_LINK_ITERATIONS = 5000000;

/** Splits a data param into its parts, or null if it has no valid shape. */
function parseShareData(dataParam) {
  if (typeof dataParam !== 'string' || !dataParam) return null;
  const parts = dataParam.split('.');
  if (parts.length !== 2 && parts.length !== 3) return null;
  const [salt, sealed, count] = parts;
  if (!salt || !sealed) return null;
  let iterations = LEGACY_PBKDF2_ITERATIONS;
  if (parts.length === 3) {
    if (!/^[0-9]+$/.test(count)) return null;
    iterations = Number(count);
    if (iterations < MIN_LINK_ITERATIONS || iterations > MAX_LINK_ITERATIONS) return null;
  }
  return { salt, sealed, iterations };
}

/**
 * Whether the link carries its iteration count, as every link made by this
 * version does. One that does not is either an older link or — much more
 * likely — one cut short, since truncation removes the count first.
 */
export function hasIterationCount(dataParam) {
  return typeof dataParam === 'string' && dataParam.split('.').length === 3;
}

/** Groups the code in two blocks so it is easier to read out: ABCD-EFGH. */
export function formatShareCode(code) {
  return code.length === CODE_LENGTH
    ? `${code.slice(0, 4)}-${code.slice(4)}`
    : code;
}

/** Accepts the code however the recipient typed it: spaces, dashes, lowercase. */
function normalizeShareCode(input) {
  return (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Cache of the {url, code} pairs handed out during this session.
 *
 * The pair has to stay stable: the link carries the ciphertext and there is no
 * server, so nothing can be revoked — a link already sent stays openable
 * forever with the code it was created with. Handing out a fresh code on
 * reopen would show the sender a code that does not belong to the link they
 * already sent, and the recipient would have no way to tell.
 *
 * Keyed by id + updatedAt so editing a card naturally retires its stale link,
 * and by whether the notes are included — those are two different links.
 * Memory only, never persisted: the code is the secret guarding a public
 * ciphertext, and writing it to disk would outlive the vault lock.
 */
const shareLinks = new Map();

/** Forgets every code handed out: called when the vault locks. */
export function clearShareLinks() {
  shareLinks.clear();
}

export async function getShareLink(card, { includeNotes = false } = {}) {
  const key = `${card.id}:${card.updatedAt ?? ''}:${includeNotes ? 'notes' : ''}`;
  const cached = shareLinks.get(key);
  if (cached) return cached;

  const fresh = await encodeCardForShare(card, { includeNotes });
  shareLinks.set(key, fresh);
  return fresh;
}

/**
 * Builds a shareable link for a card. The card payload is encrypted with
 * AES-256-GCM under a key derived (PBKDF2) from a freshly generated random
 * code, so anyone who only intercepts the link cannot read the card data —
 * the code must be communicated separately (voice, another message, ...).
 * Returns both the URL (salt + ciphertext, base64) and the code to share
 * out of band.
 */
export async function encodeCardForShare(card, { includeNotes = true } = {}) {
  const payload = {
    p: card.providerName,
    n: card.cardNumber,
    f: card.barcodeFormat,
    c: card.color,
    // Notes are personal ("PIN 1234", "tessera di mamma"): they travel only
    // when the sender says so.
    t: includeNotes ? card.notes || '' : ''
  };

  const code = generateShareCode();
  const salt = generateSalt();
  const key = await deriveKey(code, salt, PBKDF2_ITERATIONS);
  const sealed = await encryptJSON(payload, key);

  // base64url: standard base64 puts '+' and '/' in the string, which any
  // URLSearchParams-based reader would mangle ('+' becomes a space) and mail
  // clients like to re-encode. Swapping them keeps the link intact through
  // naive parsers, and costs nothing to reverse on the way in.
  const combined = `${toBase64Url(`${bufferToBase64(salt)}.${sealed}`)}.${PBKDF2_ITERATIONS}`;
  const base = window.location.origin + '/fidelity-card-app/';
  return { url: `${base}shared?data=${combined}`, code };
}

/**
 * Reverses encodeCardForShare(). Needs the code the sender communicated
 * separately, in whatever shape the recipient typed it. Returns null if the
 * data param is malformed, or if the code is wrong (AES-GCM authentication
 * failure surfaces as a decrypt rejection).
 */
export async function decodeSharedCard(dataParam, code) {
  const secret = normalizeShareCode(code);
  const parsed = parseShareData(dataParam);
  if (!parsed || !secret) return null;

  const saltB64 = fromBase64Url(parsed.salt);
  const sealed = fromBase64Url(parsed.sealed);

  try {
    const salt = base64ToBuffer(saltB64);
    const key = await deriveKey(secret, salt, parsed.iterations);
    const payload = await decryptJSON(sealed, key);
    // Decrypting proves who made the link, not what they put in it: the
    // fields are checked like any other outside input.
    if (!payload || typeof payload.p !== 'string' || !payload.p || typeof payload.n !== 'string' || !payload.n) {
      return null;
    }
    return {
      providerName: payload.p,
      cardNumber: payload.n,
      barcodeFormat: normalizeFormat(payload.f),
      color: normalizeColor(payload.c),
      notes: typeof payload.t === 'string' ? payload.t : ''
    };
  } catch {
    return null;
  }
}

// Sizes the encoder always produces, used to tell a truncated link from a
// wrong code: 16-byte salt, then at least a 12-byte IV plus the 16-byte
// GCM tag before any payload.
const SALT_B64_LENGTH = 24;   // 16 bytes in base64, including padding
const MIN_SEALED_BYTES = 12 + 16;

/**
 * Checks whether a data param has the shape produced by encodeCardForShare
 * (salt + '.' + ciphertext, plus '.' + iterations on current links),
 * without needing the code.
 *
 * Deliberately stricter than "there is a dot in it": a link cut short by a
 * chat client still contains the separator, and reporting that as a wrong
 * code sends the recipient off re-typing a code that was right all along.
 */
export function isValidShareData(dataParam) {
  const parsed = parseShareData(dataParam);
  if (!parsed) return false;

  const { salt, sealed } = parsed;
  if (salt.length !== SALT_B64_LENGTH) return false;

  // base64 carries 3 bytes per 4 characters; anything shorter than IV+tag
  // cannot be a complete sealed payload.
  if (Math.floor(sealed.length / 4) * 3 < MIN_SEALED_BYTES) return false;

  try {
    base64ToBuffer(fromBase64Url(salt));
    base64ToBuffer(fromBase64Url(sealed));
  } catch {
    return false;
  }
  return true;
}

export async function shareCard(card, shareData) {
  const { url, code } = shareData || (await encodeCardForShare(card));

  if (navigator.share) {
    try {
      // The code is deliberately NOT included here. Putting it in the same
      // message as the link would hand both halves to the same chat, which is
      // exactly what the separate channel is meant to prevent.
      await navigator.share({
        title: `Carta ${card.providerName}`,
        text: `Ecco la mia carta fedeltà ${card.providerName}`,
        url
      });
      return { success: true, method: 'share', code };
    } catch (err) {
      // Aborting is a deliberate user action, so it stays silent. Anything
      // else (NotAllowedError, ...) is a real failure the caller must report,
      // otherwise the button looks dead.
      if (err.name === 'AbortError') return { success: false, method: 'cancelled' };
      return { success: false, method: 'error', url, code };
    }
  }

  return { success: false, method: 'fallback', url, code };
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}
