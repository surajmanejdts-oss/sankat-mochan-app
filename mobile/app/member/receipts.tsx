import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import { NotificationBell } from "@/components/NotificationBell";
import { DataRequestStatus } from "@/components/DataRequestStatus";
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
  memberDetails?: {
    donorName?: string;
    fatherOrHusbandName?: string;
    address?: string;
    mobile?: string;
  };
};

function money(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character] || character);
}

function metadataText(receipt: Receipt, key: string) {
  const value = receipt.metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function receiptDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function hindiNumberWords(value: number): string {
  const ones = [
    "शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
    "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस"
  ];
  const tens = ["", "", "बीस", "तीस", "चालीस", "पचास", "साठ", "सत्तर", "अस्सी", "नब्बे"];
  const irregularTens: Record<number, string> = {
    21: "इक्कीस", 22: "बाईस", 23: "तेईस", 24: "चौबीस", 25: "पच्चीस",
    26: "छब्बीस", 27: "सत्ताईस", 28: "अट्ठाईस", 29: "उनतीस",
    31: "इकतीस", 32: "बत्तीस", 33: "तैंतीस", 34: "चौंतीस", 35: "पैंतीस",
    36: "छत्तीस", 37: "सैंतीस", 38: "अड़तीस", 39: "उनतालीस",
    41: "इकतालीस", 42: "बयालीस", 43: "तैंतालीस", 44: "चवालीस", 45: "पैंतालीस",
    46: "छियालीस", 47: "सैंतालीस", 48: "अड़तालीस", 49: "उनचास",
    51: "इक्यावन", 52: "बावन", 53: "तिरपन", 54: "चौवन", 55: "पचपन",
    56: "छप्पन", 57: "सत्तावन", 58: "अट्ठावन", 59: "उनसठ",
    61: "इकसठ", 62: "बासठ", 63: "तिरसठ", 64: "चौंसठ", 65: "पैंसठ",
    66: "छियासठ", 67: "सड़सठ", 68: "अड़सठ", 69: "उनहत्तर",
    71: "इकहत्तर", 72: "बहत्तर", 73: "तिहत्तर", 74: "चौहत्तर", 75: "पचहत्तर",
    76: "छिहत्तर", 77: "सतहत्तर", 78: "अठहत्तर", 79: "उनासी",
    81: "इक्यासी", 82: "बयासी", 83: "तिरासी", 84: "चौरासी", 85: "पचासी",
    86: "छियासी", 87: "सतासी", 88: "अट्ठासी", 89: "नवासी",
    91: "इक्यानवे", 92: "बानवे", 93: "तिरानवे", 94: "चौरानवे", 95: "पचानवे",
    96: "छियानवे", 97: "सत्तानवे", 98: "अट्ठानवे", 99: "निन्यानवे"
  };
  const underThousand = (number: number): string => {
    if (number < 20) return ones[number];
    if (number < 100) {
      return irregularTens[number] || tens[Math.floor(number / 10)];
    }
    return `${ones[Math.floor(number / 100)]} सौ${number % 100 ? ` ${underThousand(number % 100)}` : ""}`;
  };

  if (!Number.isFinite(value) || value < 0 || value > 999999999) return "-";
  const number = Math.floor(value);
  if (number === 0) return "शून्य";
  const units: [number, string][] = [
    [10000000, "करोड़"],
    [100000, "लाख"],
    [1000, "हज़ार"],
    [100, "सौ"]
  ];
  const parts: string[] = [];
  let remaining = number;
  for (const [unit, label] of units) {
    const count = Math.floor(remaining / unit);
    if (count > 0) {
      parts.push(`${underThousand(count)} ${label}`);
      remaining %= unit;
    }
  }
  if (remaining > 0) parts.push(underThousand(remaining));
  return parts.join(" ");
}

function paymentMode(receipt: Receipt) {
  const method = (receipt.paymentMethod || "").toLocaleLowerCase();
  const isCash = method.includes("cash") || method.includes("नकद");
  const isTransfer = ["cheque", "check", "upi", "bank", "transfer", "चेक", "बैंक"]
    .some((keyword) => method.includes(keyword));
  return { isCash, isTransfer };
}

function createReceiptHtml(
  receipt: Receipt,
  memberName: string,
  logoDataUri: string
) {
  const donor = receipt.memberDetails?.donorName?.trim() ||
    metadataText(receipt, "donorName") ||
    metadataText(receipt, "recipientName") || memberName.trim() || "-";
  const fatherName = receipt.memberDetails?.fatherOrHusbandName?.trim() ||
    metadataText(receipt, "fatherOrHusbandName") || "-";
  const address = receipt.memberDetails?.address?.trim() ||
    metadataText(receipt, "address") || "-";
  const mobile = receipt.memberDetails?.mobile?.trim() ||
    metadataText(receipt, "mobile") || "-";
  const method = receipt.paymentMethod?.trim() || "";
  const transactionReference = receipt.transactionReference?.trim() || "";
  const purpose = "संकट मोचन सेवा कार्य हेतु दान";
  const amountLabel = receipt.type === "application" ? "सदस्यता शुल्क" : "सहयोग राशि";
  const amount = Number(receipt.amount || 0);
  const totalPaise = Math.round(amount * 100);
  const amountWhole = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const amountWords = `${hindiNumberWords(amountWhole)} रुपये${paise ? ` ${hindiNumberWords(paise)} पैसे` : ""} मात्र`;
  const { isCash, isTransfer } = paymentMode({ ...receipt, paymentMethod: method });
  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  return `<!DOCTYPE html>
    <html lang="hi">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 9mm 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, "Noto Sans Devanagari", sans-serif; color: #171717; font-size: 11pt; }
          .receipt { width: 100%; }
          .masthead { display: grid; grid-template-columns: 112px 1fr 112px; align-items: center; text-align: center; }
          .logo { width: 92px; height: 92px; object-fit: contain; justify-self: center; }
          .organization { margin: 0; color: #111E3C; font-size: 23pt; font-weight: bold; white-space: nowrap; }
          .registration { margin: 3px 0 0; font-size: 12pt; }
          .address { margin: 4px 0 0; font-size: 11pt; }
          .title-row { display: flex; align-items: center; gap: 12px; margin: 12px 0 9px; }
          .title-row::before, .title-row::after { content: ""; flex: 1; border-top: 1px solid #888; }
          h1 { margin: 0; padding: 5px 16px; background: #C96719; color: white; font-size: 16pt; }
          .receipt-meta { display: flex; justify-content: space-between; gap: 20px; margin: 0 0 8px; font-size: 16pt; font-weight: bold; }
          .details { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .details td { padding: 4px 2px; vertical-align: bottom; }
          .dotted { border-bottom: 1px dotted #555; }
          .label { white-space: nowrap; }
          .amounts { margin: 9px 0 7px; padding: 5px 8px; background: #F0F0EE; }
          .amount-line { display: flex; align-items: baseline; gap: 8px; padding: 3px 0; }
          .amount-line .fill { flex: 1; border-bottom: 1px dotted #555; }
          .amount-value { font-size: 15pt; font-weight: bold; }
          .purpose { margin: 5px 0 8px; }
          .purpose-text { text-align: center; font-weight: bold; margin-top: 4px; }
          .payment { display: flex; align-items: center; gap: 17px; border-bottom: 1px solid #888; padding: 5px 0 10px; white-space: nowrap; }
          .checkbox { display: inline-block; width: 13px; height: 13px; border: 1px solid #555; vertical-align: -2px; margin: 0 4px 0 6px; text-align: center; line-height: 12px; font-size: 10pt; }
          .signatures { display: grid; grid-template-columns: 1fr 1.1fr 1fr; align-items: center; min-height: 76px; text-align: center; }
          .seal { display: inline-block; border: 1px solid #888; padding: 9px 28px; font-size: 13pt; }
          .cashier { justify-self: center; width: 78%; font-weight: bold; }
          .signature-line { border-top: 1px solid #555; margin-top: 16px; padding-top: 4px; font-size: 10pt; font-weight: normal; }
          .footer { margin: 4px -12mm 0; padding: 7px 10px; background: #C96719; color: white; text-align: center; font-size: 12pt; font-weight: bold; }
          .note { margin: 5px 0 0; text-align: center; font-size: 9pt; }
        </style>
      </head>
      <body>
        <main class="receipt">
          <header>
            <div class="masthead">
              <img class="logo" src="${logoDataUri}" alt="संस्था का चिन्ह" />
              <div>
                <p class="organization">श्री संकट मोचन सेवार्थ संस्था</p>
                <p class="registration">पंजीकृत संस्था ---- &nbsp; | &nbsp; सेवा एवं सहयोग कार्य</p>
                <p class="address">पता: C-79, उदय विहार, उदयपुर</p>
              </div>
              <img class="logo" src="${logoDataUri}" alt="संस्था का चिन्ह" />
            </div>
            <div class="title-row"><h1>दान रसीद / DONATION RECEIPT</h1></div>
          </header>
          <div class="receipt-meta">
            <span>रसीद संख्या: ${escapeHtml(receipt.receiptNumber)}</span>
            <span>दिनांक: ${escapeHtml(receiptDate(receipt.receiptDate))}</span>
          </div>
          <table class="details">
            <tbody>
              <tr><td class="label">दाता का नाम:</td><td class="dotted" colspan="3">${escapeHtml(donor)}</td></tr>
              <tr><td class="label">पिता/पति का नाम:</td><td class="dotted" colspan="3">${escapeHtml(fatherName)}</td></tr>
              <tr>
                <td class="label">पता:</td><td class="dotted" style="width:48%">${escapeHtml(address)}</td>
                <td class="label">मोबाइल नं:</td><td class="dotted" style="width:28%">${escapeHtml(mobile)}</td>
              </tr>
            </tbody>
          </table>
          <section class="amounts">
            <div class="amount-line"><strong>${amountLabel}: &nbsp; ₹</strong><span class="fill"></span><strong class="amount-value">${escapeHtml(formattedAmount)} /-</strong></div>
            <div class="amount-line"><strong>राशि (शब्दों में):</strong><span class="fill"></span><span>${escapeHtml(amountWords)}</span></div>
          </section>
          <div class="purpose">
            <span class="label">दान का उद्देश्य:</span>
            <span class="dotted" style="display:inline-block;width:78%"></span>
            <div class="purpose-text">${escapeHtml(purpose)}</div>
          </div>
          <div class="payment">
            <strong>भुगतान का माध्यम:</strong>
            ${method
              ? `<span><span class="checkbox">${isCash ? "✓" : ""}</span>नकद</span>
                 <span><span class="checkbox">${isTransfer ? "✓" : ""}</span>चेक / UPI / बैंक हस्तांतरण</span>`
              : `<span>भुगतान का माध्यम: -</span>`}
            <span><span class="checkbox">${transactionReference ? "✓" : ""}</span>चेक/लेनदेन संख्या: ${escapeHtml(transactionReference || "-")}</span>
          </div>
          <div class="signatures">
            <div></div>
            <div class="seal">[ संस्था मुहर ]</div>
            <div class="cashier">कोषाध्यक्ष के हस्ताक्षर<div class="signature-line">(कोषाध्यक्ष)</div></div>
          </div>
          <footer class="footer">धन्यवाद! आपके सहयोग से कर रहे हैं समाज सेवा | आपका दान ही हमारा संकल्प</footer>
          <p class="note">नोट: यह रसीद संस्था द्वारा अधिकृत है। पता: C-79, उदय विहार, उदयपुर | स्थापित: 2026</p>
        </main>
      </body>
    </html>`;
}

export default function MemberReceipts() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [downloadInProgress, setDownloadInProgress] = useState(false);
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
      const data = await apiFetch<{ receipts: Receipt[] }>(
        "/receipts",
        {},
        token || undefined
      );
      setReceipts(data.receipts || []);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (e: any) {
      const message = e?.message || "Unable to load receipts.";
      setLoadError(message);
      Alert.alert("Receipts", message);
    } finally {
      if (initialLoad) setLoading(false);
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

  async function downloadReceipt(receipt: Receipt) {
    if (downloadInProgress) return;

    try {
      setDownloadInProgress(true);
      setDownloadingReceiptId(receipt._id);
      const logoAsset = Asset.fromModule(require("../../assets/logo.jpeg"));
      await withTimeout(
        logoAsset.downloadAsync(),
        15000,
        "Logo download timed out. Please try again."
      );
      if (!logoAsset.localUri) {
        throw new Error("The organization logo could not be loaded.");
      }

      const logoBase64 = await FileSystem.readAsStringAsync(
        logoAsset.localUri,
        { encoding: FileSystem.EncodingType.Base64 }
      );
      const file = await withTimeout(
        Print.printToFileAsync({
          html: createReceiptHtml(
            receipt,
            user?.name || "",
            `data:image/jpeg;base64,${logoBase64}`
          ),
          base64: true
        }),
        30000,
        "PDF generation timed out. Please try again."
      );
      if (!file.base64) {
        throw new Error("The PDF file could not be generated.");
      }
      setDownloadingReceiptId(null);

      if (!FileSystem.documentDirectory) {
        throw new Error("File storage is unavailable on this device.");
      }
      const safeReceiptNumber = receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileUri = `${FileSystem.documentDirectory}receipt-${safeReceiptNumber}-${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        file.base64,
        { encoding: FileSystem.EncodingType.Base64 }
      );

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("PDF ready", `The receipt was saved at ${fileUri}, but sharing is unavailable on this device.`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Download receipt PDF"
      });
    } catch (error: any) {
      Alert.alert("PDF download failed", error?.message || "Unable to create the receipt PDF.");
    } finally {
      setDownloadingReceiptId(null);
      setDownloadInProgress(false);
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

      {!hasLoaded ? (
        <DataRequestStatus loading={loading} error={loadError} onRetry={load} message="Loading receipts..." />
      ) : receipts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyTitle}>No receipt information was found</Text>
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
                {metadataText(receipt, "recipientName") ? (
                  <Text style={styles.receiptNumber}>
                    Receiver: {metadataText(receipt, "recipientName")}
                  </Text>
                ) : null}
              </View>
              <View style={styles.receiptActions}>
                <Text style={styles.amountLabel}>
                  {receipt.type === "application" ? "Membership Fee" : "Cooperation Fee"}
                </Text>
                <Text style={styles.amount}>{money(receipt.amount)}</Text>
                <Pressable
                  style={styles.downloadButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    void downloadReceipt(receipt);
                  }}
                  disabled={downloadInProgress}
                  accessibilityRole="button"
                  accessibilityLabel={`Download PDF for receipt ${receipt.receiptNumber}`}
                  hitSlop={8}
                >
                  {downloadingReceiptId === receipt._id ? (
                    <ActivityIndicator size="small" color="#0D568B" />
                  ) : (
                    <Ionicons name="download-outline" size={22} color="#0D568B" />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <Text style={styles.badge}>
                {receipt.type === "application" ? "MEMBERSHIP" : "RECEIPT"}
              </Text>
              {receipt.type === "application" && receipt.category ? (
                <Text style={styles.category}>{receipt.category}</Text>
              ) : null}
            </View>

            {receipt.type === "application" ? (
              <Text style={styles.description}>
                Membership Fee: {money(receipt.amount)}
              </Text>
            ) : receipt.description ? (
              <Text style={styles.description}>{receipt.description}</Text>
            ) : null}

            {receipt.type === "application" ? (
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
            ) : null}
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
  amountLabel: {
    color: "#725016",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right"
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
  receiptActions: {
    alignItems: "center",
    gap: 8
  },
  downloadButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#EAF4FA",
    borderWidth: 1,
    borderColor: "#C9DCE8"
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
