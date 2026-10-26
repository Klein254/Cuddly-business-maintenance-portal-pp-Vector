// Security rule tests. Run with the Firestore emulator: npm run test:rules (needs the Firebase CLI and Java).
import { test, describe, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, writeBatch, increment
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// Each test passes if the request is allowed / denied by firestore.rules
const allowed = (request: Promise<unknown>) => assertSucceeds(request).then(() => {});
const denied = (request: Promise<unknown>) => assertFails(request).then(() => {});

const DOMAIN = 'demo-vector.firebaseapp.com';
const authEmail = (userId: string, suffix = 'a1') => `${userId}+${suffix}@${DOMAIN}`;

const STAFF: Record<string, { role: string; name: string; username: string }> = {
  ceo: { role: 'super-admin', name: 'Ray Ceo', username: 'Ceo' },
  proc: { role: 'head-procurement', name: 'Sarah Proc', username: 'Proc' },
  adm: { role: 'admin', name: 'Marcus Adm', username: 'Adm' },
  fin: { role: 'finance', name: 'Fiona Fin', username: 'Fin' },
  tech: { role: 'employee', name: 'Carlos Tech', username: 'Tech' },
  tech2: { role: 'employee', name: 'Kiara Tech', username: 'Techtwo' }
};

const job = (id: string, assignedUserId: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, title: `Job ${id}`, description: '', category: 'maintenance', assignedUserId, assignedUserName: STAFF[assignedUserId].name,
  locationName: 'Site', status, priority: 'medium', startedAt: status === 'pending' ? null : 't0', completedAt: null,
  loggedMaterials: [], signature: null, statusHistory: [{ status, timestamp: 't0' }], payoutAmount: 50, ...extra
});

let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-vector-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    for (const [id, s] of Object.entries(STAFF)) {
      await setDoc(doc(db, 'users', id), { id, ...s, email: '', phone: '', position: 'Staff', avatarColor: 'x', authEmail: authEmail(id) });
      await setDoc(doc(db, 'usernames', s.username.toLowerCase()), { userId: id, email: authEmail(id) });
      await setDoc(doc(db, 'balances', id), { balanceDue: 100 });
      await setDoc(doc(db, 'staffPasswords', id), { password: `${id}-secret`, updatedAt: 't0' });
    }
    await setDoc(doc(db, 'jobs', 'j1'), job('j1', 'tech', 'in-progress'));
    await setDoc(doc(db, 'jobs', 'j2'), job('j2', 'tech2', 'pending'));
    await setDoc(doc(db, 'jobs', 'jpending'), job('jpending', 'tech', 'pending'));
    await setDoc(doc(db, 'jobs', 'jdone'), job('jdone', 'tech', 'completed', { credited: true }));
    await setDoc(doc(db, 'jobs', 'jold'), job('jold', 'tech', 'completed')); // completed before the "credited" flag existed
    await setDoc(doc(db, 'shifts', 's1'), { id: 's1', userId: 'tech', date: '2026-10-25', startTime: '08:00', endTime: '16:30', type: 'normal' });
    await setDoc(doc(db, 'shifts', 's2'), { id: 's2', userId: 'tech2', date: '2026-10-25', startTime: '08:00', endTime: '16:30', type: 'normal' });
    await setDoc(doc(db, 'clockLogs', 'l1'), { id: 'l1', userId: 'tech', userName: 'Carlos Tech', clockInTime: 't0', clockOutTime: null, totalHours: null, overtimeHours: null, calculatedPay: null, verified: false });
    await setDoc(doc(db, 'clockLogs', 'l2'), { id: 'l2', userId: 'tech2', userName: 'Kiara Tech', clockInTime: 't0', clockOutTime: null, totalHours: null, overtimeHours: null, calculatedPay: null, verified: false });
    const notif = (id: string, recipientUserId: string) => ({ id, title: 't', message: 'm', timestamp: 't0', recipientUserId, recipientUserName: 'x', isSent: true, type: 'system' });
    await setDoc(doc(db, 'notifications', 'n-tech'), notif('n-tech', 'tech'));
    await setDoc(doc(db, 'notifications', 'n-all'), notif('n-all', 'all'));
    await setDoc(doc(db, 'notifications', 'n-tech2'), notif('n-tech2', 'tech2'));
    await setDoc(doc(db, 'notifications', 'n-admins'), notif('n-admins', 'admins'));
    const msg = (id: string, senderId: string, recipientId: string) => ({ id, senderId, senderName: STAFF[senderId].name, senderRole: STAFF[senderId].role, recipientId, content: 'hi', timestamp: 't0' });
    await setDoc(doc(db, 'messages', 'm-general'), msg('m-general', 'tech2', 'general'));
    await setDoc(doc(db, 'messages', 'm-tech-to-tech2'), msg('m-tech-to-tech2', 'tech', 'tech2'));
    await setDoc(doc(db, 'messages', 'm-tech2-to-ceo'), msg('m-tech2-to-ceo', 'tech2', 'ceo'));
    await setDoc(doc(db, 'messages', 'm-ceo-to-tech'), msg('m-ceo-to-tech', 'ceo', 'tech'));
  });
});

