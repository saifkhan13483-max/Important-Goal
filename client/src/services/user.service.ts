import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/types/schema";

export async function getUser(uid: string): Promise<User | null> {
  const fetchPromise = getDoc(doc(db, "users", uid));
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Firestore timeout")), 8000)
  );
  const snap = await Promise.race([fetchPromise, timeoutPromise]);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function createUser(uid: string, data: User): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    ...data,
    createdAt: new Date().toISOString(),
  });
}

export async function updateUser(uid: string, data: Partial<User>): Promise<User> {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { ...data });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as User;
}
