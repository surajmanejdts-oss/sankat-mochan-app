import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
<<<<<<< HEAD
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
=======
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";

type Application = { _id: string; submittedAt: string; };

export default function MemberHome() {
  const router = useRouter();
  const { token, user, logout, refreshUser } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      await refreshUser();
      const data = await apiFetch<{ application: Application | null }>("/applications/me", {}, token);
      setApplication(data.application);
    } catch (e: any) {
      if (!String(e.message).includes("Authentication")) Alert.alert("Error", e.message);
    }
  }, [token, refreshUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const verified = user?.status === "verified";

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <LogoHeader compact />
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
        </View>
        <View style={styles.headerActions}>
          <NotificationBell />
<<<<<<< HEAD
          {verified && (
            <Pressable
              style={styles.receiptButton}
              onPress={() => router.push("/member/receipts")}
            >
              <Text style={styles.receiptIcon}>🧾</Text>
            </Pressable>
          )}
=======
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
          <Text style={[styles.status, verified ? styles.verified : styles.pending]}>
            {verified ? "VERIFIED" : "PENDING"}
          </Text>
        </View>
      </View>

      {!application ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Complete your membership application</Text>
          <Text style={styles.body}>Fill the application form using the English version of the supplied membership form.</Text>
          <PrimaryButton title="Open Application Form" onPress={() => router.push("/member/application")} />
        </View>
      ) : (
        <View style={styles.card}>
<<<<<<< HEAD
          <Text style={styles.cardTitle}>
            {verified ? "Application verified ✓" : "Application submitted"}
          </Text>
          <Text style={styles.body}>
            {verified
              ? "Your membership application has been verified. Your membership receipt is available from the receipt icon above."
              : "Your application is under review. Please wait up to 24 hours while the administrator verifies your information."}
          </Text>
          <Text style={styles.small}>
            Submitted: {new Date(application.submittedAt).toLocaleString()}
          </Text>
=======
          <Text style={styles.cardTitle}>Application submitted</Text>
          <Text style={styles.body}>
            Your application is under review. Please wait up to 24 hours while the administrator verifies your information.
          </Text>
          <Text style={styles.small}>Submitted: {new Date(application.submittedAt).toLocaleString()}</Text>
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
        </View>
      )}

      {verified ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Community Feed</Text>
            <Text style={styles.body}>Verified members can see posts from other verified members.</Text>
            <PrimaryButton title="View Posts" secondary onPress={() => router.push("/member/feed")} />
            <PrimaryButton title="Create a Post" onPress={() => router.push("/member/post")} />
          </View>
        </>
      ) : (
        <View style={styles.locked}>
          <Text style={styles.lockTitle}>🔒 Community posts are locked</Text>
          <Text style={styles.body}>Posting and viewing other members' posts becomes available after admin verification.</Text>
        </View>
      )}

      <PrimaryButton title="Logout" danger onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#FFF9EA", padding: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
<<<<<<< HEAD
  receiptButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2
  },
  receiptIcon: { fontSize: 24 },
=======
>>>>>>> caae93ef0c476314d07c125b77e624082713f232
  greeting: { fontSize: 24, fontWeight: "900", color: "#173C5A" },
  username: { color: "#6B6B6B", marginTop: 2 },
  status: { fontWeight: "900", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, overflow: "hidden" },
  verified: { color: "#116B3A", backgroundColor: "#D9F4E5" },
  pending: { color: "#9A5C00", backgroundColor: "#FFE9BF" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 17, marginBottom: 14, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: "900", color: "#173C5A", marginBottom: 7 },
  body: { color: "#5A5A5A", lineHeight: 21 },
  small: { color: "#777", marginTop: 10, fontSize: 12 },
  locked: { backgroundColor: "#FFF0D6", borderRadius: 16, padding: 17, marginBottom: 14, borderWidth: 1, borderColor: "#F0C477" },
  lockTitle: { fontSize: 17, fontWeight: "900", color: "#925600", marginBottom: 6 }
});
