/**
 * audio.service.ts — Cloudinary helpers for Future Self Audio
 *
 * Uploads the user's personal audio recording to Cloudinary at:
 *   folder: future-self-audio/
 *
 * Uses XMLHttpRequest for real byte-level upload progress.
 * Falls back to localStorage base64 if Cloudinary is unreachable.
 */

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const DELETE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/delete_by_token`;

const LS_AUDIO_URL         = "sf_future_self_audio_url";
const LS_AUDIO_B64         = "sf_future_self_audio";
const LS_AUDIO_TYPE        = "sf_future_self_audio_type";
const LS_AUDIO_DELETE_TOKEN = "sf_future_self_audio_delete_token";

/**
 * Upload a Blob to Cloudinary with real progress callbacks.
 *
 * @param blob       - The audio blob to upload
 * @param mimeType   - MIME type of the blob
 * @param onProgress - Called with 0–100 as bytes transfer
 * @param timeoutMs  - Abort if upload takes longer than this (default 60 s)
 */
export function uploadFutureSelfAudio(
  blob: Blob,
  mimeType: string,
  onProgress?: (pct: number) => void,
  timeoutMs = 60_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error("Cloudinary is not configured. Check your environment variables."));
      return;
    }

    const formData = new FormData();
    formData.append("file", blob);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "future-self-audio");
    formData.append("resource_type", "auto");

    const xhr = new XMLHttpRequest();

    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error("Upload timed out. Check your internet connection and try again."));
    }, timeoutMs);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const url: string = data.secure_url;
          const deleteToken: string = data.delete_token ?? "";

          try { localStorage.setItem(LS_AUDIO_URL, url); } catch {}
          try { localStorage.setItem(LS_AUDIO_DELETE_TOKEN, deleteToken); } catch {}

          resolve(url);
        } catch {
          reject(new Error("Unexpected response from Cloudinary."));
        }
      } else {
        let msg = "Upload failed.";
        try {
          const err = JSON.parse(xhr.responseText);
          msg = err?.error?.message ?? msg;
        } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Network error during upload. Please try again."));
    };

    xhr.onabort = () => {
      clearTimeout(timer);
      reject(new Error("Upload was cancelled."));
    };

    xhr.open("POST", UPLOAD_URL);
    xhr.send(formData);
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
 * Delete the user's stored audio file from Cloudinary using the delete token.
 */
export async function deleteFutureSelfAudioFromStorage(
  _audioUrl: string,
): Promise<void> {
  try {
    const deleteToken = localStorage.getItem(LS_AUDIO_DELETE_TOKEN);
    if (deleteToken) {
      await fetch(DELETE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: deleteToken }),
      });
    }
  } catch {}

  try {
    localStorage.removeItem(LS_AUDIO_URL);
    localStorage.removeItem(LS_AUDIO_B64);
    localStorage.removeItem(LS_AUDIO_TYPE);
    localStorage.removeItem(LS_AUDIO_DELETE_TOKEN);
  } catch {}
}

/**
 * Returns the best available audio source:
 *  1. Cached Cloudinary URL in localStorage (fastest on repeat visits)
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
