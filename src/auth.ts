import { initializeApp } from 'firebase/app';
import {
  Auth, initializeAuth, inMemoryPersistence, indexedDBLocalPersistence, browserSessionPersistence,
  setPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, connectAuthEmulator
} from 'firebase/auth';
import {
  doc, getDocs, getDocFromServer, getDocsFromServer, collection, writeBatch, deleteField,
  terminate, clearIndexedDbPersistence, waitForPendingWrites
} from 'firebase/firestore';
import { auth, db, firebaseConfig, usingEmulators } from './firebase';
import { User, ChatMessage } from './types';

// How sign-in works
// - Every person has a Firebase Authentication account; Google stores the password hashed, so it is
//   never kept in (or readable from) the database.
// - The account's email is `<user id>+<random>@<auth domain>`. It's internal: never shown, never emailed.
// - usernames/{surname} maps the surname typed at login to that email.
// - users/{id}.authEmail records which account currently belongs to the person. Resetting a password
//   creates a new account and repoints authEmail, which cuts off the old password immediately
//   (firestore.rules only accepts the account named in authEmail).

export const MIN_PASSWORD_LENGTH = 6;
export const LEGACY_SESSION_KEY = 'vector_saved_user_id';
const SIGN_IN_NOTICE_KEY = 'vector_sign_in_notice';

/** Firebase requires 6+ character passwords; this fixed prefix lets existing short PINs keep working. */
export function toAuthPassword(password: string) {
  return `vector:${password}`;
}

