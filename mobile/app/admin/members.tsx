import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DataRequestStatus } from "@/components/DataRequestStatus";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Member = {
  _id: string;
  name: string;
  username: string;
  status: "pending" | "verified";
  createdAt: string;
  application: any;
};

export default function Members() {
  const router = useRouter();
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
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
      const data = await apiFetch<{ members: Member[] }>("/admin/members", {}, token || undefined);
      setMembers(data.members);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (e: any) {
      const message = e?.message || "Unable to load members.";
      setLoadError(message);
      Alert.alert("Members error", message);
    } finally {
      if (initialLoad) setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function verify(id: string) {
    try {
      await apiFetch(`/admin/members/${id}/verify`, { method: "PATCH" }, token || undefined);
      Alert.alert("Verified", "Member has been verified.");
      load();
    } catch (e: any) {
      Alert.alert("Verification failed", e.message);
    }
  }

  async function remove(id: string) {
    Alert.alert("Delete member", "This deletes the account, application and posts. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/admin/members/${id}`, { method: "DELETE" }, token || undefined);
            load();
          } catch (e: any) {
            Alert.alert("Delete failed", e.message);
          }
        }
      }
    ]);
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
      <Text style={styles.title}>All Members</Text>

      {!hasLoaded ? (
        <DataRequestStatus loading={loading} error={loadError} onRetry={load} message="Loading members..." />
      ) : members.map((member) => (
        <View key={member._id} style={[styles.card, member.status === "verified" ? styles.verifiedCard : styles.pendingCard]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{member.name}</Text>
              <Text style={styles.username}>{member.username}</Text>
              {member.status === "pending" && !member.application && (
                <Text style={styles.applicationMissing}>Application not submitted</Text>
              )}
            </View>
            <Text style={[styles.status, member.status === "verified" ? styles.verified : styles.pending]}>
              {member.status.toUpperCase()}
            </Text>
          </View>

          <View style={styles.actions}>
            {member.status === "verified" && (
              <PrimaryButton title="Edit member" secondary onPress={() => router.push(`/admin/members/${member._id}?edit=1`)} />
            )}
            {member.status === "pending" && member.application && (
              <PrimaryButton title="✓ Verify" onPress={() => verify(member._id)} />
            )}
            <PrimaryButton title="View" secondary onPress={() => router.push(`/admin/members/${member._id}`)} />
            <PrimaryButton title="Delete" danger onPress={() => remove(member._id)} />
          </View>
        </View>
      ))}

      {hasLoaded && members.length === 0 && <Text style={styles.empty}>No member information was found.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: "#F3F7FA", padding: 15 },
  title: { fontSize: 29, fontWeight: "900", color: "#173C5A", marginBottom: 14 },
  card: { borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1 },
  pendingCard: { backgroundColor: "#FFF6E5", borderColor: "#E8BD6A" },
  verifiedCard: { backgroundColor: "#EBF8F0", borderColor: "#86C9A3" },
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 19, fontWeight: "900", color: "#1F1F1F" },
  username: { color: "#777", marginTop: 3 },
  applicationMissing: { color: "#925600", fontSize: 12, marginTop: 5 },
  status: { fontSize: 11, fontWeight: "900", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, overflow: "hidden" },
  verified: { color: "#12663A", backgroundColor: "#D0F0DC" },
  pending: { color: "#925600", backgroundColor: "#FFE2AA" },
  actions: { marginTop: 12, gap: 2 },
  empty: { textAlign: "center", color: "#777", marginTop: 30 }
});