const as = (userId: string, suffix = 'a1'): Firestore =>
  env.authenticatedContext(`auth-${userId}-${suffix}`, { email: authEmail(userId, suffix) }).firestore() as unknown as Firestore;
const signedOut = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;
const mine = (db: Firestore, name: string, field: string, value: string) => getDocs(query(collection(db, name), where(field, '==', value)));

describe('signed out', () => {
  test('can look up a single username to sign in', () => allowed(getDoc(doc(signedOut(), 'usernames', 'tech'))));
  test('cannot list usernames', () => denied(getDocs(collection(signedOut(), 'usernames'))));
  test('cannot read the staff list', () => denied(getDocs(collection(signedOut(), 'users'))));
  test('cannot read a staff record', () => denied(getDoc(doc(signedOut(), 'users', 'tech'))));
  test('cannot read jobs', () => denied(getDocs(collection(signedOut(), 'jobs'))));
  test('cannot read messages', () => denied(getDocs(collection(signedOut(), 'messages'))));
  test('cannot create a staff record', () => denied(setDoc(doc(signedOut(), 'users', 'evil'), { id: 'evil', role: 'super-admin' })));
  test('cannot read the rules probe', () => denied(getDoc(doc(signedOut(), 'system', 'rules-check'))));
});

describe('accounts that are not (or no longer) the person\'s sign-in', () => {
  test('a look-alike account email is refused', async () => {
    const db = env.authenticatedContext('stranger', { email: authEmail('ceo', 'evil') }).firestore() as unknown as Firestore;
    await denied(getDocs(collection(db, 'users')));
  });
  test('an account without an email is refused', async () => {
    const db = env.authenticatedContext('anon').firestore() as unknown as Firestore;
    await denied(getDocs(collection(db, 'users')));
  });
  test('after a password reset the old account is cut off and the new one works', async () => {
    const proc = as('proc');
    const batch = writeBatch(proc);
    batch.update(doc(proc, 'users', 'tech'), { authEmail: authEmail('tech', 'b2') });
    batch.set(doc(proc, 'usernames', 'tech'), { userId: 'tech', email: authEmail('tech', 'b2') });
    await allowed(batch.commit());
    await denied(getDocs(collection(as('tech', 'a1'), 'users')));
    await allowed(getDocs(collection(as('tech', 'b2'), 'users')));
  });
});

