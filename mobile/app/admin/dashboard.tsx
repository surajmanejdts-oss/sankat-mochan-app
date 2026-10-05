import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataRequestStatus } from "@/components/DataRequestStatus";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";

type Notification = { _id: string; title: string; body: string; type: string; createdAt: string; readAt: string | null };

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingMemberCount, setPendingMemberCount] = useState(0);
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
      const [notificationData, memberData] = await Promise.all([
        apiFetch<{ notifications: Notification[] }>("/admin/notifications", {}, token || undefined),
        apiFetch<{ members: { status: string }[] }>("/admin/members", {}, token || undefined)
      ]);
      setNotifications(notificationData.notifications);
      setPendingMemberCount(memberData.members.filter((member) => member.status === "pending").length);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (e: any) {
      const message = e?.message || "Unable to load dashboard information.";
      setLoadError(message);
      Alert.alert("Dashboard error", message);
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

  const postActions = notifications.filter((n) => n.type === "post_submitted").length;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            accessibilityLabel="Sankat Mochan app logo"
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Sankat Mochan Sevarth Sanstha</Text>
          </View>
        </View>
        <NotificationBell />
      </View>

      <View style={styles.stats}>
        {!hasLoaded ? (
          loadError ? (
            <DataRequestStatus loading={loading} error={loadError} onRetry={load} message="Loading dashboard information..." />
          ) : (
            <>
              <View style={styles.stat}>
                <ActivityIndicator size="small" color="#0D568B" />
                <Text style={styles.statLabel}>Loading...</Text>
              </View>
              <View style={styles.stat}>
                <ActivityIndicator size="small" color="#0D568B" />
                <Text style={styles.statLabel}>Loading...</Text>
              </View>
            </>
          )
        ) : (
          <>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{pendingMemberCount}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>Pending</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{postActions}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>Post reviews</Text>
            </View>
          </>
        )}
      </View>

      <View style={actionStyles.heading}>
        <Text style={actionStyles.title}>Quick actions</Text>
        <Text style={actionStyles.subtitle}>Manage the community</Text>
      </View>
      <View style={actionStyles.grid}>
        <DashboardAction
          title="Members"
          subtitle="Review accounts"
          icon="account-group-outline"
          iconColor="#0D568B"
          iconBackground="#E5F1F8"
          onPress={() => router.push("/admin/members")}
        />
        <DashboardAction
          title="Register member"
          subtitle="Create a member account"
          icon="account-plus-outline"
          iconColor="#16734C"
          iconBackground="#E2F3E9"
          onPress={() => router.push("/admin/register")}
        />
        <DashboardAction
          title="Reports"
          subtitle="Select members and export PDF"
          icon="file-chart-outline"
          iconColor="#6E4BA1"
          iconBackground="#F0E9FA"
          onPress={() => router.push("/admin/reports")}
        />
        <DashboardAction
          title="Send receipt"
          subtitle="Issue a donation receipt"
          icon="receipt-text-outline"
          iconColor="#A85F00"
          iconBackground="#FFF0D2"
          onPress={() => router.push("/admin/receipts")}
        />
        <DashboardAction
          title="Posts"
          subtitle="Review submissions"
          icon="text-box-check-outline"
          iconColor="#16734C"
          iconBackground="#E2F3E9"
          onPress={() => router.push("/admin/posts")}
        />
        <DashboardAction
          title="Notifications"
          subtitle="View all activity"
          icon="bell-outline"
          iconColor="#A84336"
          iconBackground="#FBE9E5"
          onPress={() => router.push("/notifications")}
        />
      </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <PrimaryButton title="Logout" danger onPress={logout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F7FA" },
  scroll: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: "#F3F7FA", padding: 16, paddingBottom: 24 },
  footer: { backgroundColor: "#F3F7FA", paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E1E8EC" },
  header: { backgroundColor: "#0D568B", borderRadius: 18, padding: 16, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center" },
  logo: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  subtitle: { color: "#D7EDFA", marginTop: 3 },
  stats: { flexDirection: "row", gap: 12, marginBottom: 14 },
  stat: { flex: 1, minWidth: 0, height: 96, backgroundColor: "#fff", paddingHorizontal: 12, borderRadius: 15, alignItems: "center", justifyContent: "center", elevation: 2 },
  statNumber: { fontSize: 30, fontWeight: "900", color: "#D88700" },
  statLabel: { color: "#666", fontWeight: "700" },
});

type DashboardActionProps = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconColor: string;
  iconBackground: string;
  onPress: () => void;
};

function DashboardAction({
  title,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  onPress
}: DashboardActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [actionStyles.action, pressed && actionStyles.actionPressed]}
    >
      <View style={[actionStyles.icon, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons name={icon} size={23} color={iconColor} />
      </View>
      <Text style={actionStyles.label}>{title}</Text>
      <Text style={actionStyles.description}>{subtitle}</Text>
      <MaterialCommunityIcons
        name="arrow-top-right"
        size={17}
        color="#84919A"
        style={actionStyles.arrow}
      />
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  heading: { marginTop: 3, marginBottom: 10 },
  title: { color: "#173C5A", fontSize: 19, fontWeight: "900" },
  subtitle: { color: "#6C777D", fontSize: 12, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10, marginBottom: 10 },
  action: { width: "48%", minHeight: 130, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8EB", padding: 13, marginBottom: 2 },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  label: { color: "#173C5A", fontSize: 15, fontWeight: "900" },
  description: { color: "#6C777D", fontSize: 11, lineHeight: 15, marginTop: 3, paddingRight: 8 },
  arrow: { position: "absolute", right: 11, top: 12 }
});
