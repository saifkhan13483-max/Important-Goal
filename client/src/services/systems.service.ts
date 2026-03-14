import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { System } from "@/types/schema";

const col = () => collection(db, "systems");

export async function getSystems(userId: string): Promise<System[]> {
  const q = query(col(), where("userId", "==", userId));
  const snap = await getDocs(q);
  const systems = snap.docs.map(d => ({ id: d.id, ...d.data() } as System));
  return systems.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getSystemsByGoal(goalId: string): Promise<System[]> {
  const q = query(col(), where("goalId", "==", goalId));
  const snap = await getDocs(q);
  const systems = snap.docs.map(d => ({ id: d.id, ...d.data() } as System));
  return systems.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getSystem(id: string): Promise<System | null> {
  const snap = await getDoc(doc(db, "systems", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as System;
}

export async function createSystem(userId: string, data: Omit<System, "id" | "userId" | "createdAt" | "updatedAt">): Promise<System> {
  const now = new Date().toISOString();
  const ref = await addDoc(col(), { ...data, userId, createdAt: now, updatedAt: now });
  return { id: ref.id, userId, ...data, createdAt: now, updatedAt: now };
}

export async function updateSystem(id: string, data: Partial<System>): Promise<System> {
  const ref = doc(db, "systems", id);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as System;
}

export async function deleteSystem(id: string): Promise<void> {
  await deleteDoc(doc(db, "systems", id));
}
