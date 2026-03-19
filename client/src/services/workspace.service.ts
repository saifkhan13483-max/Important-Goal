import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Workspace, WorkspaceMember } from "@/types/schema";

export interface MemberStats {
  activeSystems: number;
  bestStreak: number;
  currentStreak: number;
  completionRate: number;
  weeklyRate: number;
  last7: Array<{ dateKey: string; done: number; total: number }>;
  syncedAt?: string;
}

interface WorkspaceDoc {
  id: string;
  ownerId: string;
  name: string;
  inviteCode: string;
  memberIds: string[];
  members: WorkspaceMember[];
  memberStats: Record<string, MemberStats>;
  createdAt: string;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function toWorkspace(raw: WorkspaceDoc): Workspace & { members: (WorkspaceMember & { stats?: MemberStats })[] } {
  const stats = raw.memberStats || {};
  return {
    id: raw.id,
    ownerId: raw.ownerId,
    name: raw.name,
    inviteCode: raw.inviteCode,
    members: (raw.members || []).map((m) => ({
      ...m,
      stats: stats[m.userId] ?? undefined,
    })),
    createdAt: raw.createdAt,
  };
}

export async function getMyWorkspace(): Promise<Workspace | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  const q = query(collection(db, "workspaces"), where("memberIds", "array-contains", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const raw = { id: snap.docs[0].id, ...snap.docs[0].data() } as WorkspaceDoc;
  return toWorkspace(raw);
}

export async function createWorkspace(
  ownerId: string,
  email: string,
  displayName: string,
  name: string,
): Promise<Workspace> {
  const existing = await getMyWorkspace();
  if (existing) throw new Error("Already in a workspace");

  const ref = doc(collection(db, "workspaces"));
  const id = ref.id;
  const inviteCode = generateCode();
  const now = new Date().toISOString();

  const member: WorkspaceMember = {
    userId: ownerId,
    email,
    name: displayName,
    role: "owner",
    joinedAt: now,
  };

  const wsData: WorkspaceDoc = {
    id,
    ownerId,
    name: name.trim() || `${displayName}'s Team`,
    inviteCode,
    memberIds: [ownerId],
    members: [member],
    memberStats: {},
    createdAt: now,
  };

  await setDoc(ref, wsData);
  await updateDoc(doc(db, "users", ownerId), { workspaceId: id });

  return toWorkspace(wsData);
}

export async function joinWorkspaceByCode(
  code: string,
  email: string,
  displayName: string,
): Promise<Workspace> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const existing = await getMyWorkspace();
  if (existing) throw new Error("Already in a workspace");

  const q = query(
    collection(db, "workspaces"),
    where("inviteCode", "==", code.trim().toUpperCase()),
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Workspace not found. Check the invite code.");

  const wsDoc = snap.docs[0];
  const wsData = { id: wsDoc.id, ...wsDoc.data() } as WorkspaceDoc;

  if (wsData.memberIds.includes(uid)) {
    return toWorkspace(wsData);
  }

  const newMember: WorkspaceMember = {
    userId: uid,
    email,
    name: displayName,
    role: "member",
    joinedAt: new Date().toISOString(),
  };

  const updatedMembers = [...wsData.members, newMember];
  const updatedMemberIds = [...wsData.memberIds, uid];

  await updateDoc(wsDoc.ref, {
    members: updatedMembers,
    memberIds: updatedMemberIds,
  });

  await updateDoc(doc(db, "users", uid), { workspaceId: wsDoc.id });

  return toWorkspace({ ...wsData, members: updatedMembers, memberIds: updatedMemberIds });
}

export async function leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
  const wsRef = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(wsRef);
  if (!snap.exists()) throw new Error("Workspace not found");

  const wsData = { id: snap.id, ...snap.data() } as WorkspaceDoc;

  if (wsData.ownerId === userId) {
    await deleteDoc(wsRef);
    for (const m of wsData.members) {
      await updateDoc(doc(db, "users", m.userId), { workspaceId: null });
    }
  } else {
    const updatedMembers = wsData.members.filter((m) => m.userId !== userId);
    const updatedMemberIds = wsData.memberIds.filter((id) => id !== userId);
    const updatedStats = { ...wsData.memberStats };
    delete updatedStats[userId];
    await updateDoc(wsRef, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
      memberStats: updatedStats,
    });
    await updateDoc(doc(db, "users", userId), { workspaceId: null });
  }
}

export async function removeMemberFromWorkspace(
  workspaceId: string,
  memberId: string,
): Promise<Workspace> {
  const wsRef = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(wsRef);
  const wsData = { id: snap.id, ...snap.data() } as WorkspaceDoc;

  const updatedMembers = wsData.members.filter((m) => m.userId !== memberId);
  const updatedMemberIds = wsData.memberIds.filter((id) => id !== memberId);
  const updatedStats = { ...wsData.memberStats };
  delete updatedStats[memberId];

  await updateDoc(wsRef, {
    members: updatedMembers,
    memberIds: updatedMemberIds,
    memberStats: updatedStats,
  });
  await updateDoc(doc(db, "users", memberId), { workspaceId: null });

  return toWorkspace({ ...wsData, members: updatedMembers, memberIds: updatedMemberIds, memberStats: updatedStats });
}

export async function regenerateInviteCode(workspaceId: string): Promise<string> {
  const newCode = generateCode();
  await updateDoc(doc(db, "workspaces", workspaceId), { inviteCode: newCode });
  return newCode;
}

export async function renameWorkspace(workspaceId: string, newName: string): Promise<void> {
  await updateDoc(doc(db, "workspaces", workspaceId), { name: newName.trim() });
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const wsRef = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(wsRef);
  if (!snap.exists()) throw new Error("Workspace not found");
  const wsData = { id: snap.id, ...snap.data() } as WorkspaceDoc;
  await deleteDoc(wsRef);
  for (const m of wsData.members) {
    try {
      await updateDoc(doc(db, "users", m.userId), { workspaceId: null });
    } catch { /* */ }
  }
}

export async function syncMemberStats(workspaceId: string, stats: MemberStats): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  await updateDoc(doc(db, "workspaces", workspaceId), {
    [`memberStats.${uid}`]: { ...stats, syncedAt: new Date().toISOString() },
  });
}