describe('technician', () => {
  const tech = () => as('tech');

  test('reads the staff directory', () => allowed(getDocs(collection(tech(), 'users'))));
  test('reads own jobs', () => allowed(mine(tech(), 'jobs', 'assignedUserId', 'tech')));
  test('cannot read all jobs', () => denied(getDocs(collection(tech(), 'jobs'))));
  test("cannot read a colleague's job", () => denied(getDoc(doc(tech(), 'jobs', 'j2'))));
  test('reads own shifts', () => allowed(mine(tech(), 'shifts', 'userId', 'tech')));
  test('cannot read all shifts', () => denied(getDocs(collection(tech(), 'shifts'))));
  test('reads own clock logs', () => allowed(mine(tech(), 'clockLogs', 'userId', 'tech')));
  test("cannot read a colleague's clock log", () => denied(getDoc(doc(tech(), 'clockLogs', 'l2'))));
  test('reads own balance', () => allowed(getDoc(doc(tech(), 'balances', 'tech'))));
  test("cannot read a colleague's balance", () => denied(getDoc(doc(tech(), 'balances', 'tech2'))));
  test('cannot list balances', () => denied(getDocs(collection(tech(), 'balances'))));
  test('reads own notifications', () => allowed(mine(tech(), 'notifications', 'recipientUserId', 'tech')));
  test('reads company-wide notifications', () => allowed(mine(tech(), 'notifications', 'recipientUserId', 'all')));
  test('cannot read all notifications', () => denied(getDocs(collection(tech(), 'notifications'))));
  test("cannot read a colleague's notification", () => denied(getDoc(doc(tech(), 'notifications', 'n-tech2'))));
  test('reads the General channel', () => allowed(mine(tech(), 'messages', 'recipientId', 'general')));
  test('reads messages sent to them', () => allowed(mine(tech(), 'messages', 'recipientId', 'tech')));
  test('reads messages they sent', () => allowed(mine(tech(), 'messages', 'senderId', 'tech')));
  test('cannot read all messages', () => denied(getDocs(collection(tech(), 'messages'))));
  test("cannot read other people's direct messages", () => denied(getDoc(doc(tech(), 'messages', 'm-tech2-to-ceo'))));

  test('updates own presence and read receipts', () => allowed(updateDoc(doc(tech(), 'users', 'tech'), {
    isOnline: true, lastActiveUpdatedAt: 't1', lastReadMessagesAt: { general: 't1' }, themePreference: 'high-contrast'
  })));
  test('cannot change own role', () => denied(updateDoc(doc(tech(), 'users', 'tech'), { role: 'super-admin' })));
  test('cannot change own sign-in', () => denied(updateDoc(doc(tech(), 'users', 'tech'), { authEmail: authEmail('tech', 'zz') })));
  test('cannot assign vehicles', () => denied(updateDoc(doc(tech(), 'users', 'tech'), { vehicleNumber: 'KDA 001' })));
  test("cannot edit a colleague's presence", () => denied(updateDoc(doc(tech(), 'users', 'tech2'), { isOnline: false })));
  test('cannot put a password back on a staff record', () => denied(updateDoc(doc(tech(), 'users', 'tech'), { pin: '0000' })));

  test('clocks in', () => allowed(setDoc(doc(tech(), 'clockLogs', 'l3'), {
    id: 'l3', userId: 'tech', userName: 'Carlos Tech', clockInTime: 't1', clockOutTime: null, totalHours: null, overtimeHours: null, calculatedPay: null, verified: false
  })));
  test('cannot clock in a colleague', () => denied(setDoc(doc(tech(), 'clockLogs', 'l3'), {
    id: 'l3', userId: 'tech2', userName: 'Kiara Tech', clockInTime: 't1', clockOutTime: null, verified: false
  })));
  test('cannot create a pre-verified log', () => denied(setDoc(doc(tech(), 'clockLogs', 'l3'), {
    id: 'l3', userId: 'tech', userName: 'Carlos Tech', clockInTime: 't1', clockOutTime: null, verified: true
  })));
  test('clocks out', () => allowed(updateDoc(doc(tech(), 'clockLogs', 'l1'), {
    clockOutTime: 't2', totalHours: 8.5, overtimeHours: 0.5, calculatedPay: 0
  })));
  test('cannot verify own timesheet', () => denied(updateDoc(doc(tech(), 'clockLogs', 'l1'), { verified: true })));
  test("cannot clock out a colleague", () => denied(updateDoc(doc(tech(), 'clockLogs', 'l2'), { clockOutTime: 't2' })));

  test('moves own job to the next step', () => allowed(updateDoc(doc(tech(), 'jobs', 'jpending'), {
    status: 'on-site', startedAt: 't1', statusHistory: [{ status: 'pending', timestamp: 't0' }, { status: 'on-site', timestamp: 't1' }]
  })));
  test('cannot skip straight to completed', () => denied(updateDoc(doc(tech(), 'jobs', 'jpending'), { status: 'completed' })));
  test("cannot update a colleague's job", () => denied(updateDoc(doc(tech(), 'jobs', 'j2'), { status: 'on-site' })));
  test('cannot change the payout', () => denied(updateDoc(doc(tech(), 'jobs', 'j1'), { payoutAmount: 5000 })));

  const complete = (db: Firestore, jobId: string, amount: number, credited = true) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'jobs', jobId), { status: 'completed', completedAt: 't3', credited, signature: 'C. Tech' });
    batch.set(doc(db, 'balances', 'tech'), { balanceDue: increment(amount), lastCreditedJobId: jobId }, { merge: true });
    return batch.commit();
  };
  test('completing a job credits exactly its payout', async () => {
    await allowed(complete(tech(), 'j1', 50));
    let balanceDue: unknown;
    await env.withSecurityRulesDisabled(async ctx => {
      balanceDue = (await getDoc(doc(ctx.firestore(), 'balances', 'tech'))).data()?.balanceDue;
    });
    if (balanceDue !== 150) throw new Error(`expected 150, got ${balanceDue}`);
  });
  test('cannot credit more than the payout', () => denied(complete(tech(), 'j1', 500)));
  test('cannot credit without completing a job', () => denied(setDoc(doc(tech(), 'balances', 'tech'), { balanceDue: increment(50), lastCreditedJobId: 'j1' }, { merge: true })));
  test('cannot be paid twice for a job', () => denied(setDoc(doc(tech(), 'balances', 'tech'), { balanceDue: increment(50), lastCreditedJobId: 'jdone' }, { merge: true })));
  test('cannot be paid again for an old completed job', () => denied(setDoc(doc(tech(), 'balances', 'tech'), { balanceDue: increment(50), lastCreditedJobId: 'jold' }, { merge: true })));
  test('cannot set own balance', () => denied(setDoc(doc(tech(), 'balances', 'tech'), { balanceDue: 99999 })));

  test('files a job status report to the admins', () => allowed(setDoc(doc(tech(), 'notifications', 'n-new'), {
    id: 'n-new', title: 'Status', message: 'm', timestamp: 't1', recipientUserId: 'admins', recipientUserName: 'Operations Admins', isSent: true, type: 'job'
  })));
  test('cannot broadcast to everyone', () => denied(setDoc(doc(tech(), 'notifications', 'n-new'), {
    id: 'n-new', title: 'Fake', message: 'm', timestamp: 't1', recipientUserId: 'all', recipientUserName: 'All', isSent: true, type: 'alert'
  })));

  const message = (overrides: Record<string, unknown> = {}) => ({
    id: 'm-new', senderId: 'tech', senderName: 'Carlos Tech', senderRole: 'employee', recipientId: 'general', content: 'hello', timestamp: 't1', ...overrides
  });
  test('sends a message as themselves', () => allowed(setDoc(doc(tech(), 'messages', 'm-new'), message())));
  test('sends a direct message to a colleague', () => allowed(setDoc(doc(tech(), 'messages', 'm-new'), message({ recipientId: 'tech2' }))));
  test('cannot send as someone else', () => denied(setDoc(doc(tech(), 'messages', 'm-new'), message({ senderId: 'ceo', senderName: 'Ray Ceo', senderRole: 'super-admin' }))));
  test('cannot fake a role badge', () => denied(setDoc(doc(tech(), 'messages', 'm-new'), message({ senderRole: 'super-admin' }))));
  test('cannot edit a sent message', () => denied(updateDoc(doc(tech(), 'messages', 'm-tech-to-tech2'), { content: 'edited' })));

  test('cannot create people', () => denied(setDoc(doc(tech(), 'users', 'x1'), { id: 'x1', role: 'employee', authEmail: authEmail('x1') })));
  test('cannot register usernames', () => denied(setDoc(doc(tech(), 'usernames', 'boss'), { userId: 'tech', email: authEmail('tech') })));
});

