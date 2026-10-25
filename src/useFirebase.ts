import { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, where, writeBatch, increment,
  FirestoreError, Query, DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Shift, ClockLog, Job, PushNotificationLog, ChatMessage, StaffBalance } from './types';

// Who is signed in. 'secured': Firebase Authentication. 'legacy': the old surname + PIN check, which
// only exists until an administrator runs "Secure accounts" (see src/auth.ts).
export interface Session {
  userId: string;
  mode: 'secured' | 'legacy';
}

export const ADMIN_ROLES = ['super-admin', 'admin', 'head-procurement', 'finance'];
export const PAYROLL_ROLES = ['super-admin', 'finance'];
export const PEOPLE_MANAGER_ROLES = ['super-admin', 'head-procurement'];

/** Collision-safe document IDs (two devices acting in the same millisecond no longer overwrite each other). */
export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Listens to several queries and reports their combined results, de-duplicated by document ID
function listenToAll<T extends { id: string }>(
  queries: Query<DocumentData>[],
  onData: (items: T[]) => void,
  onError: (err: FirestoreError) => void
) {
  const results: Map<string, T>[] = queries.map(() => new Map());
  const reported = new Set<number>();
  const unsubs = queries.map((q, i) => onSnapshot(q, snap => {
    results[i] = new Map(snap.docs.map(d => [d.id, d.data() as T]));
    reported.add(i);
    if (reported.size === queries.length) {
      const merged = new Map<string, T>();
      results.forEach(r => r.forEach((item, id) => merged.set(id, item)));
      onData([...merged.values()]);
    }
  }, onError));
  return () => unsubs.forEach(u => u());
}

