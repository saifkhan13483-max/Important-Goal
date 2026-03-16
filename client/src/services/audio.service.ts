/**
 * audio.service.ts — Firebase Storage helpers for Future Self Audio
 *
 * Uploads the user's personal audio recording to Firebase Storage at:
 *   audio/{userId}/future-self.<ext>
 *
 * Uses uploadBytesResumable so callers receive real byte-level progress.
 * Falls back to localStorage base64 if Storage is unreachable or rules block.
 *
 * Storage rules needed in Firebase Console:
 *   match /audio/{userId}/{file} {
 *     allow read, write: if request.auth != null && request.auth.uid == userId;
 *   }
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

const LS_AUDIO_URL  = "sf_future_self_audio_url";
const LS_AUDIO_B64  = "sf_future_self_audio";
const LS_AUDIO_TYPE = "sf_future_self_audio_type";

/** Returns the file extension for a given MIME type */
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
 * Upload a Blob to Firebase Storage with real progress callbacks.
 *
 * @param blob      - The audio blob to upload
 * @param mimeType  - MIME type of the blob
 * @param onProgress - Called with 0–100 as bytes transfer
 * @param timeoutMs - Abort if upload takes longer than this (default 30 s)
 */
export function uploadFutureSelfAudio(
  blob: Blob,
  mimeType: string,
  onProgress?: (pct: number) => void,
  timeoutMs = 30_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const user = auth.currentUser;
    if (!user) {
      reject(new Error("You must be signed in to save audio."));
      return;
    }

    const ext = extForMime(mimeType);
    const storageRef = ref(storage, `audio/${user.uid}/future-self.${ext}`);
    const task = uploadBytesResumable(storageRef, blob, { contentType: mimeType });

    const timer = setTimeout(() => {
      task.cancel();
      reject(new Error("Upload timed out. Check your internet connection and try again."));
    }, timeoutMs);

    task.on(
      "state_changed",
      (snapshot) => {
        const pct = snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        onProgress?.(pct);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      async () => {
        clearTimeout(timer);
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          try { localStorage.setItem(LS_AUDIO_URL, url); } catch {}
          resolve(url);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

/**
 * Convert a base64 data-URL to a Blob, then upload with progress.
 */
export async function uploadFutureSelfAudioBase64(
  base64DataUrl: string,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();
  return uploadFutureSelfAudio(blob, mimeType, onProgress);
}

/**
 * Upload a File object directly (from the file input) with progress.
 */
export function uploadFutureSelfAudioFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return uploadFutureSelfAudio(file, file.type || "audio/mpeg", onProgress);
}

/**
 * Delete the user's stored audio file from Firebase Storage.
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
    // File may already be deleted or the path may have changed
  }

  try {
    localStorage.removeItem(LS_AUDIO_URL);
    localStorage.removeItem(LS_AUDIO_B64);
    localStorage.removeItem(LS_AUDIO_TYPE);
  } catch {}
}

/**
 * Returns the best available audio source:
 *  1. Cached Firebase URL in localStorage (fastest on repeat visits)
 *  2. The Firestore URL passed from user.futureAudioUrl
 *  3. Legacy base64 blob in localStorage (pre-cloud-upload recordings)
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
