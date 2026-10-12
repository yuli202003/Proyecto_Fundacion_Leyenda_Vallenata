import { buildSeed, SCHEMA_VERSION } from "./seed.js";

const STATE_KEY = "fvl-voting-prototype:state";
const SESSION_KEY = "fvl-voting-prototype:session";
const GUEST_KEY = "fvl-voting-prototype:guest";
const DEMO_LIFETIME_MS = 14 * 24 * 3600 * 1000;
const AUDIT_LIMIT = 60;

let cache = null;

function readStored() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isStale(state, now) {
  return state.version !== SCHEMA_VERSION || now - state.seededAt > DEMO_LIFETIME_MS;
}

export function persist() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(cache));
  } catch {
    // Storage can be blocked in private windows; the state then lives in memory for the page.
  }
}

export function getState() {
  if (cache) return cache;
  const now = Date.now();
  const stored = readStored();
  cache = stored && !isStale(stored, now) ? stored : buildSeed(now);
  persist();
  return cache;
}

export function resetDemoData() {
  cache = buildSeed(Date.now());
  persist();
  sessionStorage.removeItem(SESSION_KEY);
}

export function newId(prefix) {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}-${random[0].toString(36)}${random[1].toString(36)}`;
}

export function newReceiptCode() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  return `FVL-${random.toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
}

export function logAudit(actor, action, target) {
  const { audit } = getState();
  audit.unshift({ id: newId("audit"), at: Date.now(), actor, action, target });
  audit.length = Math.min(audit.length, AUDIT_LIMIT);
}

export function getSessionUserId() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(userId) {
  if (userId) sessionStorage.setItem(SESSION_KEY, userId);
  else sessionStorage.removeItem(SESSION_KEY);
}

export function getGuestId() {
  let guestId = localStorage.getItem(GUEST_KEY);
  if (!guestId) {
    guestId = newId("guest");
    localStorage.setItem(GUEST_KEY, guestId);
  }
  return guestId;
}
