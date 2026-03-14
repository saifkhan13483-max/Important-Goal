import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JournalEntry } from "@/types/schema";

const col = () => collection(db, "journalEntries");

export async function getJournals(userId: string): Promise<JournalEntry[]> {
  const q = query(col(), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
}

export async function getJournalsByDate(userId: string, dateKey: string): Promise<JournalEntry[]> {
  const q = query(col(), where("userId", "==", userId), where("dateKey", "==", dateKey));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
}

export async function createJournal(userId: string, data: Omit<JournalEntry, "id" | "userId" | "createdAt" | "updatedAt">): Promise<JournalEntry> {
  const now = new Date().toISOString();
  const ref = await addDoc(col(), { ...data, userId, createdAt: now, updatedAt: now });
  return { id: ref.id, userId, ...data, createdAt: now, updatedAt: now };
}

export async function updateJournal(id: string, data: Partial<JournalEntry>): Promise<JournalEntry> {
  const ref = doc(db, "journalEntries", id);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as JournalEntry;
}

export async function deleteJournal(id: string): Promise<void> {
  await deleteDoc(doc(db, "journalEntries", id));
}
