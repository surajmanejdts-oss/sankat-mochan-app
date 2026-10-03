import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Member = {
  id: string;
  name: string;
  username: string;
  phone: string;
  status: "pending" | "verified";
};

const PAYMENT_MODES = ["Cash", "Cheque", "UPI", "Bank Transfer"];

export default function AdminReceipts() {
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [donorName, setDonorName] = useState("");
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [amountInWords, setAmountInWords] = useState("");
  const [purpose, setPurpose] = useState("Donation to Sankat Mochan Seva Karya");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptDate, setReceiptDate] = useState("");

  const loadMembers = useCallback(async () => {
    try {
      const data = await apiFetch<{ members: Member[] }>(
        "/admin/receipt-recipients",
        {},
        token || undefined
      );
      setMembers(data.members || []);
    } catch (e: any) {
      Alert.alert("Members", e?.message || "Unable to load members.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const query = search.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const phoneQuery = search.replace(/\D/g, "");
  const filteredMembers = query
    ? members.filter((member) =>
        member.name.toLocaleLowerCase().replace(/\s+/g, " ").includes(query) ||
        member.username.toLocaleLowerCase().includes(query) ||
        (phoneQuery.length > 0 && member.phone.replace(/\D/g, "").includes(phoneQuery))
      )
    : members;

  const allVisibleSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((member) => selected.includes(member.id));

  function toggleMember(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleAllVisible() {
    const visibleIds = filteredMembers.map((member) => member.id);

    if (visibleIds.length === 0) return;

    if (visibleIds.every((id) => selected.includes(id))) {
      setSelected((current) =>
        current.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelected((current) => [
        ...current,
        ...visibleIds.filter((id) => !current.includes(id))
      ]);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await loadMembers();
    } finally {
      setRefreshing(false);
    }
  }

  async function sendReceipt() {
    if (!selected.length) {
      Alert.alert("Select members", "Select at least one member.");
      return;
    }

    if (!donorName.trim()) {
      Alert.alert("Donor name", "Enter the donor name for the receipt.");
      return;
    }

    if (!purpose.trim()) {
      Alert.alert("Donation purpose", "Enter the purpose of this donation.");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      Alert.alert("Receipt amount", "Enter a valid amount, for example 500.");
      return;
    }

    try {
      setSending(true);

      const data = await apiFetch<{ count: number; message: string }>(
        "/admin/receipts",
        {
          method: "POST",
          body: JSON.stringify({
            userIds: selected,
            donorName: donorName.trim(),
            fatherOrHusbandName: fatherOrHusbandName.trim(),
            address: address.trim(),
            mobile: mobile.trim(),
            amount: numericAmount,
            amountInWords: amountInWords.trim(),
            purpose: purpose.trim(),
            paymentMethod: paymentMode,
            transactionReference: paymentReference.trim(),
            receiptDate: receiptDate.trim()
          })
        },
        token || undefined
      );

      Alert.alert("Receipt sent", data.message);
      setSelected([]);
      setDonorName("");
      setFatherOrHusbandName("");
      setAddress("");
      setMobile("");
      setAmount("");
      setAmountInWords("");
      setPurpose("Donation to Sankat Mochan Seva Karya");
      setPaymentMode("Cash");
      setPaymentReference("");
      setReceiptDate("");
    } catch (e: any) {
      Alert.alert("Send receipt failed", e?.message || "Unable to send receipt.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <Text style={styles.title}>Send Receipt</Text>
      <Text style={styles.subtitle}>
        Create one receipt and send an individual copy to one or many members.
        Each selected member will receive a notification.
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Donation Receipt Details</Text>

        <Field
          label="Donor Name *"
          placeholder="Full name of the donor"
          value={donorName}
          onChangeText={setDonorName}
        />

        <Field
          label="Father / Husband Name"
          placeholder="Optional"
          value={fatherOrHusbandName}
          onChangeText={setFatherOrHusbandName}
        />

        <Field
          label="Address"
          placeholder="Donor address"
          multiline
          value={address}
          onChangeText={setAddress}
        />

        <Field
          label="Mobile Number"
          placeholder="Donor mobile number"
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={setMobile}
        />

        <Field
          label="Amount (INR) *"
          placeholder="Example: 500"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <Field
          label="Amount in Words"
          placeholder="Example: Five hundred rupees only"
          value={amountInWords}
          onChangeText={setAmountInWords}
        />

        <Field
          label="Donation Purpose *"
          placeholder="Purpose of donation"
          value={purpose}
          onChangeText={setPurpose}
        />

        <Text style={styles.fieldLabel}>Payment Mode</Text>
        <View style={styles.paymentModes}>
          {PAYMENT_MODES.map((mode) => (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: paymentMode === mode }}
              onPress={() => setPaymentMode(mode)}
              style={[
                styles.paymentMode,
                paymentMode === mode && styles.paymentModeSelected
              ]}
            >
              <Text
                style={[
                  styles.paymentModeText,
                  paymentMode === mode && styles.paymentModeTextSelected
                ]}
              >
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field
          label="Cheque / Transaction Number"
          placeholder="Optional"
          value={paymentReference}
          onChangeText={setPaymentReference}
        />

        <Field
          label="Receipt Date"
          placeholder="DD/MM/YYYY (leave blank for today)"
          value={receiptDate}
          onChangeText={setReceiptDate}
        />
      </View>

      <View style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Select Members</Text>
            <Text style={styles.selectionText}>
              {selected.length} selected of {members.length}
            </Text>
          </View>
          <Pressable style={styles.selectAll} onPress={toggleAllVisible}>
            <View
              style={[
                styles.checkbox,
                allVisibleSelected && styles.checkboxSelected
              ]}
            >
              {allVisibleSelected ? (
                <Text style={styles.check}>✓</Text>
              ) : null}
            </View>
            <Text style={styles.selectAllText}>Select All</Text>
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by member name or phone number"
          placeholderTextColor="#8A8A8A"
          style={styles.search}
        />

        {search.trim() ? (
          <Text style={styles.searchHint}>
            Showing {filteredMembers.length} matching member
            {filteredMembers.length === 1 ? "" : "s"}.
          </Text>
        ) : null}

        {filteredMembers.map((member) => {
          const checked = selected.includes(member.id);

          return (
            <Pressable
              key={member.id}
              onPress={() => toggleMember(member.id)}
              style={[styles.memberRow, checked && styles.memberSelected]}
            >
              <View style={[styles.checkbox, checked && styles.checkboxSelected]}>
                {checked ? <Text style={styles.check}>✓</Text> : null}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberMeta}>
                  @{member.username}
                  {member.phone ? ` • ${member.phone}` : " • Phone not provided"}
                </Text>
              </View>

              <Text
                style={[
                  styles.status,
                  member.status === "verified"
                    ? styles.verified
                    : styles.pending
                ]}
              >
                {member.status.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}

        {filteredMembers.length === 0 && (
          <Text style={styles.empty}>
            No members match your search.
          </Text>
        )}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Ready to send</Text>
        <Text style={styles.summaryText}>
          {selected.length} receiver{selected.length === 1 ? "" : "s"} selected
          {amount ? ` • ₹${Number(amount || 0).toLocaleString("en-IN")} each` : ""}
        </Text>
        <Text style={styles.summaryNote}>
          Each selected member&apos;s name will appear as the receiver on their receipt.
        </Text>
      </View>

      <PrimaryButton
        title={sending ? "Sending..." : `Send Receipt to ${selected.length} Member${selected.length === 1 ? "" : "s"}`}
        onPress={sendReceipt}
        disabled={sending}
      />

      <PrimaryButton
        title="Clear Selection"
        secondary
        onPress={() => setSelected([])}
        disabled={sending || selected.length === 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: "#F3F7FA",
    padding: 15
  },
  title: {
    fontSize: 29,
    fontWeight: "900",
    color: "#173C5A"
  },
  subtitle: {
    color: "#777",
    lineHeight: 20,
    marginTop: 3,
    marginBottom: 14
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 13
  },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 13
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#173C5A"
  },
  fieldLabel: {
    color: "#173C5A",
    fontWeight: "700",
    marginBottom: 8
  },
  paymentModes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  paymentMode: {
    minHeight: 40,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A9C0D0",
    backgroundColor: "#F9FCFD",
    paddingHorizontal: 12,
    borderRadius: 8
  },
  paymentModeSelected: {
    borderColor: "#0D568B",
    backgroundColor: "#E7F2F8"
  },
  paymentModeText: { color: "#354B5A", fontWeight: "700" },
  paymentModeTextSelected: { color: "#0D568B" },
  selectionText: {
    color: "#777",
    marginTop: 2,
    fontSize: 12
  },
  selectAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 8
  },
  selectAllText: {
    color: "#0D568B",
    fontWeight: "900",
    fontSize: 13
  },
  search: {
    borderWidth: 1,
    borderColor: "#A9C0D0",
    backgroundColor: "#F9FCFD",
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: "#15212B",
    marginBottom: 8
  },
  searchHint: {
    color: "#777",
    fontSize: 12,
    marginBottom: 7
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
    paddingVertical: 12,
    gap: 10
  },
  memberSelected: {
    backgroundColor: "#F0F8FF",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CB1BE",
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxSelected: {
    backgroundColor: "#0D568B",
    borderColor: "#0D568B"
  },
  check: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16
  },
  memberName: {
    color: "#222",
    fontSize: 15,
    fontWeight: "900"
  },
  memberMeta: {
    color: "#777",
    fontSize: 11,
    marginTop: 3
  },
  status: {
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden"
  },
  verified: {
    color: "#12663A",
    backgroundColor: "#D9F4E5"
  },
  pending: {
    color: "#925600",
    backgroundColor: "#FFE8BD"
  },
  empty: {
    textAlign: "center",
    color: "#777",
    paddingVertical: 25
  },
  summary: {
    backgroundColor: "#FFF4D6",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8C56D",
    marginBottom: 5
  },
  summaryTitle: {
    color: "#7B5200",
    fontWeight: "900"
  },
  summaryText: {
    color: "#6A5A35",
    marginTop: 3
  },
  summaryNote: {
    color: "#6A5A35",
    fontSize: 12,
    marginTop: 7
  }
});