describe('admin / manager', () => {
  const adm = () => as('adm');

  test('reads all jobs, shifts, logs and notifications', async () => {
    await allowed(getDocs(collection(adm(), 'jobs')));
    await allowed(getDocs(collection(adm(), 'shifts')));
    await allowed(getDocs(collection(adm(), 'clockLogs')));
    await allowed(getDocs(collection(adm(), 'notifications')));
  });
  test("cannot read other people's direct messages", () => denied(getDoc(doc(adm(), 'messages', 'm-tech2-to-ceo'))));
  test('dispatches a job', () => allowed(setDoc(doc(adm(), 'jobs', 'j9'), job('j9', 'tech', 'pending'))));
  test('cannot dispatch a job to the CEO', () => denied(setDoc(doc(adm(), 'jobs', 'j9'), job('j9', 'ceo' as string, 'pending', { assignedUserName: 'Ray Ceo' }))));
  test('overrides a job status', () => allowed(updateDoc(doc(adm(), 'jobs', 'j2'), { status: 'completed' })));
  test('completing a job for a technician credits them', async () => {
    const db = adm();
    const batch = writeBatch(db);
    batch.update(doc(db, 'jobs', 'j1'), { status: 'completed', credited: true });
    batch.set(doc(db, 'balances', 'tech'), { balanceDue: increment(50), lastCreditedJobId: 'j1' }, { merge: true });
    await allowed(batch.commit());
  });
  test('schedules a shift', () => allowed(setDoc(doc(adm(), 'shifts', 's9'), { id: 's9', userId: 'tech', date: '2026-10-26', startTime: '08:00', endTime: '16:30', type: 'normal' })));
  test('cannot put the CEO on the roster', () => denied(setDoc(doc(adm(), 'shifts', 's9'), { id: 's9', userId: 'ceo', date: '2026-10-26', startTime: '08:00', endTime: '16:30', type: 'normal' })));
  test('verifies a timesheet', () => allowed(updateDoc(doc(adm(), 'clockLogs', 'l1'), { verified: true })));
  test('assigns a vehicle', () => allowed(updateDoc(doc(adm(), 'users', 'tech'), { vehicleNumber: 'KDA 001' })));
  test('cannot change roles', () => denied(updateDoc(doc(adm(), 'users', 'tech'), { role: 'admin' })));
  test('cannot create people', () => denied(setDoc(doc(adm(), 'users', 'x1'), { id: 'x1', role: 'employee', authEmail: authEmail('x1') })));
  test('cannot see balances (payroll only)', () => denied(getDoc(doc(adm(), 'balances', 'tech'))));
  test('cannot clear balances', () => denied(setDoc(doc(adm(), 'balances', 'tech'), { balanceDue: 0 }, { merge: true })));
  test('broadcasts an alert', () => allowed(setDoc(doc(adm(), 'notifications', 'n9'), {
    id: 'n9', title: 'Alert', message: 'm', timestamp: 't1', recipientUserId: 'all', recipientUserName: 'All Team Members', isSent: true, type: 'alert'
  })));
});

