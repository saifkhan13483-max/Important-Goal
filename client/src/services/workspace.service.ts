import { auth } from "@/lib/firebase";
import type { Workspace, WorkspaceMember } from "@/types/schema";

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json() as Promise<T>;
}

/* ── Helpers to shape server response into shared Workspace type ── */
function toWorkspace(raw: any): Workspace {
  return {
    id: raw.id,
    ownerId: raw.ownerId,
    name: raw.name,
    inviteCode: raw.inviteCode,
    members: (raw.members || []).map((m: any): WorkspaceMember => ({
      userId: m.userId,
      email: m.email,
      name: m.name,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    createdAt: raw.createdAt,
  };
}

export async function getMyWorkspace(): Promise<Workspace | null> {
  const raw = await apiFetch<any>("/api/workspace");
  return raw ? toWorkspace(raw) : null;
}

export async function getWorkspaceByCode(code: string): Promise<Workspace | null> {
  try {
    const raw = await apiFetch<any>(`/api/workspace/by-code/${encodeURIComponent(code.toUpperCase())}`);
    return raw ? toWorkspace(raw) : null;
  } catch {
    return null;
  }
}

export async function createWorkspace(
  _ownerId: string,
  email: string,
  displayName: string,
  name: string,
): Promise<Workspace> {
  const raw = await apiFetch<any>("/api/workspace/create", {
    method: "POST",
    body: JSON.stringify({ name, email, displayName }),
  });
  return toWorkspace(raw);
}

export async function joinWorkspace(
  _workspaceId: string,
  member: WorkspaceMember,
): Promise<Workspace> {
  throw new Error("Use joinWorkspaceByCode instead");
}

export async function joinWorkspaceByCode(
  code: string,
  email: string,
  displayName: string,
): Promise<Workspace> {
  const raw = await apiFetch<any>("/api/workspace/join", {
    method: "POST",
    body: JSON.stringify({ code, email, displayName }),
  });
  return toWorkspace(raw);
}

export async function leaveWorkspace(
  _workspaceId: string,
  _userId: string,
): Promise<void> {
  await apiFetch<any>("/api/workspace/leave", { method: "POST", body: "{}" });
}

export async function removeMemberFromWorkspace(
  _workspaceId: string,
  memberId: string,
): Promise<Workspace> {
  const raw = await apiFetch<any>(`/api/workspace/members/${memberId}`, {
    method: "DELETE",
  });
  return toWorkspace(raw);
}

export async function regenerateInviteCode(_workspaceId: string): Promise<string> {
  const data = await apiFetch<{ inviteCode: string }>("/api/workspace/regen-code", {
    method: "POST",
    body: "{}",
  });
  return data.inviteCode;
}

export interface MemberStats {
  activeSystems: number;
  bestStreak: number;
  completionRate: number;
  weeklyRate: number;
  last7: { dateKey: string; done: number; total: number }[];
}

export async function syncMemberStats(stats: MemberStats): Promise<void> {
  await apiFetch<any>("/api/workspace/sync-stats", {
    method: "POST",
    body: JSON.stringify({ stats }),
  });
}
