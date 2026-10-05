import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DataRequestStatus } from "@/components/DataRequestStatus";

type Notification = {
  _id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
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
      const data = await apiFetch<{ notifications: Notification[] }>("/notifications", {}, token || undefined);
      setItems(data.notifications);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (e: any) {
      const message = e?.message || "Unable to load notifications.";
      setLoadError(message);
      Alert.alert("Notifications", message);
    } finally {
      if (initialLoad) setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" }, token || undefined);
      setItems((current) => current.map((item) => item._id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (e: any) {
      Alert.alert("Notification", e.message);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>All important account and community activity.</Text>

      {!hasLoaded ? (
        <DataRequestStatus loading={loading} error={loadError} onRetry={load} message="Loading notifications..." />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No notification information was found.</Text>
      ) : null}

      {hasLoaded && items.map((item) => (
        <Pressable key={item._id} onPress={() => markRead(item._id)} style={[styles.card, !item.readAt && styles.unread]}>
          <View style={styles.row}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {!item.readAt && <View style={styles.dot} />}
          </View>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#F4F8FA", padding: 16 },
  title: { fontSize: 30, fontWeight: "900", color: "#173C5A" },
  subtitle: { color: "#6B6B6B", marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "#E4E8EB" },
  unread: { borderColor: "#E8A900", backgroundColor: "#FFF9EA" },
  row: { flexDirection: "row", alignItems: "center" },
  notificationTitle: { flex: 1, fontSize: 17, fontWeight: "900", color: "#173C5A" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E23B2E" },
  body: { color: "#4D4D4D", lineHeight: 21, marginTop: 7 },
  date: { color: "#8A8A8A", fontSize: 11, marginTop: 9 },
  empty: { textAlign: "center", color: "#777", marginTop: 50 }
});
