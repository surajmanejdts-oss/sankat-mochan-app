import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataRequestStatus } from "@/components/DataRequestStatus";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Post = {
  _id: string;
  text: string;
  imageUrl: string;
  createdAt: string;
  author?: { name: string; username: string };
};

export default function Feed() {
  const router = useRouter();
  const { token } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
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
      const data = await apiFetch<{ posts: Post[] }>("/posts", {}, token || undefined);
      setPosts(data.posts);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (e: any) {
      const message = e?.message || "Unable to load posts.";
      setLoadError(message);
      Alert.alert("Unable to load posts", message);
    } finally {
      if (initialLoad) setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.top}>
        <Text style={styles.title}>Community Feed</Text>
        <PrimaryButton title="+ Post" onPress={() => router.push("/member/post")} />
      </View>

      {!hasLoaded ? (
        <DataRequestStatus loading={loading} error={loadError} onRetry={load} message="Loading community posts..." />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>No community post information was found.</Text>
      ) : null}

      {hasLoaded && posts.map((post) => (
        <View style={styles.post} key={post._id}>
          <Text style={styles.author}>{post.author?.name || "Member"} <Text style={styles.handle}>@{post.author?.username}</Text></Text>
          <Text style={styles.date}>{new Date(post.createdAt).toLocaleString()}</Text>
          {post.text ? <Text style={styles.text}>{post.text}</Text> : null}
          {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} /> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#F4F8FA", padding: 14 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 27, fontWeight: "900", color: "#173C5A" },
  post: { backgroundColor: "#fff", borderRadius: 16, padding: 15, marginBottom: 14, elevation: 2 },
  author: { fontSize: 17, fontWeight: "900", color: "#173C5A" },
  handle: { fontSize: 13, fontWeight: "600", color: "#777" },
  date: { color: "#8A8A8A", fontSize: 11, marginTop: 2, marginBottom: 10 },
  text: { fontSize: 16, lineHeight: 23, color: "#272727", marginBottom: 10 },
  image: { width: "100%", height: 320, borderRadius: 12, backgroundColor: "#eee" },
  empty: { textAlign: "center", color: "#777", marginTop: 40 }
});
