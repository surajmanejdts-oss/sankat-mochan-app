import { useRouter } from "expo-router";
import React, { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

export default function CreatePost() {
  const router = useRouter();
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled) setImage(result.assets[0]);
  }

  async function submit() {
    if (!text.trim() && !image) return Alert.alert("Empty post", "Add text or an image.");
    try {
      setLoading(true);
      const data = new FormData();
      data.append("text", text.trim());

      if (image) {
        const ext = image.uri.split(".").pop() || "jpg";
        data.append("image", {
          uri: image.uri,
          name: `post.${ext}`,
          type: image.mimeType || "image/jpeg"
        } as any);
      }

      await apiFetch("/posts", { method: "POST", body: data }, token || undefined);
      Alert.alert("Submitted", "Your post was sent to the admin for approval. You will receive a notification when it is approved or rejected.", [
        { text: "View Feed", onPress: () => router.replace("/member/feed") }
      ]);
    } catch (e: any) {
      Alert.alert("Post failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Create Post</Text>
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Write something for the community..."
        placeholderTextColor="#8A8A8A"
        style={styles.input}
      />
      {image && <Image source={{ uri: image.uri }} style={styles.preview} />}
      <PrimaryButton title={image ? "Change Image" : "Choose Image"} secondary onPress={pickImage} />
      <PrimaryButton title={loading ? "Posting..." : "Publish Post"} onPress={submit} disabled={loading} />
      <PrimaryButton title="Cancel" danger onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#FFF9EA", padding: 18 },
  title: { fontSize: 28, fontWeight: "900", color: "#173C5A", marginBottom: 15 },
  input: { minHeight: 160, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#B9C8D2", textAlignVertical: "top", fontSize: 16 },
  preview: { width: "100%", height: 280, borderRadius: 14, marginTop: 12 }
});
