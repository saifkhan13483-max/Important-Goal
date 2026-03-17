import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Workspace, WorkspaceMember } from "@/types/schema";

const col = () => collection(db, "workspaces");

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function getWorkspaceByOwner(ownerId: string): Promise<Workspace | null> {
  const q = query(col(), where("ownerId", "==", ownerId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Workspace;
}

export async function getWorkspaceByMember(userId: string): Promise<Workspace | null> {
  const snap = await getDocs(col());
  for (const d of snap.docs) {
    const ws = { id: d.id, ...d.data() } as Workspace;
    if (ws.members.some((m) => m.userId === userId)) return ws;
  }
  return null;
}

export async function getWorkspaceByCode(inviteCode: string): Promise<Workspace | null> {
  const q = query(col(), where("inviteCode", "==", inviteCode.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Workspace;
}

export async function createWorkspace(
  ownerId: string,
  ownerEmail: string,
  ownerName: string,
  name: string,
): Promise<Workspace> {
  const now = new Date().toISOString();
  const ownerMember: WorkspaceMember = {
    userId: ownerId,
    email: ownerEmail,
    name: ownerName,
    role: "owner",
    joinedAt: now,
  };
  const data = {
    ownerId,
    name,
    inviteCode: generateInviteCode(),
    members: [ownerMember],
    createdAt: now,
  };
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function joinWorkspace(
  workspaceId: string,
  member: WorkspaceMember,
): Promise<Workspace> {
  const ref = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Workspace not found");
  const ws = { id: snap.id, ...snap.data() } as Workspace;
  const alreadyMember = ws.members.some((m) => m.userId === member.userId);
  if (!alreadyMember) {
    const updatedMembers = [...ws.members, member];
    await updateDoc(ref, { members: updatedMembers });
    return { ...ws, members: updatedMembers };
  }
  return ws;
}

export async function leaveWorkspace(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const ref = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const ws = { id: snap.id, ...snap.data() } as Workspace;
  const updatedMembers = ws.members.filter((m) => m.userId !== userId);
  await updateDoc(ref, { members: updatedMembers });
}

export async function removeMemberFromWorkspace(
  workspaceId: string,
  memberId: string,
): Promise<Workspace> {
  const ref = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Workspace not found");
  const ws = { id: snap.id, ...snap.data() } as Workspace;
  const updatedMembers = ws.members.filter((m) => m.userId !== memberId);
  await updateDoc(ref, { members: updatedMembers });
  return { ...ws, members: updatedMembers };
}

export async function regenerateInviteCode(workspaceId: string): Promise<string> {
  const ref = doc(db, "workspaces", workspaceId);
  const newCode = generateInviteCode();
  await updateDoc(ref, { inviteCode: newCode });
  return newCode;
}
