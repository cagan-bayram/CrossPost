import { useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { supabase } from "@/lib/supabase";
import { MAX_VIDEO_BYTES, uploadVideo } from "@/lib/upload";

const PLATFORMS = ["tiktok", "instagram", "youtube"] as const;
type Platform = (typeof PLATFORMS)[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

export default function Index() {
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [progress, setProgress] = useState<number | null>(null);

  const player = useVideoPlayer(video?.uri ?? null, (player) => {
    player.loop = true;
  });

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 180,
    });

    if (result.canceled) return;

    setVideo(result.assets[0]);
  }

  function togglePlatform(platform: Platform, enabled: boolean) {
    setPlatforms((current) =>
      enabled ? [...current, platform] : current.filter((p) => p !== platform)
    );
  }

  function resetForm() {
    setVideo(null);
    setTitle("");
    setDescription("");
    setTagsText("");
    setPlatforms([]);
  }

  async function createPost() {
    if (!video) return;

    if (platforms.length === 0) {
      Alert.alert("No platforms selected", "Choose at least one platform.");
      return;
    }

    if (video.fileSize && video.fileSize > MAX_VIDEO_BYTES) {
      Alert.alert("Video too large", "Please pick a video under 50 MB.");
      return;
    }

    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Not signed in", "Please sign in again.");
        return;
      }

      const videoPath = await uploadVideo(video, user.id, setProgress);

      const tags = tagsText
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter((tag) => tag.length > 0);

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({ video_path: videoPath, title, description, tags })
        .select("id")
        .single();

      if (postError) throw postError;

      const { error: targetsError } = await supabase
        .from("post_targets")
        .insert(platforms.map((platform) => ({ post_id: post.id, platform })));

      if (targetsError) throw targetsError;

      Alert.alert("Post created", `Queued for ${platforms.length} platform(s).`);
      resetForm();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert("Could not create post", message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Button title="Pick a video" onPress={pickVideo} />

      {video ? (
        <>
          <VideoView player={player} style={styles.video} nativeControls />
          <Text style={styles.center}>
            {Math.round((video.duration ?? 0) / 1000)}s ·{" "}
            {((video.fileSize ?? 0) / 1024 / 1024).toFixed(1)} MB
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Tags, comma separated (e.g. cooking, pasta)"
            value={tagsText}
            onChangeText={setTagsText}
            autoCapitalize="none"
          />

          {PLATFORMS.map((platform) => (
            <View key={platform} style={styles.platformRow}>
              <Text>{PLATFORM_LABELS[platform]}</Text>
              <Switch
                value={platforms.includes(platform)}
                onValueChange={(enabled) => togglePlatform(platform, enabled)}
              />
            </View>
          ))}

          <Button
            title={
              progress === null
                ? "Post"
                : `Uploading ${Math.round(progress * 100)}%`
            }
            onPress={createPost}
            disabled={progress !== null}
          />
        </>
      ) : (
        <Text style={styles.center}>No video selected</Text>
      )}

      <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  video: {
    width: 270,
    height: 480,
    alignSelf: "center",
  },
  center: {
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  platformRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
