import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";

type Notification = { _id: string; title: string; body: string; type: string; createdAt: string; readAt: string | null };

export default function AdminDashboard() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: Notification[] }>("/admin/notifications", {}, token || undefined);
      setNotifications(data.notifications);
    } catch (e: any) {
      Alert.alert("Dashboard error", e.message);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const pending = notifications.filter((n) => !n.readAt);
  const postActions = notifications.filter((n) => n.type === "post_submitted").length;

  return (
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <LogoHeader compact />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Sankat Mochan Sevarth Sanstha</Text>
        </View>
        <NotificationBell />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statNumber}>{pending.length}</Text><Text style={styles.statLabel}>Pending</Text></View>
        <View style={styles.stat}><Text style={styles.statNumber}>{postActions}</Text><Text style={styles.statLabel}>Post reviews</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 New / Recent Members</Text>
        {notifications.length === 0 && <Text style={styles.muted}>No notifications yet.</Text>}
        {notifications.slice(0, 10).map((n) => (
          <View style={styles.notification} key={n._id}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{n.title}</Text>
              <Text style={styles.user}>{n.body}</Text>
            </View>
            <Text style={styles.date}>{new Date(n.createdAt).toLocaleDateString()}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton title="👥 Open Members" secondary onPress={() => router.push("/admin/members")} />
      <PrimaryButton title="🧾 Send Receipt" onPress={() => router.push("/admin/receipts")} />
      <PrimaryButton title="📝 View All Posts" secondary onPress={() => router.push("/admin/posts")} />
      <PrimaryButton title="🔔 All Notifications" secondary onPress={() => router.push("/notifications")} />
      <PrimaryButton title="Logout" danger onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#F3F7FA", padding: 16 },
  header: { backgroundColor: "#0D568B", borderRadius: 18, padding: 18, marginBottom: 14, flexDirection: "row", alignItems: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#D7EDFA", marginTop: 3 },
  date: { color: "#777", fontSize: 11 },
  stats: { flexDirection: "row", gap: 12, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: "#fff", padding: 18, borderRadius: 15, alignItems: "center", elevation: 2 },
  statNumber: { fontSize: 30, fontWeight: "900", color: "#D88700" },
  statLabel: { color: "#666", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 15, marginBottom: 12 },
  cardTitle: { fontSize: 19, fontWeight: "900", color: "#173C5A", marginBottom: 12 },
  notification: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#EEF1F3" },
  name: { fontWeight: "800", color: "#222" },
  user: { color: "#888", marginTop: 2 },
  status: { fontSize: 12, fontWeight: "900", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, overflow: "hidden" },
  vStatus: { color: "#12663A", backgroundColor: "#D9F4E5" },
  pStatus: { color: "#9B5B00", backgroundColor: "#FFE8BD" },
  muted: { color: "#777" }
});
