import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { NotificationBell } from "@/components/NotificationBell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Receipt = {
  _id: string;
  receiptNumber: string;
  type: "application" | "manual";
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  category?: string;
  paymentMethod?: string;
  transactionReference?: string;
  receiptDate: string;
  issuedBy?: string;
  createdAt: string;
  metadata?: { recipientName?: string };
};

function money(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export default function MemberReceipts() {
  const router = useRouter();
  const { token } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ receipts: Receipt[] }>(
        "/receipts",
        {},
        token || undefined
      );
      setReceipts(data.receipts || []);
    } catch (e: any) {
      Alert.alert("Receipts", e?.message || "Unable to load receipts.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My Receipts</Text>
          <Text style={styles.subtitle}>
            Your membership and other receipts issued by the organization.
          </Text>
        </View>
        <NotificationBell />
      </View>

      {receipts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyTitle}>No receipts yet</Text>
          <Text style={styles.emptyText}>
            Your membership receipt will appear here after your application is
            verified. Any additional receipts sent by the admin will also
            appear here.
          </Text>
        </View>
      ) : (
        receipts.map((receipt) => (
          <Pressable
            style={styles.card}
            key={receipt._id}
            onPress={() => router.push(`/member/receipts/${receipt._id}`)}
            accessibilityRole="button"
            accessibilityLabel={`View receipt ${receipt.receiptNumber}`}
          >
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.receiptTitle}>{receipt.title}</Text>
                <Text style={styles.receiptNumber}>
                  {receipt.receiptNumber}
                </Text>
                {receipt.metadata?.recipientName ? (
                  <Text style={styles.receiptNumber}>
                    Receiver: {receipt.metadata.recipientName}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.amount}>{money(receipt.amount)}</Text>
            </View>

            <View style={styles.badgeRow}>
              <Text style={styles.badge}>
                {receipt.type === "application" ? "MEMBERSHIP" : "RECEIPT"}
              </Text>
              {receipt.category ? (
                <Text style={styles.category}>{receipt.category}</Text>
              ) : null}
            </View>

            {receipt.description ? (
              <Text style={styles.description}>{receipt.description}</Text>
            ) : null}

            <View style={styles.details}>
              <Detail
                label="Receipt date"
                value={new Date(receipt.receiptDate).toLocaleDateString()}
              />
              {receipt.paymentMethod ? (
                <Detail label="Payment method" value={receipt.paymentMethod} />
              ) : null}
              {receipt.transactionReference ? (
                <Detail
                  label="Transaction reference"
                  value={receipt.transactionReference}
                />
              ) : null}
              {receipt.issuedBy ? (
                <Detail label="Issued by" value={receipt.issuedBy} />
              ) : null}
            </View>
            <Text style={styles.viewDetails}>View full receipt details</Text>
          </Pressable>
        ))
      )}

      <PrimaryButton
        title="Back to Dashboard"
        secondary
        onPress={() => router.replace("/member")}
      />
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: "#FFF9EA",
    padding: 16
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  title: {
    fontSize: 29,
    fontWeight: "900",
    color: "#173C5A"
  },
  subtitle: {
    color: "#6B6B6B",
    lineHeight: 19,
    marginTop: 3,
    paddingRight: 10
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E5D9BD",
    elevation: 2
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  receiptTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#173C5A"
  },
  receiptNumber: {
    color: "#8A8A8A",
    fontSize: 11,
    marginTop: 4
  },
  amount: {
    fontSize: 21,
    fontWeight: "900",
    color: "#B3261E",
    marginLeft: 10
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10
  },
  badge: {
    backgroundColor: "#FFF0C7",
    color: "#8A5A00",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden"
  },
  category: {
    color: "#6D6D6D",
    fontSize: 12,
    fontWeight: "700"
  },
  description: {
    color: "#4E4E4E",
    lineHeight: 20,
    marginTop: 11
  },
  viewDetails: {
    color: "#0D568B",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6
  },
  details: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
    paddingTop: 10
  },
  detail: {
    marginBottom: 7
  },
  detailLabel: {
    color: "#8A8A8A",
    fontSize: 11,
    fontWeight: "700"
  },
  detailValue: {
    color: "#333",
    fontSize: 14,
    marginTop: 2
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 24,
    alignItems: "center",
    marginTop: 10
  },
  emptyIcon: {
    fontSize: 42
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#173C5A",
    marginTop: 8
  },
  emptyText: {
    textAlign: "center",
    color: "#6B6B6B",
    lineHeight: 21,
    marginTop: 7
  }
});
