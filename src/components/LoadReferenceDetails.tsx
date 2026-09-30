import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Icon } from "react-native-elements";
import { driverTheme } from "../theme/driverTheme";

const displayValue = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || "—";
};

const formatDocumentType = (value: unknown) =>
  String(value || "Document")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const referenceRows: Array<[string, (load: any) => unknown]> = [
  ["Booking #", (load) => load?.shipmentInfo?.bookingNumber],
  ["Bill of Lading", (load) => load?.shipmentInfo?.billOfLading || load?.shipmentInfo?.houseBillOfLading || load?.shipmentInfo?.masterBillOfLading],
  ["Seal #", (load) => load?.shipmentInfo?.sealNumber || load?.sealNumber],
  ["Reference #", (load) => load?.shipmentInfo?.referenceNumber || load?.shipmentInfo?.customerReference],
  ["Vessel Name", (load) => load?.shipmentInfo?.vesselName],
  ["Voyage #", (load) => load?.shipmentInfo?.voyageNumber],
  ["Purchase Order #", (load) => load?.shipmentInfo?.purchaseOrderNumber],
  ["Shipment #", (load) => load?.shipmentInfo?.shipmentNumber],
  ["Pick Up #", (load) => load?.shipmentInfo?.pickUpNumber],
  ["Appointment #", (load) => load?.shipmentInfo?.appointmentNumber],
  ["Return #", (load) => load?.shipmentInfo?.returnNumber],
  ["Reservation #", (load) => load?.shipmentInfo?.reservationNumber],
  ["Genset #", (load) => load?.gensetNumber],
];

const DetailRow = ({ label, value }: { label: string; value: unknown }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{displayValue(value)}</Text>
  </View>
);

const LoadReferenceDetails = ({
  load,
  documents: documentGroups,
  onUploadPress,
}: {
  load: any;
  documents?: any;
  onUploadPress?: () => void;
}) => {
  const groups = Array.isArray(documentGroups)
    ? documentGroups
    : Array.isArray(documentGroups?.data)
      ? documentGroups.data
      : Array.isArray(load?.documents)
        ? load.documents
        : [];
  const documents = groups.flatMap((doc: any) =>
    (doc.files || []).map((file: any) => ({
      id: file.id,
      type: formatDocumentType(file.documentType),
      url: file.file?.presignedUrl || file.file?.url || "",
    })),
  );
  const freight = Array.isArray(load?.freightDescriptions) ? load.freightDescriptions : [];

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Load Info</Text>
      <DetailRow label="Chassis #" value={load?.chassis?.chassisNumber || load?.otherChassisNumber} />
      <DetailRow label="Container #" value={load?.containerNumber} />
      <DetailRow label="Seal #" value={load?.shipmentInfo?.sealNumber || load?.sealNumber} />
      <DetailRow label="Size" value={load?.containerSize?.label || load?.containerSize?.size} />
      <DetailRow label="Type" value={load?.containerType?.label || load?.containerType?.type} />
      <DetailRow label="SSL" value={load?.ssl} />

      <View style={styles.documentsHeader}>
        <Text style={[styles.heading, styles.documentsHeading]}>Documents</Text>
        {typeof onUploadPress === "function" ? (
          <TouchableOpacity style={styles.uploadButton} onPress={onUploadPress} activeOpacity={0.85}>
            <Icon name="cloud-upload" type="material" color="#fff" size={16} />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {documents.length === 0 ? (
        <Text style={styles.empty}>No documents have been attached.</Text>
      ) : (
        documents.map((doc: any) => (
          <View key={doc.id} style={styles.docRow}>
            <Text style={styles.docType}>{doc.type}</Text>
            <TouchableOpacity
              disabled={!doc.url}
              onPress={() => Linking.openURL(doc.url)}
              style={[styles.viewButton, !doc.url && styles.viewButtonDisabled]}
              activeOpacity={0.85}
            >
              <Icon
                name="visibility"
                type="material"
                color={doc.url ? "#fff" : driverTheme.colors.grey[600]}
                size={16}
              />
              <Text
                style={[
                  styles.viewButtonText,
                  !doc.url && { color: driverTheme.colors.grey[600] },
                ]}
              >
                View
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.heading}>Reference Numbers</Text>
      {referenceRows.map(([label, getValue]) => (
        <DetailRow key={label} label={label} value={getValue(load)} />
      ))}

      <Text style={styles.heading}>Freight Description</Text>
      {freight.length === 0 ? (
        <Text style={styles.empty}>—</Text>
      ) : (
        freight.map((row: any) => (
          <View key={row.id} style={styles.freight}>
            <Text style={styles.value}>{displayValue(row.commodity)}</Text>
            <Text style={styles.label}>
              Pallets {row.pallets ?? "—"} · Pcs {row.pieces ?? "—"} · Weight {row.weight ?? "—"} lbs
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  heading: {
    fontWeight: "700",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 6,
    color: driverTheme.colors.text.primary,
  },
  documentsHeader: {
    marginTop: 12,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  documentsHeading: {
    marginTop: 0,
    marginBottom: 0,
  },
  uploadButton: {
    backgroundColor: driverTheme.colors.primary.main,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f4f7",
  },
  label: { fontSize: 12, color: driverTheme.colors.text.secondary, flexShrink: 0 },
  value: { fontSize: 12, fontWeight: "600", textAlign: "right", flex: 1 },
  empty: { fontSize: 12, color: driverTheme.colors.text.secondary },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f4f7",
  },
  docType: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
  },
  viewButton: {
    backgroundColor: driverTheme.colors.primary.main,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewButtonDisabled: {
    backgroundColor: driverTheme.colors.grey[300],
  },
  viewButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  freight: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f2f4f7" },
});

export default LoadReferenceDetails;
