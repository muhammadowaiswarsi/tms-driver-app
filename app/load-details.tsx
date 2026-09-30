import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Icon } from "react-native-elements";
import DriverLayout from "../src/components/common/DriverLayout";
import LoadReferenceDetails from "../src/components/LoadReferenceDetails";
import CustomMapView, { type MapMarker } from "../src/components/common/MapView";
import { getSelectedDriverLoad } from "../src/driver/selectedLoad";
import { useDriverLoadDecision, useLoadDocuments, useLoadRouting } from "../src/hooks/useLoad";
import { driverTheme } from "../src/theme/driverTheme";
import { geocodeAddress, markerTypeFromEventType } from "../src/utils/geocode";


const TypedCard = Card as any;

const LoadDetails: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const loadId = params.loadId as string;
  const loadData = getSelectedDriverLoad();
  const { data: loadRoutingData } = useLoadRouting(loadId || "");
  const { data: loadDocuments } = useLoadDocuments(loadId || "");
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);

  const routingEvents = useMemo(() => {
    const payload = (loadRoutingData as any)?.data ?? loadRoutingData;
    const moves = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    const events = moves.flatMap((move: any) => (Array.isArray(move?.events) ? move.events : []));
    return [...events].sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [loadRoutingData]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next: MapMarker[] = [];
      const seen = new Set<string>();
      for (const event of routingEvents) {
        if (event.latitude && event.longitude) {
          next.push({
            latitude: Number(event.latitude),
            longitude: Number(event.longitude),
            title: event.type?.replace(/_/g, " ") || "Stop",
            type: markerTypeFromEventType(event.type),
          });
          continue;
        }
        const address = String(event.location || "").trim();
        if (!address || seen.has(address.toLowerCase())) continue;
        seen.add(address.toLowerCase());
        const point = await geocodeAddress(address);
        if (!point || cancelled) continue;
        next.push({
          latitude: point.latitude,
          longitude: point.longitude,
          title: `${(event.type || "Stop").replace(/_/g, " ")} — ${address}`,
          type: markerTypeFromEventType(event.type),
        });
      }
      if (!cancelled) setMapMarkers(next);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [routingEvents]);

  const handleBackClick = () => {
    router.back();
  };

  const handleAcceptLoad = () => {
    setConfirmDialog(true);
  };

  const updateLoadDecision = useDriverLoadDecision(loadId || "", {
    onSuccess: () => {
      router.replace({
        pathname: "/(tabs)/loads",
        params: { tab: "active" },
      });
    },
    onError: () => {
      Alert.alert("Error", "Failed to update load decision");
    },
  });

  const handleConfirmAccept = async () => {
    setIsAccepting(true);
    try {
      await updateLoadDecision.mutateAsync({
        data: { status: "ACCEPTED" },
      });
    } catch {
      setIsAccepting(false);
      setConfirmDialog(false);
    }
  };

  const handleConfirmReject = async () => {
    setIsRejecting(true);
    try {
      await updateLoadDecision.mutateAsync({
        data: { status: "REJECTED" },
      });
    } catch {
      setIsRejecting(false);
      setRejectDialog(false);
    }
  };

  return (
    <DriverLayout
      showBackButton
      onBackClick={handleBackClick}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        
        <CustomMapView
          height={300}
          markers={mapMarkers}
          routeCoordinates={mapMarkers.map((marker) => ({
            latitude: marker.latitude,
            longitude: marker.longitude,
          }))}
          showRoute
        />

        
        {routingEvents.length > 0 && (
            <View style={styles.eventsContainer}>
              {routingEvents.map(
                (event: any, index: number) => (
                  <TypedCard key={index} containerStyle={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventChip}>
                        <Text style={styles.eventChipText}>
                          {event.type.replace(/_/g, " ").toUpperCase()}
                        </Text>
                      </View>
                      {event.createdAt && (
                        <Text style={styles.eventTime}>
                          {new Date(event.createdAt).toLocaleDateString()}
                          {"\n"}
                          {new Date(event.createdAt).toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.eventLocation}>
                      {event.location || "Location not specified"}
                    </Text>
                  </TypedCard>
                )
              )}
            </View>
          )}
        <LoadReferenceDetails
          load={loadData}
          documents={loadDocuments?.data || loadDocuments || loadData?.documents}
        />

        
        {loadData?.driverDecision !== "ACCEPTED" && (
        <View style={styles.actionButtons}>
          <Button
            title={isAccepting ? "Accepting..." : "Accept Load"}
            onPress={handleAcceptLoad}
            disabled={isAccepting}
            buttonStyle={styles.acceptButton}
            titleStyle={styles.acceptButtonTitle}
            loading={isAccepting}
          />
          <Button
            title="Reject Load"
            onPress={() => setRejectDialog(true)}
            buttonStyle={[styles.rejectButton]}
            titleStyle={styles.rejectButtonTitle}
          />
        </View>
        )}
      </ScrollView>

      
      {confirmDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Icon
              name="warning"
              type="material"
              size={48}
              color={driverTheme.colors.grey[600]}
              containerStyle={styles.dialogIcon}
            />
            <Text style={styles.dialogTitle}>
              Are you sure you want to accept this load?
            </Text>
            <View style={styles.dialogButtons}>
              <Button
                title={isAccepting ? "Accepting..." : "Accept"}
                onPress={handleConfirmAccept}
                disabled={isAccepting}
              />
              
              <Button
                title="Cancel"
                onPress={() => setConfirmDialog(false)}
                disabled={isAccepting}
                buttonStyle={[styles.dialogButtonOutlined]}
                titleStyle={[
                  styles.dialogButtonText,
                  { color: driverTheme.colors.grey[600] },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      
      {rejectDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Icon
              name="warning"
              type="material"
              size={48}
              color={driverTheme.colors.error.main}
              containerStyle={styles.dialogIcon}
            />
            <Text style={styles.dialogTitle}>
              Are you sure you want to reject this load?
            </Text>
            <View style={styles.dialogButtons}>
              <Button
                title={isRejecting ? "Rejecting..." : "Yes, Reject Load"}
                onPress={handleConfirmReject}
                disabled={isRejecting}
                buttonStyle={[
                  styles.dialogButton,
                  { backgroundColor: driverTheme.colors.error.main },
                ]}
                titleStyle={styles.dialogButtonText}
              />
              <Button
                title="Cancel"
                onPress={() => setRejectDialog(false)}
                disabled={isRejecting}
                buttonStyle={[styles.dialogButton, styles.dialogButtonOutlined]}
                titleStyle={[
                  styles.dialogButtonText,
                  { color: driverTheme.colors.grey[600] },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </DriverLayout>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  eventsContainer: {
    padding: driverTheme.spacing.sm,
  },
  eventCard: {
    borderRadius: 8,
    marginBottom: driverTheme.spacing.xs,
    padding: driverTheme.spacing.sm,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: driverTheme.spacing.xs,
  },
  eventChip: {
    backgroundColor: driverTheme.colors.grey[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  eventChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
  },
  eventTime: {
    fontSize: 12,
    color: driverTheme.colors.grey[600],
    textAlign: "right",
  },
  eventLocation: {
    fontSize: 12,
    fontWeight: "600",
    color: driverTheme.colors.grey[600],
  },
  actionButtons: {
    flexDirection: "column",
    gap: driverTheme.spacing.md,
    padding: driverTheme.spacing.md,
    paddingBottom: driverTheme.spacing.lg,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: driverTheme.spacing.md,
    minHeight: 50,
    width: "100%",
  },
  rejectButton: {
    backgroundColor: driverTheme.colors.background.paper,
    borderWidth: 1,
    borderColor: driverTheme.colors.grey[400],
  },
  acceptButton: {
    backgroundColor: driverTheme.colors.success.main,
  },
  rejectButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: driverTheme.colors.text.secondary,
  },
  acceptButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: driverTheme.colors.background.paper,
  },
  dialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  dialogCard: {
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    backgroundColor: driverTheme.colors.background.paper,
    padding: driverTheme.spacing.lg,
    alignItems: "center",
  },
  dialogIcon: {
    marginBottom: driverTheme.spacing.md,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: driverTheme.spacing.lg,
    color: driverTheme.colors.text.primary,
  },
  dialogButtons: {
    width: "100%",
    gap: driverTheme.spacing.sm,
    alignItems: "stretch",
  },
  dialogButton: {
    borderRadius: 8,
    width: "100%",
    minHeight: 50,
    paddingVertical: driverTheme.spacing.md,
  },
  dialogButtonOutlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: driverTheme.colors.grey[400],
  },
  dialogButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LoadDetails;
