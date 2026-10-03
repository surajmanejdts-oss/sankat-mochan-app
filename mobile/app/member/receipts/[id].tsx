import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
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
  metadata?: Record<string, unknown>;
};

function formatMoney(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency
    }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString("en-IN")}`;
  }
}

function formatDate(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ReceiptDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = Array.isArray(id) ? id[0] : id;
  const { token, user } = useAuth();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!receiptId || !token) return;
    try {
      const data = await apiFetch<{ receipt: Receipt }>(
        `/receipts/${encodeURIComponent(receiptId)}`,
        {},
        token
      );
      setReceipt(data.receipt);
    } catch (error: any) {
      Alert.alert("Receipt", error?.message || "Unable to load receipt.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [receiptId, token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0D568B" />
        <Text style={styles.loadingText}>Loading receipt...</Text>
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyTitle}>Receipt unavailable</Text>
        <PrimaryButton
          title="Back to Receipts"
          secondary
          onPress={() => router.replace("/member/receipts")}
        />
      </View>
    );
  }

  const metadata = receipt.metadata || {};
  const textValue = (key: string) =>
    typeof metadata[key] === "string" ? String(metadata[key]) : "";
  const receiverName = textValue("recipientName") || user?.name || "Not provided";
  const donorName =
    textValue("donorName") ||
    (receipt.type === "application" ? user?.name : "") ||
    "Not provided";
  const purpose = textValue("purpose") || receipt.description || receipt.title;

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <Text style={styles.eyebrow}>INDIVIDUAL RECEIPT</Text>
      <Text style={styles.title}>{receipt.title}</Text>
      <Text style={styles.receiptNumber}>{receipt.receiptNumber}</Text>

      <View style={styles.amountPanel}>
        <Text style={styles.amountLabel}>Amount received</Text>
        <Text style={styles.amount}>
          {formatMoney(receipt.amount, receipt.currency)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>People</Text>
        <Detail label="Receiver name" value={receiverName} />
        <Detail label="Donor name" value={donorName} />
        <Detail label="Father / husband name" value={textValue("fatherOrHusbandName") || "Not provided"} />
        <Detail label="Address" value={textValue("address") || "Not provided"} />
        <Detail label="Mobile number" value={textValue("mobile") || "Not provided"} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Donation details</Text>
        <Detail label="Receipt number" value={receipt.receiptNumber} />
        <Detail label="Receipt date" value={formatDate(receipt.receiptDate)} />
        <Detail label="Amount in words" value={textValue("amountInWords") || "Not provided"} />
        <Detail label="Purpose" value={purpose} />
        <Detail label="Payment method" value={receipt.paymentMethod || "Not provided"} />
        <Detail label="Transaction reference" value={receipt.transactionReference || "Not provided"} />
      </View>

      <PrimaryButton
        title="Back to Receipts"
        secondary
        onPress={() => router.replace("/member/receipts")}
      />
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: "#FFF9EA",
    padding: 16
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF9EA",
    padding: 20
  },
  loadingText: { color: "#6B6B6B" },
  eyebrow: {
    color: "#8A5A00",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 8
  },
  title: {
    color: "#173C5A",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 5
  },
  receiptNumber: {
    color: "#777",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16
  },
  amountPanel: {
    backgroundColor: "#173C5A",
    borderRadius: 12,
    padding: 18,
    marginBottom: 14
  },
  amountLabel: { color: "#D9E8F1", fontSize: 13, fontWeight: "700" },
  amount: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5D9BD",
    padding: 16,
    marginBottom: 12
  },
  sectionTitle: {
    color: "#173C5A",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12
  },
  detail: {
    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
    paddingVertical: 9
  },
  detailLabel: { color: "#777", fontSize: 12, fontWeight: "700" },
  detailValue: { color: "#222", fontSize: 15, marginTop: 3 },
  emptyTitle: { color: "#173C5A", fontSize: 20, fontWeight: "900" }
});