describe('finance', () => {
  test('reads everyone\'s balances', () => allowed(getDocs(collection(as('fin'), 'balances'))));
  test('clears a settlement', () => allowed(setDoc(doc(as('fin'), 'balances', 'tech'), { balanceDue: 0 }, { merge: true })));
  test('cannot create people', () => denied(setDoc(doc(as('fin'), 'users', 'x1'), { id: 'x1', role: 'employee', authEmail: authEmail('x1') })));
});

describe('head of procurement (manages people)', () => {
  const proc = () => as('proc');
  const enrol = (db: Firestore, id: string, role: string, extra: Record<string, unknown> = {}) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', id), { id, name: 'New Person', username: 'Newperson', email: '', role, phone: '', position: 'Tech', avatarColor: 'x', authEmail: authEmail(id), ...extra });
    batch.set(doc(db, 'usernames', 'newperson'), { userId: id, email: authEmail(id) });
    batch.set(doc(db, 'balances', id), { balanceDue: 0 });
    return batch.commit();
  };

  test('enrols a new employee with a sign-in', () => allowed(enrol(proc(), 'emp-new', 'employee')));
  test('cannot enrol a super-admin', () => denied(enrol(proc(), 'emp-new', 'super-admin')));
  test('cannot store a plain-text password', () => denied(enrol(proc(), 'emp-new', 'employee', { pin: '0000' })));
  test("cannot take over an existing username", () => denied(setDoc(doc(proc(), 'usernames', 'tech'), { userId: 'tech2', email: authEmail('tech2') })));
  test('changes a role', () => allowed(updateDoc(doc(proc(), 'users', 'tech'), { role: 'admin' })));
  test('cannot promote anyone to super-admin', () => denied(updateDoc(doc(proc(), 'users', 'tech'), { role: 'super-admin' })));
  test("cannot edit the CEO's record", () => denied(updateDoc(doc(proc(), 'users', 'ceo'), { name: 'Someone Else' })));
  test("cannot reset the CEO's password", () => {
    const db = proc();
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', 'ceo'), { authEmail: authEmail('ceo', 'zz') });
    batch.set(doc(db, 'usernames', 'ceo'), { userId: 'ceo', email: authEmail('ceo', 'zz') });
    return denied(batch.commit());
  });
  test("cannot point someone's sign-in at another person's account", () => denied(updateDoc(doc(proc(), 'users', 'tech'), { authEmail: authEmail('tech2', 'zz') })));
  test('renames a username', () => {
    const db = proc();
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', 'tech'), { username: 'Ramirez' });
    batch.delete(doc(db, 'usernames', 'tech'));
    batch.set(doc(db, 'usernames', 'ramirez'), { userId: 'tech', email: authEmail('tech') });
    return allowed(batch.commit());
  });
  test('removes an employee', () => {
    const db = proc();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', 'tech'));
    batch.delete(doc(db, 'usernames', 'tech'));
    batch.delete(doc(db, 'balances', 'tech'));
    return allowed(batch.commit());
  });
  test('cannot remove the CEO', () => denied(deleteDoc(doc(proc(), 'users', 'ceo'))));
  test("cannot delete the CEO's username", () => denied(deleteDoc(doc(proc(), 'usernames', 'ceo'))));
});

