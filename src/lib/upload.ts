import type { ImagePickerAsset } from "expo-image-picker";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function uploadVideo(
  video: ImagePickerAsset,
  userId: string,
  onProgress: (fraction: number) => void
): Promise<string> {
  const mimeType = video.mimeType ?? "video/mp4";
  const extension = mimeType.split("/")[1] ?? "mp4";
  const path = `${userId}/${Date.now()}.${extension}`;

  const { data, error } = await supabase.storage
    .from("videos")
    .createSignedUploadUrl(path);

  if (error) throw error;

  const result = await new File(video.uri).upload(data.signedUrl, {
    httpMethod: "PUT",
    headers: { "Content-Type": mimeType },
    onProgress: ({ bytesSent, totalBytes }) => onProgress(bytesSent / totalBytes),
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed with status ${result.status}: ${result.body}`);
  }

  return path;
}
