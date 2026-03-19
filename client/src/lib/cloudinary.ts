const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

export { CLOUD_NAME as CLOUDINARY_CLOUD_NAME, UPLOAD_PRESET as CLOUDINARY_UPLOAD_PRESET };

export const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

/**
 * Uploads a File or Blob to Cloudinary using an unsigned upload preset.
 * Returns the secure_url of the uploaded asset.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  folder: string
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary environment variables are not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url as string;
}

/**
 * Convenience wrapper for image uploads.
 */
export async function uploadImage(file: File, folder = "strivo/images"): Promise<string> {
  return uploadToCloudinary(file, folder);
}