describe('CEO (super-admin)', () => {
  test('promotes someone to super-admin', () => allowed(updateDoc(doc(as('ceo'), 'users', 'tech'), { role: 'super-admin' })));
  test("resets a manager's password", () => {
    const db = as('ceo');
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', 'proc'), { authEmail: authEmail('proc', 'b2') });
    batch.set(doc(db, 'usernames', 'proc'), { userId: 'proc', email: authEmail('proc', 'b2') });
    return allowed(batch.commit());
  });
  test('cannot read unknown collections', () => denied(getDoc(doc(as('ceo'), 'system', 'rules-check'))));
});

describe('stored passwords (CEO-only view)', () => {
  const stored = (password: string) => ({ password, updatedAt: 't1' });
  test('the CEO reads every password', () => allowed(getDocs(collection(as('ceo'), 'staffPasswords'))));
  for (const who of ['proc', 'adm', 'fin', 'tech']) {
    test(`${who} cannot list passwords`, () => denied(getDocs(collection(as(who), 'staffPasswords'))));
  }
  test('a technician cannot read even their own', () => denied(getDoc(doc(as('tech'), 'staffPasswords', 'tech'))));
  test('signed out cannot read', () => denied(getDoc(doc(signedOut(), 'staffPasswords', 'tech'))));
  test('head of procurement records a reset password', () => allowed(setDoc(doc(as('proc'), 'staffPasswords', 'tech'), stored('newpass1'))));
  test("head of procurement cannot overwrite the CEO's", () => denied(setDoc(doc(as('proc'), 'staffPasswords', 'ceo'), stored('newpass1'))));
  test('an admin cannot write passwords', () => denied(setDoc(doc(as('adm'), 'staffPasswords', 'tech'), stored('newpass1'))));
  test('a technician cannot write their own', () => denied(setDoc(doc(as('tech'), 'staffPasswords', 'tech'), stored('newpass1'))));
  test('no password for someone who is not on staff', () => denied(setDoc(doc(as('ceo'), 'staffPasswords', 'ghost'), stored('newpass1'))));
  test('no extra fields', () => denied(setDoc(doc(as('ceo'), 'staffPasswords', 'tech'), { ...stored('newpass1'), note: 'x' })));
  test('removing a person also removes their password', async () => {
    const proc = as('proc');
    const batch = writeBatch(proc);
    batch.delete(doc(proc, 'users', 'tech2'));
    batch.delete(doc(proc, 'balances', 'tech2'));
    batch.delete(doc(proc, 'staffPasswords', 'tech2'));
    batch.delete(doc(proc, 'usernames', 'techtwo'));
    await allowed(batch.commit());
  });
});
