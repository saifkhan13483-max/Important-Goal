import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Checkin } from "@/types/schema";

const col = () => collection(db, "checkins");

export async function getCheckins(userId: string): Promise<Checkin[]> {
  const q = query(col(), where("userId", "==", userId));
  const snap = await getDocs(q);
  const checkins = snap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin));
  return checkins.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getCheckinsByDate(userId: string, dateKey: string): Promise<Checkin[]> {
  const q = query(col(), where("userId", "==", userId), where("dateKey", "==", dateKey));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin));
}

export async function upsertCheckin(
  userId: string,
  systemId: string,
  dateKey: string,
  data: Partial<Checkin>,
): Promise<Checkin> {
  const q = query(col(), where("systemId", "==", systemId), where("dateKey", "==", dateKey));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const existing = snap.docs[0];
    await updateDoc(doc(db, "checkins", existing.id), { ...data });
    const updated = await getDoc(doc(db, "checkins", existing.id));
    return { id: updated.id, ...updated.data() } as Checkin;
  }

  const now = new Date().toISOString();
  const ref = await addDoc(col(), { ...data, userId, systemId, dateKey, createdAt: now });
  return { id: ref.id, userId, systemId, dateKey, ...data, createdAt: now } as Checkin;
}
