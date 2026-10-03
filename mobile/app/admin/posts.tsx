import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Post = {
  _id: string;
  text?: string;
  imageUrl?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: string;
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
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ posts: Post[] }>(
        "/admin/posts",
        {},
        token || undefined
      );

      setPosts(data.posts || []);
    } catch (e: any) {
      Alert.alert("Posts", e?.message || "Unable to load posts.");
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
<<<<<<< HEAD
      <Text style={styles.title}>All Community Posts</Text>

      <Text style={styles.subtitle}>
        All submitted member posts are shown here. Review pending posts,
        and manage approved or rejected posts.
=======
      <Text style={styles.title}>Post Approval</Text>

      <Text style={styles.subtitle}>
        Every member post is reviewed here before it reaches
        the community feed.
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
      </Text>

      {posts.map((post) => {
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
                  {post.author?.name || "Member"}
                </Text>

                <Text style={styles.username}>
                  @{post.author?.username || "unknown"}
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

      {!posts.length && (
        <Text style={styles.empty}>
          No posts have been submitted.
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