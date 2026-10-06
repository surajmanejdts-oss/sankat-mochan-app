import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { DataRequestStatus } from "@/components/DataRequestStatus";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Post = {
  _id: string;
  text?: string;
  imageUrl?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: string;
  authorName?: string;
  author?: {
    _id: string;
    name?: string;
    username?: string;
  };
};

type PostStatus = "pending" | "approved" | "rejected";

export default function AdminPosts() {
  const { token } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const initialLoad = !hasLoadedRef.current;
    if (initialLoad) setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<{ posts: Post[] }>(
        "/admin/posts",
        {},
        token || undefined
      );

      setPosts(data.posts || []);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (e: any) {
      const message = e?.message || "Unable to load posts.";
      setLoadError(message);
      Alert.alert("Posts", message);
    } finally {
      if (initialLoad) setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function moderate(
    id: string,
    action: "approve" | "reject"
  ) {
    try {
      await apiFetch(
        `/admin/posts/${id}/${action}`,
        {
          method: "PATCH",
        },
        token || undefined
      );

      Alert.alert(
        action === "approve" ? "Published" : "Rejected",
        action === "approve"
          ? "The post is now visible to verified members."
          : "The post was rejected."
      );

      await load();
    } catch (e: any) {
      Alert.alert(
        "Moderation failed",
        e?.message || "Unable to update the post."
      );
    }
  }

  async function remove(id: string) {
    Alert.alert(
      "Delete post",
      "Delete this post permanently?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(
                `/admin/posts/${id}`,
                {
                  method: "DELETE",
                },
                token || undefined
              );

              await load();
            } catch (e: any) {
              Alert.alert(
                "Delete failed",
                e?.message || "Unable to delete the post."
              );
            }
          },
        },
      ]
    );
  }

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function pickPostImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled) setPostImage(result.assets[0]);
  }

  async function publishPost() {
    if (!postText.trim() && !postImage) {
      Alert.alert("Empty post", "Add some text or an image.");
      return;
    }

    try {
      setPublishing(true);
      const body = new FormData();
      body.append("text", postText.trim());
      if (postImage) {
        const extension = postImage.uri.split(".").pop() || "jpg";
        body.append("image", {
          uri: postImage.uri,
          name: `admin-post.${extension}`,
          type: postImage.mimeType || "image/jpeg"
        } as any);
      }

      const result = await apiFetch<{ message: string }>(
        "/posts/admin",
        { method: "POST", body },
        token || undefined
      );
      setPostText("");
      setPostImage(null);
      await load();
      Alert.alert("Post published", result.message);
    } catch (error: any) {
      Alert.alert("Publish failed", error?.message || "Unable to publish the post.");
    } finally {
      setPublishing(false);
    }
  }

  function getStatus(post: Post): PostStatus {
    if (
      post.status === "approved" ||
      post.status === "rejected" ||
      post.status === "pending"
    ) {
      return post.status;
    }

    // Old posts that don't have a status are treated as pending.
    return "pending";
  }

  function getStatusLabel(status: PostStatus) {
    return status.toUpperCase();
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
        />
      }
    >
      <Text style={styles.title}>All Community Posts</Text>

      <Text style={styles.subtitle}>
        Publish community updates as admin, review pending member posts,
        and manage published or rejected posts.
      </Text>

      <View style={styles.composer}>
        <Text style={styles.composerTitle}>Publish as Admin</Text>
        <TextInput
          value={postText}
          onChangeText={setPostText}
          multiline
          placeholder="Write an announcement or community update..."
          placeholderTextColor="#7B8790"
          style={styles.composerInput}
          maxLength={2000}
          textAlignVertical="top"
        />
        {postImage ? (
          <Image source={{ uri: postImage.uri }} style={styles.composerImage} resizeMode="cover" />
        ) : null}
        <PrimaryButton
          title={postImage ? "Change Image" : "Add Image (Optional)"}
          secondary
          onPress={pickPostImage}
          disabled={publishing}
        />
        {postImage ? (
          <PrimaryButton
            title="Remove Image"
            danger
            onPress={() => setPostImage(null)}
            disabled={publishing}
          />
        ) : null}
        <PrimaryButton
          title={publishing ? "Publishing..." : "Publish Post"}
          onPress={publishPost}
          disabled={publishing}
          loading={publishing}
        />
      </View>

      {!hasLoaded ? (
        <DataRequestStatus loading={loading} error={loadError} onRetry={load} message="Loading community posts..." />
      ) : null}

      {hasLoaded && posts.map((post) => {
        const status = getStatus(post);

        return (
          <View
            key={post._id}
            style={[
              styles.card,
              status === "pending"
                ? styles.pending
                : status === "approved"
                ? styles.approved
                : styles.rejected,
            ]}
          >
            <View style={styles.header}>
              <View style={styles.authorContainer}>
                <Text style={styles.author}>
                  {post.author?.name || post.authorName || "Member"}
                </Text>

                <Text style={styles.username}>
                  @{post.author?.username || (post.authorName === "Admin" ? "admin" : "unknown")}
                </Text>
              </View>

              <Text
                style={[
                  styles.status,
                  status === "approved"
                    ? styles.approvedStatus
                    : status === "rejected"
                    ? styles.rejectedStatus
                    : styles.pendingStatus,
                ]}
              >
                {getStatusLabel(status)}
              </Text>
            </View>

            {post.text ? (
              <Text style={styles.text}>
                {post.text}
              </Text>
            ) : null}

            {post.imageUrl ? (
              <Image
                source={{ uri: post.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : null}

            {post.createdAt ? (
              <Text style={styles.date}>
                {new Date(post.createdAt).toLocaleString()}
              </Text>
            ) : null}

            {status === "pending" && (
              <View style={styles.actions}>
                <PrimaryButton
                  title="✓ Approve & Publish"
                  onPress={() =>
                    moderate(post._id, "approve")
                  }
                />

                <PrimaryButton
                  title="Reject"
                  danger
                  onPress={() =>
                    moderate(post._id, "reject")
                  }
                />
              </View>
            )}

            {status !== "pending" && (
              <View style={styles.deleteButton}>
                <PrimaryButton
                  title="Delete"
                  danger
                  onPress={() => remove(post._id)}
                />
              </View>
            )}
          </View>
        );
      })}

      {hasLoaded && !posts.length && (
        <Text style={styles.empty}>
          No community post information was found.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: "#F3F7FA",
    padding: 15,
  },

  title: {
    fontSize: 29,
    fontWeight: "900",
    color: "#173C5A",
  },

  subtitle: {
    color: "#777",
    marginTop: 3,
    marginBottom: 15,
    lineHeight: 20,
  },

  composer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D8E2E8",
    gap: 10
  },

  composerTitle: {
    color: "#173C5A",
    fontSize: 18,
    fontWeight: "900"
  },

  composerInput: {
    minHeight: 110,
    backgroundColor: "#F8FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#C9D4DB",
    fontSize: 15
  },

  composerImage: {
    width: "100%",
    height: 220,
    borderRadius: 12
  },

  card: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
  },

  pending: {
    backgroundColor: "#FFF6E5",
    borderColor: "#E8BD6A",
  },

  approved: {
    backgroundColor: "#EBF8F0",
    borderColor: "#86C9A3",
  },

  rejected: {
    backgroundColor: "#FFF0EF",
    borderColor: "#E3A09B",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  authorContainer: {
    flex: 1,
  },

  author: {
    fontSize: 18,
    fontWeight: "900",
    color: "#222",
  },

  username: {
    color: "#777",
    marginTop: 2,
  },

  status: {
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },

  pendingStatus: {
    color: "#B45309",
    backgroundColor: "#FEF3C7",
  },

  approvedStatus: {
    color: "#15803D",
    backgroundColor: "#DCFCE7",
  },

  rejectedStatus: {
    color: "#B91C1C",
    backgroundColor: "#FEE2E2",
  },

  text: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    marginTop: 12,
  },

  image: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    marginTop: 12,
  },

  date: {
    color: "#888",
    fontSize: 11,
    marginTop: 8,
  },

  actions: {
    marginTop: 10,
    gap: 8,
  },

  deleteButton: {
    marginTop: 10,
  },

  empty: {
    textAlign: "center",
    color: "#777",
    marginTop: 40,
  },
});