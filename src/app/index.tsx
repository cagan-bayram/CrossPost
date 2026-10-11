import { Text, View, StyleSheet, Button, Alert } from "react-native";
import { useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import {File} from "expo-file-system";


export default function Index() {
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const player = useVideoPlayer(video?.uri ?? null, (player) => {
    player.loop = true;
  });

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 180,
    });
    
    if (result.canceled) {
      return;
    }

    setVideo(result.assets[0]);
  }

  async function uploadVideo() {
    if (!video) return;
    
    const maxBytes = 50 * 1024 * 1024;
    if (video.fileSize && video.fileSize > maxBytes) {
      Alert.alert("Video too large", "Please pick a video under 50 MB.");
      return;
    }

    setProgress(0);

    try {
      const {data: {user}} = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Not signed in", "Please sign in again.");
        return;
      }

      const mimeType = video.mimeType ?? "video/mp4";
      const extension = mimeType.split("/")[1] ?? "mp4";
      const path = `${user.id}/${Date.now()}.${extension}`;

      const {data, error} = await supabase.storage
        .from("videos")
        .createSignedUploadUrl(path);

      if (error) {
        Alert.alert("Upload failed", error.message);
        return;
      }

      const result = await new File(video.uri).upload(data.signedUrl, {
        httpMethod: "PUT",
        headers: {"Content-Type": mimeType},
        onProgress: ({bytesSent, totalBytes}) => {
          setProgress(bytesSent / totalBytes);
        },
      });

      if (result.status >= 200 && result.status < 300) {
        Alert.alert("Uploaded!", path);
      } else {
        Alert.alert("Upload failed", `Status ${result.status}: ${result.body}`);
      }
    } catch (e) {
      Alert.alert("Upload failed", String(e));
    } finally {
      setProgress(null);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Pick a video" onPress={pickVideo} />
      <Button title="Sign out" onPress={() => supabase.auth.signOut()} />

      {video ? (
        <>
          <VideoView player={player} style={styles.video} nativeControls />
          <Text>Duration: {Math.round((video.duration ?? 0) / 1000)}s</Text>
          <Text>Size: {((video.fileSize ?? 0) / 1024 / 1024).toFixed(1)} MB</Text>
          <Button title={progress === null ? "Upload" : `Uploading ${Math.round(progress * 100)}%`} onPress={uploadVideo} disabled={progress !== null} />
        </>
      ): (
        <Text>No video selected</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  video: {
    width: 270,
    height: 480,
  },
});