export function useFirebase(session: Session | null) {
  const [rawUsers, setRawUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  // True once the staff list has come from the server rather than this device's offline copy
  const [usersConfirmed, setUsersConfirmed] = useState(false);
  const [balances, setBalances] = useState<Record<string, StaffBalance>>({});
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [clockLogs, setClockLogs] = useState<ClockLog[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<PushNotificationLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [accessError, setAccessError] = useState<FirestoreError | null>(null);

  const sessionKey = session ? `${session.mode}:${session.userId}` : '';
  const myRole = session ? rawUsers.find(u => u.id === session.userId)?.role : undefined;

  // Staff directory first: it tells us this person's role, which decides what else they may load
  useEffect(() => {
    setRawUsers([]);
    setUsersLoaded(false);
    setUsersConfirmed(false);
    setAccessError(null);
    if (!session) return;
    return onSnapshot(collection(db, 'users'), { includeMetadataChanges: true }, snap => {
      setRawUsers(snap.docs.map(d => d.data() as User));
      setUsersLoaded(true);
      if (!snap.metadata.fromCache) setUsersConfirmed(true);
    }, err => {
      console.error("Firebase Snapshot Error (Users):", err);
      setAccessError(err);
      setUsersLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  useEffect(() => {
    setDataLoaded(false);
    if (!session || !myRole) return;

    const me = session.userId;
    const secured = session.mode === 'secured';
    // Technicians only load their own records (the database rules refuse anything else);
    // the old legacy session can't be scoped because the open database has no rules to check against.
    const ownOnly = secured && !ADMIN_ROLES.includes(myRole);

    const pending = new Set(['shifts', 'clockLogs', 'jobs', 'notifications', 'messages', 'balances']);
    const markLoaded = (name: string) => {
      pending.delete(name);
      if (pending.size === 0) setDataLoaded(true);
    };
    const handleError = (name: string) => (err: FirestoreError) => {
      console.error(`Firebase Snapshot Error (${name}):`, err);
      if (err.code === 'permission-denied') setAccessError(err);
      markLoaded(name);
    };
    const mine = (name: string, field: string) =>
      ownOnly ? query(collection(db, name), where(field, '==', me)) : collection(db, name);

    const unsubs = [
      onSnapshot(mine('shifts', 'userId'), snap => {
        setShifts(snap.docs.map(d => d.data() as Shift));
        markLoaded('shifts');
      }, handleError('shifts')),
      onSnapshot(mine('clockLogs', 'userId'), snap => {
        setClockLogs(snap.docs.map(d => d.data() as ClockLog));
        markLoaded('clockLogs');
      }, handleError('clockLogs')),
      onSnapshot(mine('jobs', 'assignedUserId'), snap => {
        setJobs(snap.docs.map(d => d.data() as Job));
        markLoaded('jobs');
      }, handleError('jobs')),
      listenToAll<PushNotificationLog>(
        ownOnly
          ? [query(collection(db, 'notifications'), where('recipientUserId', '==', me)),
             query(collection(db, 'notifications'), where('recipientUserId', '==', 'all'))]
          : [collection(db, 'notifications')],
        items => {
          setNotifications(items);
          markLoaded('notifications');
        }, handleError('notifications')),
      // Everyone (admins included) only gets the General channel plus their own direct messages
      listenToAll<ChatMessage>(
        secured
          ? [query(collection(db, 'messages'), where('recipientId', '==', 'general')),
             query(collection(db, 'messages'), where('recipientId', '==', me)),
             query(collection(db, 'messages'), where('senderId', '==', me))]
          : [collection(db, 'messages')],
        items => {
          setMessages(items.sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
          markLoaded('messages');
        }, handleError('messages'))
    ];

    // Pay owed: payroll roles see everyone's, everyone else only their own
    if (!secured) {
      markLoaded('balances');
    } else if (PAYROLL_ROLES.includes(myRole)) {
      unsubs.push(onSnapshot(collection(db, 'balances'), snap => {
        setBalances(Object.fromEntries(snap.docs.map(d => [d.id, d.data() as StaffBalance])));
        markLoaded('balances');
      }, handleError('balances')));
    } else {
      unsubs.push(onSnapshot(doc(db, 'balances', me), snap => {
        setBalances(snap.exists() ? { [me]: snap.data() as StaffBalance } : {});
        markLoaded('balances');
      }, handleError('balances')));
    }

    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, myRole]);

  // Before accounts are secured, balances live on the user documents; afterwards in balances/{id}
  const balanceOnUserDoc = (userId: string) => typeof rawUsers.find(u => u.id === userId)?.balanceDue === 'number';

  const users = useMemo(() => rawUsers.map(u => (
    typeof u.balanceDue === 'number' ? u : { ...u, balanceDue: balances[u.id]?.balanceDue ?? 0 }
  )), [rawUsers, balances]);

  const loading = !!session && (!usersLoaded || (!!myRole && !dataLoaded));

  // Writes change only the fields involved, so two people editing at once can't undo each other's changes
  const updateUserFields = async (userId: string, fields: Partial<User>) => updateDoc(doc(db, 'users', userId), fields as DocumentData);

  const setBalance = async (userId: string, balanceDue: number) => balanceOnUserDoc(userId)
    ? updateDoc(doc(db, 'users', userId), { balanceDue })
    : setDoc(doc(db, 'balances', userId), { balanceDue }, { merge: true });

  const addClockLog = async (log: ClockLog) => setDoc(doc(db, 'clockLogs', log.id), log);
  const updateClockLogFields = async (id: string, fields: Partial<ClockLog>) => updateDoc(doc(db, 'clockLogs', id), fields as DocumentData);

  const addJob = async (job: Job) => setDoc(doc(db, 'jobs', job.id), job);

  /** Saves a status change; when a job is first completed its payout is added to the technician's balance in the same write. */
  const updateJobStatus = async (jobId: string, fields: Partial<Job>, credit?: { userId: string; amount: number }) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'jobs', jobId), fields as DocumentData);
    if (credit) {
      if (balanceOnUserDoc(credit.userId)) {
        batch.update(doc(db, 'users', credit.userId), { balanceDue: increment(credit.amount) });
      } else {
        batch.set(doc(db, 'balances', credit.userId), { balanceDue: increment(credit.amount), lastCreditedJobId: jobId }, { merge: true });
      }
    }
    await batch.commit();
  };

  const addShift = async (s: Shift) => setDoc(doc(db, 'shifts', s.id), s);
  const deleteShift = async (id: string) => deleteDoc(doc(db, 'shifts', id));

  // Only used before accounts are secured; afterwards src/auth.ts manages people (it also handles their sign-in)
  const saveLegacyUser = async (user: User) => setDoc(doc(db, 'users', user.id), user);
  const deleteLegacyUser = async (id: string) => deleteDoc(doc(db, 'users', id));

  const addNotification = async (n: PushNotificationLog) => setDoc(doc(db, 'notifications', n.id), n);
  const addMessage = async (m: ChatMessage) => setDoc(doc(db, 'messages', m.id), m);

  return {
    users, shifts, clockLogs, jobs, notifications, messages, loading, usersConfirmed, accessError,
    updateUserFields, setBalance, addClockLog, updateClockLogFields, addJob, updateJobStatus,
    addShift, deleteShift, saveLegacyUser, deleteLegacyUser, addNotification, addMessage
  };
}
