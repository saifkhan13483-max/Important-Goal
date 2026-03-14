import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Goal } from "@/types/schema";

const col = () => collection(db, "goals");

export async function getGoals(userId: string): Promise<Goal[]> {
  const q = query(col(), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
}

export async function getGoal(id: string): Promise<Goal | null> {
  const snap = await getDoc(doc(db, "goals", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Goal;
}

export async function createGoal(userId: string, data: Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Goal> {
  const now = new Date().toISOString();
  const ref = await addDoc(col(), { ...data, userId, createdAt: now, updatedAt: now });
  return { id: ref.id, userId, ...data, createdAt: now, updatedAt: now };
}

export async function updateGoal(id: string, data: Partial<Goal>): Promise<Goal> {
  const ref = doc(db, "goals", id);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as Goal;
}

export async function deleteGoal(id: string): Promise<void> {
  await deleteDoc(doc(db, "goals", id));
}
