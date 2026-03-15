/**
 * audio.service.ts — Firebase Storage helpers for Future Self Audio
 *
 * Uploads the user's personal audio recording to Firebase Storage at:
 *   audio/{userId}/future-self.<ext>
 *
 * The resulting download URL is stored on the Firestore User document
 * (`futureAudioUrl`) and cached in localStorage for fast local playback.
 *
 * Storage rules needed in Firebase Console:
 *   match /audio/{userId}/{file} {
 *     allow read, write: if request.auth != null && request.auth.uid == userId;
 *   }
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

const LS_AUDIO_URL   = "sf_future_self_audio_url";
const LS_AUDIO_B64   = "sf_future_self_audio";
const LS_AUDIO_TYPE  = "sf_future_self_audio_type";

/** Returns the extension for a given MIME type */
function extForMime(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg"))  return "ogg";
  if (mimeType.includes("mp4"))  return "mp4";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav"))  return "wav";
  if (mimeType.includes("m4a") || mimeType.includes("x-m4a")) return "m4a";
  return "audio";
}

/**
 * Upload a Blob to Firebase Storage and return the download URL.
 * Also caches the URL in localStorage for offline-first playback.
 */
export async function uploadFutureSelfAudio(
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to save audio.");

  const ext = extForMime(mimeType);
  const storageRef = ref(storage, `audio/${user.uid}/future-self.${ext}`);

  await uploadBytes(storageRef, blob, { contentType: mimeType });
  const url = await getDownloadURL(storageRef);

  try { localStorage.setItem(LS_AUDIO_URL, url); } catch {}

  return url;
}

/**
 * Convert a base64 data-URL to a Blob and upload it.
 * Used when recording produces a base64 string.
 */
export async function uploadFutureSelfAudioBase64(
  base64DataUrl: string,
  mimeType: string,
): Promise<string> {
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();
  return uploadFutureSelfAudio(blob, mimeType);
}

/**
 * Upload a File object directly (from the file input).
 */
export async function uploadFutureSelfAudioFile(file: File): Promise<string> {
  return uploadFutureSelfAudio(file, file.type || "audio/mpeg");
}

/**
 * Delete the user's stored audio from Firebase Storage.
 */
export async function deleteFutureSelfAudioFromStorage(
  audioUrl: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const storageRef = ref(storage, audioUrl);
    await deleteObject(storageRef);
  } catch {
    // Ignore — file may already be deleted or path may differ
  }

  try {
    localStorage.removeItem(LS_AUDIO_URL);
    localStorage.removeItem(LS_AUDIO_B64);
    localStorage.removeItem(LS_AUDIO_TYPE);
  } catch {}
}

/**
 * Returns the best available audio URL:
 * 1. Cached Firestore URL in localStorage (fastest)
 * 2. The URL passed in from the Firestore User document
 * 3. The legacy base64 from localStorage (for users who haven't re-uploaded)
 */
export function getLocalAudioUrl(firestoreUrl?: string | null): string | null {
  try {
    const cached = localStorage.getItem(LS_AUDIO_URL);
    if (cached) return cached;
  } catch {}

  if (firestoreUrl) {
    try { localStorage.setItem(LS_AUDIO_URL, firestoreUrl); } catch {}
    return firestoreUrl;
  }

  try {
    return localStorage.getItem(LS_AUDIO_B64);
  } catch {}

  return null;
}

export function hasStoredAudio(firestoreUrl?: string | null): boolean {
  return !!getLocalAudioUrl(firestoreUrl);
}
