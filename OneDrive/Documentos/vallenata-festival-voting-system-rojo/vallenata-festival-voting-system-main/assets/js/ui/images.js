const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SIDE_PX = 640;
const JPEG_QUALITY = 0.82;

export const IMAGE_ACCEPT = ACCEPTED_TYPES.join(",");

export async function prepareOptionImage(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: "La imagen debe ser JPG, PNG o WebP." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "La imagen supera 2 MB. Elige una más liviana." };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return { ok: true, dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY) };
  } catch {
    return { ok: false, error: "No se pudo leer la imagen. Prueba con otro archivo." };
  }
}
