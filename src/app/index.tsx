import { Text, View, StyleSheet, Button } from "react-native";
import { useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";


export default function Index() {
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const player = useVideoPlayer(video?.uri ?? null, (player) => {
    player.loop = true;
  });

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 1200,
    });
    
    if (result.canceled) {
      return;
    }

    setVideo(result.assets[0]);
  }

  return (
    <View style={styles.container}>
      <Button title="Pick a video" onPress={pickVideo} />

      {video ? (
        <>
          <VideoView player={player} style={styles.video} nativeControls />
          <Text>Duration: {Math.round((video.duration ?? 0) / 1000)}s</Text>
          <Text>Size: {((video.fileSize ?? 0) / 1024 / 1024).toFixed(1)} MB</Text>
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