export function usernameKey(username: string) {
  return username.trim().toLowerCase().replace(/\//g, '_');
}

export function userIdFromAuthEmail(email: string) {
  return email.split('@')[0].split('+')[0];
}

function newAuthEmail(userId: string) {
  return `${userId}+${Math.random().toString(36).slice(2, 10)}@${firebaseConfig.authDomain}`;
}

function codedError(code: string) {
  return Object.assign(new Error(code), { code });
}

function errorCode(err: unknown) {
  return (err as { code?: string })?.code || '';
}

// ---------------------------------------------------------------------------------------------
// Signing in and out

export type SignInProblem = 'invalid' | 'too-many-attempts' | 'offline' | 'unavailable';

export class SignInError extends Error {
  constructor(public problem: SignInProblem) {
    super(problem);
  }
}

function toSignInProblem(err: unknown): SignInProblem {
  const code = errorCode(err);
  if (code === 'auth/too-many-requests') return 'too-many-attempts';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'offline';
  if (code.startsWith('auth/') || code === 'permission-denied') return 'invalid';
  return 'unavailable';
}

export type SignInResult = { kind: 'secured' } | { kind: 'legacy'; user: User };

export async function signIn(username: string, password: string, rememberMe: boolean): Promise<SignInResult> {
  const key = usernameKey(username);
  if (!key || !password) throw new SignInError('invalid');
  try {
    const account = await getDocFromServer(doc(db, 'usernames', key));
    if (account.exists()) {
      await setPersistence(auth, rememberMe ? indexedDBLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, account.data().email, toAuthPassword(password));
      return { kind: 'secured' };
    }
    // Accounts not moved to Firebase Authentication yet still sign in the old way. This only works until
    // the secure database rules are published, because after that the user list can't be read signed out.
    const users = await getDocs(collection(db, 'users'));
    const user = users.docs.map(d => d.data() as User).find(u => u.username && usernameKey(u.username) === key);
    if (user && !user.authEmail && user.pin && user.pin === password) return { kind: 'legacy', user };
    throw new SignInError('invalid');
  } catch (err) {
    if (err instanceof SignInError) throw err;
    throw new SignInError(toSignInProblem(err));
  }
}

/** Message shown on the sign-in screen after the app signs someone out (e.g. their password was reset). */
export function setSignInNotice(text: string) {
  try { sessionStorage.setItem(SIGN_IN_NOTICE_KEY, text); } catch (e) {}
}

export function takeSignInNotice() {
  try {
    const text = sessionStorage.getItem(SIGN_IN_NOTICE_KEY);
    sessionStorage.removeItem(SIGN_IN_NOTICE_KEY);
    return text;
  } catch (e) {
    return null;
  }
}

/** True once every change made on this device has reached the server (gives up after `ms`). */
export function changesSynced(ms = 4000) {
  return Promise.race([
    waitForPendingWrites(db).then(() => true),
    new Promise<boolean>(resolve => setTimeout(() => resolve(false), ms))
  ]);
}

/** Sign out and wipe this device's offline copy of the data, so the next person on a shared phone or PC can't see it. */
export async function endSession() {
  try { await signOut(auth); } catch (e) {}
  try { localStorage.removeItem(LEGACY_SESSION_KEY); } catch (e) {}
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (err) {
    console.warn('Could not clear the offline copy of the data:', err);
  }
  window.location.reload();
}

// ---------------------------------------------------------------------------------------------
// Managing other people's sign-in (Team Management)

let accountAdminAuth: Auth | null = null;

// A second, in-memory Firebase connection, so creating someone else's account doesn't sign the admin out
function getAccountAdminAuth() {
  if (!accountAdminAuth) {
    const adminApp = initializeApp(firebaseConfig, 'account-admin');
    accountAdminAuth = initializeAuth(adminApp, { persistence: inMemoryPersistence });
    if (usingEmulators) connectAuthEmulator(accountAdminAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return accountAdminAuth;
}

async function createSignInAccount(userId: string, password: string) {
  const adminAuth = getAccountAdminAuth();
  const email = newAuthEmail(userId);
  await createUserWithEmailAndPassword(adminAuth, email, toAuthPassword(password));
  await signOut(adminAuth);
  return email;
}

async function assertUsernameFree(key: string, userId: string) {
  const existing = await getDocFromServer(doc(db, 'usernames', key));
  if (existing.exists() && existing.data().userId !== userId) throw codedError('username-taken');
}

export function accountErrorMessage(err: unknown) {
  const code = errorCode(err);
  if (code === 'auth/operation-not-allowed') return 'Email/Password sign-in is turned off for this Firebase project. Turn it on in the Firebase console (Authentication → Sign-in method), then try again.';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'No connection to Firebase. Check the internet connection and try again.';
  if (code === 'username-taken') return 'That username is already used by someone else.';
  if (code === 'username-required') return 'Every person needs a username (their surname) to sign in.';
  if (code === 'weak-password') return `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (code === 'permission-denied') return 'You do not have permission to make that change.';
  return 'Something went wrong. Please try again.';
}

export async function createStaffMember(profile: User, password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) throw codedError('weak-password');
  const key = usernameKey(profile.username);
  await assertUsernameFree(key, profile.id);
  const email = await createSignInAccount(profile.id, password);
  const { pin, balanceDue, ...fields } = profile;
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', profile.id), { ...fields, authEmail: email });
  batch.set(doc(db, 'usernames', key), { userId: profile.id, email });
  batch.set(doc(db, 'balances', profile.id), { balanceDue: 0 });
  await batch.commit();
}

/** Save profile edits; a new password (or a username change) also updates the person's sign-in. */
export async function updateStaffMember(user: User, changes: Partial<User>, newPassword?: string) {
  if (newPassword !== undefined && newPassword.length < MIN_PASSWORD_LENGTH) throw codedError('weak-password');
  const { pin, balanceDue, authEmail, ...profileChanges } = changes;
  const oldKey = usernameKey(user.username);
  const newKey = changes.username !== undefined ? usernameKey(changes.username) : oldKey;
  if (!newKey) throw codedError('username-required');
  if (newKey !== oldKey || (newPassword && !user.authEmail)) await assertUsernameFree(newKey, user.id);

  let email = user.authEmail;
  if (newPassword) email = await createSignInAccount(user.id, newPassword);

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.id), email !== user.authEmail ? { ...profileChanges, authEmail: email } : profileChanges);
  if (email) {
    if (newKey !== oldKey && user.authEmail) batch.delete(doc(db, 'usernames', oldKey));
    batch.set(doc(db, 'usernames', newKey), { userId: user.id, email });
  }
  await batch.commit();
}

export async function deleteStaffMember(user: User) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', user.id));
  batch.delete(doc(db, 'balances', user.id));
  if (user.authEmail) batch.delete(doc(db, 'usernames', usernameKey(user.username)));
  await batch.commit();
}

// ---------------------------------------------------------------------------------------------
// One-time switch-over from plain-text PINs (run by the CEO before publishing firestore.rules)

export interface SecureAccountsReport {
  secured: string[];
  needsPassword: { name: string; reason: string }[];
  // authEmail is recorded so the reminder can disappear once the password is reset (a reset changes it)
  weakPasswords: { id: string; name: string; authEmail: string }[];
}

const COMMON_PINS = new Set(['0000', '1111', '1234', '12345', '123456', '000000', 'password', 'admin']);
// SHA-256 of "surname:password" pairs that were published in this project's old demo data (src/data.ts)
const PUBLISHED_CREDENTIALS = new Set(['108e5766443428cf0c053becd32df0768c6bb590c0a2e1fed576073c16e77aa5']);

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isWeakPassword(user: User) {
  const pin = user.pin || '';
  if (pin.length < MIN_PASSWORD_LENGTH || COMMON_PINS.has(pin.toLowerCase()) || /^(.)\1+$/.test(pin)) return true;
  if (pin.toLowerCase() === usernameKey(user.username)) return true;
  return PUBLISHED_CREDENTIALS.has(await sha256Hex(`${usernameKey(user.username)}:${pin}`));
}

/**
 * Gives everyone a Firebase Authentication account with their current username and password, then
 * deletes every plain-text PIN and moves balances out of the staff directory. Safe to run again.
 * Needs the old open database rules (it reads the PINs), so run it just before publishing firestore.rules.
 */
export async function secureAllAccounts(): Promise<SecureAccountsReport> {
  const report: SecureAccountsReport = { secured: [], needsPassword: [], weakPasswords: [] };
  const snap = await getDocsFromServer(collection(db, 'users'));
  const users = snap.docs.map(d => ({ ...(d.data() as User), id: d.id }));
  const usernameOwners = new Map<string, User>();

  for (const user of users) {
    const key = user.username ? usernameKey(user.username) : '';
    let problem = '';
    if (!user.authEmail) {
      if (!user.pin) problem = 'No password on file';
      else if (!key) problem = 'No username';
      else if (usernameOwners.has(key)) problem = `Same username as ${usernameOwners.get(key)!.name}`;
      else if (!/^[a-z0-9_-]+$/.test(user.id)) problem = 'Account ID contains capital letters or symbols; re-create this person';
    }
    if (!user.authEmail && !problem) {
      try {
        await assertUsernameFree(key, user.id);
      } catch (err) {
        problem = 'Username already taken';
      }
    }
    if (key && !problem && !usernameOwners.has(key)) usernameOwners.set(key, user);

    let email: string | undefined;
    if (!user.authEmail && !problem) {
      email = await createSignInAccount(user.id, user.pin!);
      if (await isWeakPassword(user)) report.weakPasswords.push({ id: user.id, name: user.name, authEmail: email });
    }

    const batch = writeBatch(db);
    const userChanges: Record<string, unknown> = {};
    if (user.pin !== undefined) userChanges.pin = deleteField();
    if (typeof user.balanceDue === 'number') {
      userChanges.balanceDue = deleteField();
      batch.set(doc(db, 'balances', user.id), { balanceDue: user.balanceDue }, { merge: true });
    }
    if (email) {
      userChanges.authEmail = email;
      batch.set(doc(db, 'usernames', key), { userId: user.id, email });
    }
    if (Object.keys(userChanges).length > 0) batch.update(doc(db, 'users', user.id), userChanges);
    await batch.commit();

    if (user.authEmail || email) report.secured.push(user.name);
    else report.needsPassword.push({ name: user.name, reason: problem });
  }

  // Old chat messages saved without a recipient were shown in the General channel; label them so they stay there
  const messages = await getDocsFromServer(collection(db, 'messages'));
  const unlabelled = messages.docs.filter(d => !(d.data() as ChatMessage).recipientId);
  for (let i = 0; i < unlabelled.length; i += 400) {
    const batch = writeBatch(db);
    unlabelled.slice(i, i + 400).forEach(d => batch.update(d.ref, { recipientId: 'general' }));
    await batch.commit();
  }

  return report;
}

/** Whether the secure database rules are live: true/false, or null if it can't be checked (offline). */
export async function secureRulesPublished(): Promise<boolean | null> {
  try {
    // Only the old open rules allow reading this (non-existent) document
    await getDocFromServer(doc(db, 'system', 'rules-check'));
    return false;
  } catch (err) {
    return errorCode(err) === 'permission-denied' ? true : null;
  }
}
