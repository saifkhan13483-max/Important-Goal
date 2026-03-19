export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;

export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

export const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

/**
 * Uploads a File or Blob to Cloudinary using an unsigned upload preset.
 * Returns the secure_url of the uploaded asset.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  folder?: string
): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary environment variables are not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message ?? "Cloudinary upload failed"
    );
  }

  const data = await response.json();
  return data.secure_url as string;
}

/**
 * Convenience wrapper — kept for backwards compatibility with
 * existing image-upload call sites.
 */
export async function uploadImage(file: File): Promise<string> {
  return uploadToCloudinary(file);
}
