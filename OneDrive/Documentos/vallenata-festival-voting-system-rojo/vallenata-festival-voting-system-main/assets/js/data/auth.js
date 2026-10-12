import { getState, persist, newId, getSessionUserId, setSessionUserId } from "./storage.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 2 * 60 * 1000;
const ATTEMPTS_KEY = "fvl-voting-prototype:sign-in-attempts";
const SIGN_IN_ERROR = "El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.";

export function currentUser() {
  const userId = getSessionUserId();
  if (!userId) return null;
  return getState().users.find((user) => user.id === userId && user.active) ?? null;
}

async function hashPassword(salt, password) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readAttempts() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeAttempts(attempts) {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch {
    // Without storage the lock only lasts for the current page.
  }
}

function lockRemainingMs(email, now = Date.now()) {
  const record = readAttempts()[email.trim().toLowerCase()];
  return record?.lockedUntil && record.lockedUntil > now ? record.lockedUntil - now : 0;
}

function registerFailure(email) {
  const attempts = readAttempts();
  const record = attempts[email] ?? { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.count = 0;
    record.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }
  attempts[email] = record;
  writeAttempts(attempts);
  return MAX_FAILED_ATTEMPTS - record.count;
}

function clearFailures(email) {
  const attempts = readAttempts();
  delete attempts[email];
  writeAttempts(attempts);
}

export function validateRegistration({ name, email, password, privacy }) {
  const errors = {};
  if (name.trim().length < 3) errors.name = "Escribe tu nombre completo, con al menos 3 caracteres.";
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (!privacy) errors.privacy = "Para crear la cuenta debes aceptar el tratamiento de datos personales.";
  return errors;
}

export async function registerUser({ name, email, password, privacy }) {
  const errors = validateRegistration({ name, email, password, privacy });
  const normalizedEmail = email.trim().toLowerCase();
  const { users } = getState();
  if (!errors.email && users.some((user) => user.email === normalizedEmail)) {
    errors.email = "Ya existe una cuenta con este correo. Ingresa o usa otro correo.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const passwordSalt = newId("salt");
  const now = Date.now();
  const user = {
    id: newId("user"),
    name: name.trim(),
    email: normalizedEmail,
    passwordSalt,
    passwordHash: await hashPassword(passwordSalt, password),
    role: "voter",
    active: true,
    createdAt: now,
    privacyAcceptedAt: now,
  };
  users.push(user);
  persist();
  return { ok: true, user };
}

function lockMessage(lockedFor) {
  const minutes = Math.ceil(lockedFor / 60000);
  return `Por seguridad, el ingreso con este correo está bloqueado. Inténtalo de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
}

export async function signIn(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (lockRemainingMs(normalizedEmail) > 0) return { ok: false, error: lockMessage(lockRemainingMs(normalizedEmail)) };

  const user = getState().users.find((candidate) => candidate.email === normalizedEmail);
  const matches = user?.active && (await hashPassword(user.passwordSalt, password)) === user.passwordHash;
  if (!matches) {
    const remaining = registerFailure(normalizedEmail);
    if (lockRemainingMs(normalizedEmail) > 0) return { ok: false, error: lockMessage(lockRemainingMs(normalizedEmail)) };
    const hint = remaining <= 2 ? ` Te ${remaining === 1 ? "queda 1 intento" : `quedan ${remaining} intentos`} antes de un bloqueo temporal.` : "";
    return { ok: false, error: SIGN_IN_ERROR + hint };
  }
  clearFailures(normalizedEmail);
  setSessionUserId(user.id);
  return { ok: true, user };
}

export function signOut() {
  setSessionUserId(null);
}
