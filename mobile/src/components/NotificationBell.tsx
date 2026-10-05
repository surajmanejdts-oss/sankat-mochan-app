import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function NotificationBell() {
  const router = useRouter();
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoaded(true);
      return;
    }
    try {
      const data = await apiFetch<{ unreadCount: number }>("/notifications", {}, token);
      setUnread(data.unreadCount);
    } catch {
      // Keep the bell usable even if notifications are temporarily unavailable.
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <Pressable style={styles.button} onPress={() => router.push("/notifications") }>
      {loaded ? <Text style={styles.icon}>🔔</Text> : <ActivityIndicator size="small" color="#0D568B" />}
      {loaded && unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 2 },
  icon: { fontSize: 25 },
  badge: { position: "absolute", right: -1, top: -2, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: "#E23B2E", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" }
});
