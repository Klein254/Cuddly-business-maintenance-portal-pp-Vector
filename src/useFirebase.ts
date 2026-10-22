import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { User, Shift, ClockLog, Job, PushNotificationLog, ChatMessage } from './types';
import { initialUsers, initialShifts, initialClockLogs, initialJobs, initialNotifications } from './data';

export function useFirebase() {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [clockLogs, setClockLogs] = useState<ClockLog[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<PushNotificationLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Seed Data fallback
  const seedCollectionIfEmpty = async (collectionName: string, data: any[]) => {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log(`Seeding ${collectionName}...`);
      for (const item of data) {
        await setDoc(doc(colRef, item.id), item);
      }
    }
  };

  useEffect(() => {
    const seedAll = async () => {
      try {
        await seedCollectionIfEmpty('users', initialUsers);
        await seedCollectionIfEmpty('shifts', initialShifts);
        await seedCollectionIfEmpty('clockLogs', initialClockLogs);
        await seedCollectionIfEmpty('jobs', initialJobs);
        await seedCollectionIfEmpty('notifications', initialNotifications);
      } catch (err) {
        console.error("Error seeding initial data if empty:", err);
      }
    };

    seedAll().then(() => {
      // Listeners
      const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setUsers(snap.docs.map(d => d.data() as User));
      }, (err) => console.error("Firebase Snapshot Error (Users):", err));
      const unsubShifts = onSnapshot(collection(db, 'shifts'), (snap) => {
        setShifts(snap.docs.map(d => d.data() as Shift));
      }, (err) => console.error("Firebase Snapshot Error (Shifts):", err));
      const unsubClockLogs = onSnapshot(collection(db, 'clockLogs'), (snap) => {
        setClockLogs(snap.docs.map(d => d.data() as ClockLog));
      }, (err) => console.error("Firebase Snapshot Error (ClockLogs):", err));
      const unsubJobs = onSnapshot(collection(db, 'jobs'), (snap) => {
        setJobs(snap.docs.map(d => d.data() as Job));
      }, (err) => console.error("Firebase Snapshot Error (Jobs):", err));
      const unsubMessages = onSnapshot(collection(db, 'messages'), (snap) => {
        setMessages(snap.docs.map(d => d.data() as ChatMessage).sort((a,b) => a.timestamp.localeCompare(b.timestamp)));
      }, (err) => console.error("Firebase Snapshot Error (Messages):", err));
      const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snap) => {
        setNotifications(snap.docs.map(d => d.data() as PushNotificationLog));
        setLoading(false);
      }, (err) => {
        console.error("Firebase Snapshot Error (Notifications):", err);
        setLoading(false); // Make sure to stop loading even on error
      });

      return () => {
        unsubUsers();
        unsubShifts();
        unsubClockLogs();
        unsubJobs();
        unsubMessages();
        unsubNotifs();
      };
    });
  }, []);

  // Setters wrap Firebase ops
  const addClockLog = async (log: ClockLog) => setDoc(doc(db, 'clockLogs', log.id), log);
  const updateClockLog = async (log: ClockLog) => setDoc(doc(db, 'clockLogs', log.id), log);
  
  const addJob = async (job: Job) => setDoc(doc(db, 'jobs', job.id), job);
  const updateJob = async (job: Job) => setDoc(doc(db, 'jobs', job.id), job);
  
  const addShift = async (s: Shift) => setDoc(doc(db, 'shifts', s.id), s);
  const deleteShift = async (id: string) => deleteDoc(doc(db, 'shifts', id));
  
  const updateUser = async (user: User) => setDoc(doc(db, 'users', user.id), user);
  const addNotification = async (n: PushNotificationLog) => setDoc(doc(db, 'notifications', n.id), n);
  const deleteUser = async (id: string) => deleteDoc(doc(db, 'users', id));

  const addMessage = async (m: ChatMessage) => setDoc(doc(db, 'messages', m.id), m);

  return {
    users, shifts, clockLogs, jobs, notifications, messages, loading,
    addClockLog, updateClockLog, addJob, updateJob, addShift, deleteShift, updateUser, deleteUser, addNotification, addMessage
  };
}
