import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Button, Card, Icon, Input } from "react-native-elements";
import DriverLayout from "../../src/components/common/DriverLayout";
import CustomMapView from "../../src/components/common/MapView";
import { useAuth } from "../../src/hooks/useAuth";
import {
  useChassis,
  useDriverActiveLoads,
  useDriverAssignedLoads,
  useDriverLoadLocationStatus,
  useDriverStartLoadRoutingMove,
  useUpdateDriverLoadReturnInfo,
} from "../../src/hooks/useLoad";
import { customAxios } from "../../src/services/api";
import { driverTheme } from "../../src/theme/driverTheme";
import { Event } from "../../src/types/driver.types";

// Type assertion helper for Card component (React Native Elements types don't include children)
const TypedCard = Card as any;

const LoadSearch: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentTab, setCurrentTab] = useState(() => {
    // Set initial tab based on query parameter, default to 0 (Active)
    return params.tab === "upcoming" ? 1 : 0;
  });
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [startLoadDialog, setStartLoadDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [actionType, setActionType] = useState<
    "departed" | "arrived" | "complete"
  >("arrived");
  const [chassisNumber, setChassisNumber] = useState("");
  const [selectedChassisId, setSelectedChassisId] = useState<string>("");
  const [containerNumber, setContainerNumber] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [chassisPickerVisible, setChassisPickerVisible] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const { authState } = useAuth();
  const companyId =
    authState?.userData?.companyId || authState?.userData?.company?.id;
  const { data: chassisData, isLoading: isLoadingChassis } =
    useChassis(companyId);

  const {
    data: driverUpcomingLoads,
    isLoading: isLoadingUpcoming,
    refetch: refetchUpcoming,
  } = useDriverAssignedLoads();

  const {
    data: driverActiveLoads,
    isLoading: isLoadingActive,
    refetch: refetchActive,
  } = useDriverActiveLoads();

  const loadId = driverActiveLoads?.data?.id;

  // Chassis data - will be used when implementing chassis picker
  // const { authState } = useAuth();
  // const companyId = authState?.userData?.companyId;
  // const { data: chassis } = useChassis({
  //   companyId: companyId,
  //   limit: 100,
  // });

  // TODO: Implement chassis picker using chassisOptions
  // const chassisOptions =
  //   chassis?.data?.map((chassisProfile: any) => ({
  //     id: chassisProfile.id,
  //     label: chassisProfile.chassisNumber,
  //     value: chassisProfile.id,
  //   })) || [];

  const { mutate: driverStartLoad } = useDriverStartLoadRoutingMove(
    driverActiveLoads?.data?.id || "",
    {
      onSuccess: () => {
        refetchActive();
        // Alert.alert('Success', 'Load routing move started successfully');
        setStartLoadDialog(false);
      },
      onError: (error: any) => {
        Alert.alert("Error", "Error starting load routing move");
      },
    }
  );

  const updateEventStatus = useDriverLoadLocationStatus(
    driverActiveLoads?.data?.id,
    {
      onSuccess: () => {
        refetchActive();
        setConfirmDialog(false);
        setIsUpdating(false);
        // Alert.alert('Success', 'Status updated successfully');
      },
      onError: (error: any) => {
        setIsUpdating(false);
        Alert.alert("Error", "Error updating status");
      },
    }
  );

  const updateLoadStatus = useUpdateDriverLoadReturnInfo(
    driverActiveLoads?.data?.id || "",
    {
      onSuccess: () => {
        refetchActive();
        setCompleteDialog(false);
        setDocumentDialog(false);
        setIsCompleting(false);
        // Alert.alert('Success', 'Load completed successfully');
        setTimeout(() => {
          setCurrentTab(1);
        }, 1000);
      },
      onError: (error: any) => {
        setIsCompleting(false);
        Alert.alert("Error", "Error completing load");
      },
    }
  );

  const getAllEvents = () => {
    if (!driverActiveLoads?.data?.routing?.[0]?.events) return [];
    return driverActiveLoads.data.routing[0].events.sort(
      (a: Event, b: Event) => a.sequence - b.sequence
    );
  };

  const getCurrentEventIndex = () => {
    const events = getAllEvents();
    const currentIndex = events.findIndex(
      (event: Event) => event.status === "PENDING" || event.status === "ARRIVED"
    );
    return currentIndex !== -1 ? currentIndex : events.length - 1;
  };

  const getEventButtonStates = (event: Event, eventIndex: number) => {
    const currentEventIndex = getCurrentEventIndex();
    const isCurrentEvent = eventIndex === currentEventIndex;
    const isCompleteType = (event.type || "").toUpperCase() === "COMPLETED";
    const showCompleted = isCompleteType;
    const completedEnabled = isCurrentEvent && isCompleteType;
    const arrivedEnabled = isCurrentEvent && event.status === "PENDING";
    console.log(event.status);
    const departedEnabled = isCurrentEvent && event.status === "ARRIVED";
    console.log("departedEnabled", departedEnabled);

    // Check if buttons should be green (active/enabled state)
    // Arrived: Green only when enabled (PENDING status and current event) - gray when disabled (ARRIVED/DEPARTED)
    // Departed: Green when status is ARRIVED (enabled) OR DEPARTED (completed) - regardless of current event
    const arrivedActive = event.status === "PENDING" && isCurrentEvent;
    const departedActive =
      event.status === "ARRIVED" || event.status === "DEPARTED";

    if (isCurrentEvent) {
      return {
        departedEnabled,
        arrivedEnabled,
        showCompleted,
        completedEnabled,
        arrivedActive,
        departedActive,
      };
    }
    return {
      departedEnabled: false,
      arrivedEnabled: false,
      showCompleted,
      completedEnabled: false,
      arrivedActive,
      departedActive,
    };
  };

  const handleEventAction = (
    eventId: string,
    action: "departed" | "arrived" | "complete"
  ) => {
    setSelectedEventId(eventId);
    setActionType(action);

    if (action === "complete") {
      setDocumentDialog(true);
    } else {
      setConfirmDialog(true);
    }
  };

  const handleConfirmEventUpdate = async () => {
    setIsUpdating(true);
    try {
      const status = actionType === "departed" ? "DEPARTED" : "ARRIVED";
      await updateEventStatus.mutateAsync({
        data: {
          eventId: selectedEventId,
          status,
        },
      });
      refetchActive();
    } catch (error: any) {
      setIsUpdating(false);
      let errorMessage = "Error updating status";
      if (error?.response?.data?.message) {
        const message = error.response.data.message;
        errorMessage = Array.isArray(message) ? message[0] : String(message);
      } else if (error?.message) {
        errorMessage = String(error.message);
      }
      Alert.alert("Error", errorMessage);
    }
  };

  // Map local document types to API document types (uppercase enum format)
  const mapDocumentTypeToAPI = (localType: string): string => {
    const typeMap: Record<string, string> = {
      proofOfDelivery: "PROOF_OF_DELIVERY",
      tirOut: "TIR_OUT",
      tirIn: "TIR_IN",
    };
    return typeMap[localType] || localType.toUpperCase();
  };

  const requiredDocuments = [
    {
      id: "1",
      name: "Proof of Delivery",
      type: "proofOfDelivery",
      required: true,
      uploaded: false,
      uploadData: null,
    },
    {
      id: "2",
      name: "TIR Out",
      type: "tirOut",
      required: true,
      uploaded: false,
      uploadData: null,
    },
    {
      id: "3",
      name: "TIR In",
      type: "tirIn",
      required: true,
      uploaded: false,
      uploadData: null,
    },
  ];

  useEffect(() => {
    if (driverActiveLoads?.data) {
      setDocuments(requiredDocuments.map((doc) => ({ ...doc })));
      setChassisNumber(driverActiveLoads.data.chassis?.chassisNumber || "");
      setContainerNumber(driverActiveLoads.data.containerNumber || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverActiveLoads]);

  useEffect(() => {
    refetchActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update tab when params change
  useEffect(() => {
    if (params.tab === "upcoming") {
      setCurrentTab(1);
    } else {
      setCurrentTab(0);
    }
  }, [params.tab]);

  const handleTabChange = (newValue: number) => {
    setCurrentTab(newValue);
    if (newValue === 1) {
      refetchUpcoming();
    }
    if (newValue === 0) {
      refetchActive();
    }
  };

  const handleShowDetails = (load: any) => {
    router.push({
      pathname: "/load-details",
      params: { loadId: load.id },
    } as any);
  };

  const handleStartLoad = () => {
    setStartLoadDialog(true);
  };

  const handleConfirmStartLoad = () => {
    setStartLoadDialog(false);
    driverStartLoad({
      data: {},
    });
  };

  const allRequiredDocsUploaded = documents
    .filter((doc) => doc.required)
    .every((doc) => doc.uploaded);

  const handleCompleteLoad = () => {
    if (!allRequiredDocsUploaded) return;
    setCompleteDialog(true);
  };

  const handleFileUpload = async (docId: string) => {
    try {
      // Dynamically import expo-document-picker
      let getDocumentAsync;
      try {
        const documentPicker = await import("expo-document-picker");
        getDocumentAsync = documentPicker.getDocumentAsync;
      } catch (importError) {
        Alert.alert(
          "Error",
          "expo-document-picker is not installed. Please run: npm install expo-document-picker"
        );
        return;
      }

      setUploadingDocId(docId);

      const result = await getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setUploadingDocId(null);
        return;
      }

      const file = result.assets[0];
      if (!file) {
        setUploadingDocId(null);
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        name: file.name || `document_${Date.now()}`,
      } as any);

      const customFileName = `${Date.now()}_${file.name || "document"}`;

      // Upload file to server
      const uploadResponse = await customAxios.post(
        "/upload/single",
        formData,
        {
          params: {
            folder: "load-documents",
            customFileName: customFileName,
          },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (uploadResponse.data.success && uploadResponse.data.data) {
        const uploadData = uploadResponse.data.data;

        // Just store upload data in local state - don't call document API yet
        // Documents will be sent when completing the load
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  uploaded: true,
                  uploadedAt: new Date(),
                  uploadData: uploadData,
                }
              : d
          )
        );

        // Alert.alert('Success', 'Document uploaded successfully');
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      // Handle error message - API might return array or string
      let errorMessage = "Failed to upload document";
      if (error?.response?.data?.message) {
        const message = error.response.data.message;
        errorMessage = Array.isArray(message) ? message[0] : String(message);
      } else if (error?.message) {
        errorMessage = String(error.message);
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleConfirmComplete = async () => {
    setIsCompleting(true);
    try {
      const payload: any = {
        chassisNumber,
        containerNumber,
      };

      documents.forEach((doc) => {
        if (doc.uploaded && doc.uploadData) {
          payload[doc.type] = {
            key: doc.uploadData.key,
            url: doc.uploadData.url,
            originalName: doc.uploadData.originalName,
            bucket: doc.uploadData.bucket,
            mimeType: doc.uploadData.mimeType,
            size: doc.uploadData.size,
          };
        }
      });

      await updateLoadStatus.mutateAsync({
        data: payload,
      });
    } catch {
      // Error handled by onError callback
    }
  };

  const renderActiveTab = () => {
    if (!driverActiveLoads?.data) {
      return (
        <View style={styles.emptyContainerActive}>
          <Icon
            name="help"
            type="material"
            size={48}
            color={driverTheme.colors.text.secondary}
          />
          <Text style={styles.emptyTitle}>No Active Load</Text>
          <Text style={styles.emptySubtitle}>
            Check upcoming loads to get started
          </Text>
        </View>
      );
    }

    const events = getAllEvents();
    const currentEventIndex = getCurrentEventIndex();

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Map View */}
        <CustomMapView height={300} />

        {/* Events List */}
        <View style={styles.eventsContainer}>
          {driverActiveLoads?.data?.status === "PENDING" ? (
            <TypedCard containerStyle={styles.loadCard}>
              <View style={styles.loadInfo}>
                <View style={styles.loadHeader}>
                  <Text style={styles.loadNumber}>
                    Load Number: {driverActiveLoads?.data?.loadNumber || "--"}
                  </Text>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {driverActiveLoads?.data?.loadType?.toUpperCase() || "--"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.loadDetail}>
                  Container #:{" "}
                  {driverActiveLoads?.data?.containerNumber || "--"}
                </Text>
                <Text style={styles.loadDetail}>
                  Chassis #:{" "}
                  {driverActiveLoads?.data?.chassis?.chassisNumber || "--"}
                </Text>
                <Text style={styles.loadDetail}>
                  Route Type:{" "}
                  {driverActiveLoads?.data?.route
                    ?.replace(/_/g, " ")
                    .toUpperCase() || "N/A"}
                </Text>
                <Button
                  title="Start Load"
                  onPress={handleStartLoad}
                  buttonStyle={[
                    styles.startButton,
                    { backgroundColor: driverTheme.colors.success.dark },
                  ]}
                  titleStyle={styles.buttonTitle}
                />
              </View>
            </TypedCard>
          ) : (
            events
              .filter((event: Event, index: number) => {
                return (
                  event.status !== "DEPARTED" || index === events.length - 1
                );
              })
              .map((event: Event, eventIndex: number) => {
                const originalEventIndex = events.findIndex(
                  (e: Event) => e.id === event.id
                );
                const buttonStates = getEventButtonStates(
                  event,
                  originalEventIndex
                );
                console.log(buttonStates, "buttonStates");
                const isCurrentEvent = originalEventIndex === currentEventIndex;

                return (
                  <TypedCard
                    key={event.id}
                    containerStyle={[
                      styles.eventCard,
                      {
                        backgroundColor: isCurrentEvent ? "#E3F2FD" : "#F5F5F5",
                      },
                    ]}
                  >
                    <View style={styles.eventHeader}>
                      <View
                        style={[
                          styles.eventChip,
                          {
                            backgroundColor: isCurrentEvent
                              ? "#377cf6"
                              : "#a3a3a3",
                          },
                        ]}
                      >
                        <Text style={styles.eventChipText}>
                          {event.type.replace(/_/g, " ").toUpperCase()}
                        </Text>
                      </View>
                      {event.created && (
                        <Text style={styles.eventTime}>
                          {new Date(event.arrivedAt || "").toLocaleDateString()}
                          {"\n"}
                          {new Date(event.arrivedAt || "").toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.eventLocation}>
                      {event.location || "Location not specified"}
                    </Text>
                    <View style={styles.eventButtons}>
                      {!buttonStates.showCompleted && (
                        <>
                          <Button
                            key={`arrived-${event.id}-${buttonStates.arrivedEnabled}`}
                            title="Arrived"
                            onPress={() =>
                              handleEventAction(event.id, "arrived")
                            }
                            disabled={
                              isUpdating || !buttonStates.arrivedEnabled
                            }
                            buttonStyle={[
                              styles.fullWidthButton,
                              {
                                backgroundColor: buttonStates.arrivedEnabled
                                  ? driverTheme.colors.primary.main
                                  : driverTheme.colors.grey[400],
                              },
                            ]}
                            titleStyle={[
                              styles.buttonTitle,
                              {
                                color: buttonStates.arrivedEnabled
                                  ? "#fff"
                                  : driverTheme.colors.text.secondary,
                              },
                            ]}
                          />
                          <Button
                            key={`departed-${event.id}-${buttonStates.departedEnabled}-${buttonStates.departedActive}`}
                            title="Departed"
                            onPress={() =>
                              handleEventAction(event.id, "departed")
                            }
                            disabled={
                              isUpdating || !buttonStates.departedEnabled
                            }
                            buttonStyle={[
                              styles.fullWidthButton,
                              {
                                backgroundColor: buttonStates.departedActive
                                  ? driverTheme.colors.primary.main
                                  : driverTheme.colors.grey[400],
                              },
                            ]}
                            titleStyle={[
                              styles.buttonTitle,
                              {
                                color: buttonStates.departedActive
                                  ? "#fff"
                                  : driverTheme.colors.text.secondary,
                              },
                            ]}
                          />
                        </>
                      )}
                      {buttonStates.showCompleted && (
                        <Button
                          key={`complete-${event.id}-${buttonStates.completedEnabled}`}
                          title="Complete"
                          onPress={() =>
                            handleEventAction(event.id, "complete")
                          }
                          disabled={
                            isUpdating || !buttonStates.completedEnabled
                          }
                          buttonStyle={[
                            styles.fullWidthButton,
                            {
                              backgroundColor: buttonStates.completedEnabled
                                ? driverTheme.colors.success.main
                                : driverTheme.colors.grey[400],
                            },
                          ]}
                          titleStyle={[
                            styles.buttonTitle,
                            {
                              color: buttonStates.completedEnabled
                                ? "#fff"
                                : driverTheme.colors.text.secondary,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </TypedCard>
                );
              })
          )}
        </View>
      </ScrollView>
    );
  };

  const renderUpcomingTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={
        !driverUpcomingLoads?.data || driverUpcomingLoads?.data.length === 0
          ? styles.upcomingContentEmpty
          : styles.upcomingContent
      }
    >
      {!driverUpcomingLoads?.data || driverUpcomingLoads?.data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name="local-shipping"
            type="material"
            size={80}
            color={driverTheme.colors.grey[400]}
          />
          <Text style={styles.emptyTitle}>No Upcoming Loads</Text>
          <Text style={styles.emptySubtitle}>
            You don&apos;t have any upcoming loads at the moment. New loads will
            appear here when they become available.
          </Text>
        </View>
      ) : (
        driverUpcomingLoads.data.map((load: any) => (
          <TypedCard key={load.id} containerStyle={styles.upcomingCard}>
            <View style={styles.upcomingHeader}>
              <Text style={styles.upcomingLoadNumber}>{load.loadNumber}</Text>
              <View
                style={[
                  styles.upcomingChip,
                  {
                    backgroundColor:
                      load.driverDecision === "PENDING"
                        ? driverTheme.colors.primary.main
                        : driverTheme.colors.grey[300],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.upcomingChipText,
                    {
                      color:
                        load.driverDecision === "PENDING"
                          ? driverTheme.colors.primary.contrastText
                          : driverTheme.colors.text.primary,
                    },
                  ]}
                >
                  {load.driverDecision === "PENDING"
                    ? "NEW"
                    : load.driverDecision}
                </Text>
              </View>
            </View>
            <View style={styles.upcomingDetails}>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Container</Text>
                <Text style={styles.upcomingDetailValue}>
                  {load.containerNumber || "N/A"}
                </Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Route Type</Text>
                <Text style={styles.upcomingDetailValue}>
                  {load.route?.replace(/_/g, " ").toUpperCase() || "N/A"}
                </Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Load Type</Text>
                <Text style={styles.upcomingDetailValue}>
                  {load.loadType?.toUpperCase() || "N/A"}
                </Text>
              </View>
            </View>
            <Button
              title="Show Details"
              onPress={() => handleShowDetails(load)}
              buttonStyle={[
                styles.detailsButton,
                { backgroundColor: driverTheme.colors.primary.main },
              ]}
              titleStyle={styles.buttonTitle}
            />
          </TypedCard>
        ))
      )}
    </ScrollView>
  );

  const headerTitle = driverActiveLoads?.data?.loadNumber
    ? `Load -- ${driverActiveLoads.data.loadNumber}`
    : "Loads";

  return (
    <DriverLayout title={headerTitle} currentTab="loads">
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, currentTab === 0 && styles.activeTab]}
            onPress={() => handleTabChange(0)}
          >
            <Text
              style={[styles.tabText, currentTab === 0 && styles.activeTabText]}
            >
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentTab === 1 && styles.activeTab]}
            onPress={() => handleTabChange(1)}
          >
            <Text
              style={[styles.tabText, currentTab === 1 && styles.activeTabText]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {isLoadingActive || isLoadingUpcoming ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={driverTheme.colors.primary.main}
            />
          </View>
        ) : currentTab === 0 ? (
          renderActiveTab()
        ) : (
          renderUpcomingTab()
        )}
      </View>

      {/* Confirmation Dialogs */}
      {confirmDialog && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Update Status</Text>
            <Text style={styles.dialogMessage}>
              {actionType === "departed"
                ? "Confirm mark as departed?"
                : "Confirm update the status to arrival?"}
            </Text>
            <View style={styles.dialogButtons}>
              <Button
                title={isUpdating ? "Updating..." : "Confirm"}
                onPress={handleConfirmEventUpdate}
                disabled={isUpdating}
                buttonStyle={[
                  styles.dialogButton,
                  { backgroundColor: driverTheme.colors.primary.main },
                ]}
                titleStyle={styles.buttonTitle}
              />
              <Button
                title="Cancel"
                onPress={() => setConfirmDialog(false)}
                disabled={isUpdating}
                buttonStyle={[
                  styles.dialogButton,
                  { backgroundColor: driverTheme.colors.grey[200] },
                ]}
                titleStyle={[
                  styles.buttonTitle,
                  { color: driverTheme.colors.grey[600] },
                ]}
              />
            </View>
          </TypedCard>
        </View>
      )}

      {/* Start Load Dialog */}
      {startLoadDialog && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Start Load</Text>
            <Text style={styles.dialogMessage}>
              Are you ready to start this load?
            </Text>
            <View style={styles.dialogButtons}>
              <Button
                title="Start Load"
                onPress={handleConfirmStartLoad}
                buttonStyle={[
                  styles.dialogButton,
                  { backgroundColor: driverTheme.colors.primary.main },
                ]}
                titleStyle={styles.buttonTitle}
              />
              <Button
                title="Cancel"
                onPress={() => setStartLoadDialog(false)}
                buttonStyle={[
                  styles.dialogButton,
                  { backgroundColor: driverTheme.colors.grey[200] },
                ]}
                titleStyle={[
                  styles.buttonTitle,
                  { color: driverTheme.colors.grey[600] },
                ]}
              />
            </View>
          </TypedCard>
        </View>
      )}

      {/* Document Upload Dialog */}
      {documentDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.documentDialogCard}>
            <View style={styles.documentDialogHeader}>
              <Text style={styles.dialogTitle}>Complete Load</Text>
              <TouchableOpacity
                onPress={() => setDocumentDialog(false)}
                style={styles.closeButton}
              >
                <Icon
                  name="close"
                  type="material"
                  color={driverTheme.colors.text.primary}
                  size={24}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.documentDialogScroll}
              contentContainerStyle={styles.documentDialogScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              {/* Chassis Number */}
              <View style={styles.documentField}>
                <Text style={styles.documentFieldLabel}>Chassis #</Text>
                <TouchableWithoutFeedback
                  onPress={() => setChassisPickerVisible(false)}
                >
                  <View>
                    <View style={styles.dropdownContainer}>
                      <TouchableOpacity
                        style={styles.selectContainer}
                        onPress={() =>
                          setChassisPickerVisible(!chassisPickerVisible)
                        }
                        disabled={
                          isLoadingChassis || !chassisData?.data?.length
                        }
                      >
                        {isLoadingChassis ? (
                          <ActivityIndicator
                            size="small"
                            color={driverTheme.colors.primary.main}
                          />
                        ) : (
                          <>
                            <Text
                              style={[
                                styles.selectText,
                                !chassisNumber && styles.selectPlaceholder,
                              ]}
                            >
                              {chassisNumber || "Select Chassis"}
                            </Text>
                            <Icon
                              name={
                                chassisPickerVisible
                                  ? "arrow-drop-up"
                                  : "arrow-drop-down"
                              }
                              type="material"
                              color={driverTheme.colors.text.secondary}
                              size={24}
                            />
                          </>
                        )}
                      </TouchableOpacity>
                      {chassisPickerVisible &&
                        chassisData?.data &&
                        chassisData.data.length > 0 && (
                          <View style={styles.dropdownList}>
                            <ScrollView
                              style={styles.dropdownScroll}
                              nestedScrollEnabled
                            >
                              {chassisData.data.map((chassis: any) => (
                                <TouchableOpacity
                                  key={chassis.id}
                                  style={[
                                    styles.dropdownItem,
                                    selectedChassisId === chassis.id &&
                                      styles.dropdownItemSelected,
                                  ]}
                                  onPress={() => {
                                    setSelectedChassisId(chassis.id);
                                    setChassisNumber(chassis.chassisNumber);
                                    setChassisPickerVisible(false);
                                  }}
                                >
                                  <Text style={styles.dropdownItemText}>
                                    {chassis.chassisNumber}
                                  </Text>
                                  {selectedChassisId === chassis.id && (
                                    <Icon
                                      name="check"
                                      type="material"
                                      color={driverTheme.colors.primary.main}
                                      size={20}
                                    />
                                  )}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>

              {/* Container Number */}
              <View style={styles.documentField}>
                <Text style={styles.documentFieldLabel}>Container #</Text>
                <Input
                  placeholder="Container number"
                  value={containerNumber}
                  onChangeText={setContainerNumber}
                  inputContainerStyle={styles.documentInput}
                  inputStyle={styles.documentInputText}
                  containerStyle={styles.documentInputWrapper}
                />
              </View>

              {/* Required Documents */}
              <Text style={styles.documentSectionTitle}>
                Required Documents
              </Text>
              <View style={styles.documentsList}>
                {documents.map((doc) => (
                  <View
                    key={doc.id}
                    style={[
                      styles.documentItem,
                      {
                        borderColor: doc.uploaded
                          ? driverTheme.colors.success.main
                          : driverTheme.colors.error.main,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={styles.documentItemContent}>
                      <View style={styles.documentItemLeft}>
                        <Icon
                          name={doc.uploaded ? "check-circle" : "description"}
                          type="material"
                          color={
                            doc.uploaded
                              ? driverTheme.colors.success.main
                              : driverTheme.colors.text.primary
                          }
                          size={24}
                        />
                        <Text style={styles.documentItemName}>{doc.name}</Text>
                      </View>
                      {doc.required && !doc.uploaded && (
                        <View
                          style={[
                            styles.requiredChip,
                            { backgroundColor: driverTheme.colors.error.main },
                          ]}
                        >
                          <Text style={styles.requiredChipText}>Required</Text>
                        </View>
                      )}
                    </View>
                    {!doc.uploaded && (
                      <Button
                        title={
                          uploadingDocId === doc.id ? "Uploading..." : "Upload"
                        }
                        onPress={() => handleFileUpload(doc.id)}
                        // disabled={uploadingDocId !== null}
                        loading={uploadingDocId === doc.id}
                        buttonStyle={
                          [
                            // styles.uploadButton,
                            // {
                            //   backgroundColor:
                            //     uploadingDocId === doc.id
                            //       ? driverTheme.colors.grey[400]
                            //       : driverTheme.colors.primary.main,
                            // },
                          ]
                        }
                        titleStyle={styles.uploadButtonTitle}
                        icon={
                          uploadingDocId !== doc.id ? (
                            <Icon
                              name="cloud-upload"
                              type="material"
                              color="#fff"
                              size={18}
                            />
                          ) : undefined
                        }
                        iconRight
                      />
                    )}
                    {doc.uploaded && (
                      <View style={styles.uploadedContainer}>
                        <Icon
                          name="check-circle"
                          type="material"
                          color={driverTheme.colors.success.main}
                          size={20}
                        />
                        <Text style={styles.uploadedText}>Uploaded</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {!allRequiredDocsUploaded && (
                <View style={styles.warningContainer}>
                  <Icon
                    name="warning"
                    type="material"
                    color={driverTheme.colors.warning.main}
                    size={20}
                  />
                  <Text style={styles.warningText}>
                    You must upload all required documents to complete the load
                  </Text>
                </View>
              )}

              <View style={styles.documentDialogButtons}>
                <Button
                  title="Confirm"
                  onPress={handleCompleteLoad}
                  disabled={!allRequiredDocsUploaded}
                  buttonStyle={[
                    styles.documentConfirmButton,
                    {
                      backgroundColor: allRequiredDocsUploaded
                        ? driverTheme.colors.success.main
                        : driverTheme.colors.grey[300],
                    },
                  ]}
                  titleStyle={styles.buttonTitle}
                  icon={
                    <Icon
                      name="assignment"
                      type="material"
                      color="#fff"
                      size={16}
                    />
                  }
                />
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Complete Load Confirmation Dialog */}
      {completeDialog && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.dialogCard}>
            <Icon
              name="check-circle"
              type="material"
              size={48}
              color={driverTheme.colors.success.main}
              containerStyle={styles.dialogIcon}
            />
            <Text style={styles.dialogTitle}>Complete Load?</Text>
            <View style={styles.completeInfo}>
              <Text style={styles.completeLabel}>Chassis #</Text>
              <Text style={styles.completeValue}>{chassisNumber || "N/A"}</Text>
            </View>
            <View style={styles.completeInfo}>
              <Text style={styles.completeLabel}>Container #</Text>
              <Text style={styles.completeValue}>
                {containerNumber || "N/A"}
              </Text>
            </View>
            <Text style={styles.documentsTitle}>Documents</Text>
            {documents
              .filter((doc) => doc.uploaded)
              .map((doc) => (
                <View key={doc.id} style={styles.completeDocumentItem}>
                  <Icon
                    name="check-circle"
                    type="material"
                    size={16}
                    color={driverTheme.colors.success.main}
                  />
                  <Text style={styles.completeDocumentName}>{doc.name}</Text>
                </View>
              ))}
            <View style={styles.dialogButtons}>
              <Button
                title={isCompleting ? "Completing Load..." : "Confirm Complete"}
                onPress={handleConfirmComplete}
                disabled={isCompleting}
                buttonStyle={[
                  styles.dialogButton,
                  { backgroundColor: driverTheme.colors.success.main },
                ]}
                titleStyle={styles.buttonTitle}
                loading={isCompleting}
              />
            </View>
          </TypedCard>
        </View>
      )}
    </DriverLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: driverTheme.colors.background.default,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#cbcbcb",
    borderRadius: 8,
    margin: driverTheme.spacing.sm,
    marginTop: driverTheme.spacing.md,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: driverTheme.colors.background.paper,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: driverTheme.colors.background.paper,
  },
  activeTabText: {
    color: driverTheme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  upcomingContent: {
    padding: driverTheme.spacing.md,
    paddingBottom: 100,
  },
  upcomingContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: driverTheme.spacing.xl,
    minHeight: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  eventsContainer: {
    padding: driverTheme.spacing.sm,
    paddingTop: driverTheme.spacing.md,
  },
  loadCard: {
    borderRadius: 12,
    marginBottom: driverTheme.spacing.sm,
    backgroundColor: "#E3F2FD",
  },
  loadInfo: {
    padding: driverTheme.spacing.sm,
  },
  loadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: driverTheme.spacing.sm,
  },
  loadNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: driverTheme.colors.text.primary,
  },
  chip: {
    backgroundColor: "#377cf6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  chipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  loadDetail: {
    fontSize: 14,
    color: driverTheme.colors.text.primary,
    marginBottom: driverTheme.spacing.xs,
  },
  startButton: {
    borderRadius: 8,
    marginTop: driverTheme.spacing.md,
  },
  eventCard: {
    borderRadius: 12,
    marginBottom: driverTheme.spacing.sm,
    padding: driverTheme.spacing.sm,
    paddingHorizontal: driverTheme.spacing.sm,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: driverTheme.spacing.xs,
  },
  eventChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  eventChipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  eventTime: {
    fontSize: 12,
    color: driverTheme.colors.grey[600],
    textAlign: "right",
  },
  eventLocation: {
    fontSize: 12,
    color: driverTheme.colors.grey[600],
    marginBottom: driverTheme.spacing.sm,
  },
  eventButtons: {
    flexDirection: "column",
    width: "100%",
    // marginLeft: -driverTheme.spacing.sm,
    // marginRight: -driverTheme.spacing.sm,
    gap: driverTheme.spacing.sm,
  },
  fullWidthButton: {
    width: "100%",
    borderRadius: 8,
  },
  eventButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 2,
  },
  eventButtonFull: {
    flex: 1,
  },
  eventButtonTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: driverTheme.spacing.xl,
    width: "100%",
  },
  emptyContainerActive: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: driverTheme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: driverTheme.colors.text.secondary,
    marginTop: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: driverTheme.colors.text.disabled,
    textAlign: "center",
    maxWidth: 300,
  },
  upcomingCard: {
    borderRadius: 12,
    marginBottom: driverTheme.spacing.md,
  },
  upcomingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: driverTheme.spacing.md,
  },
  upcomingLoadNumber: {
    fontSize: 20,
    fontWeight: "600",
    color: driverTheme.colors.primary.main,
  },
  upcomingChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  upcomingChipText: {
    fontSize: 16,
    fontWeight: "600",
  },
  upcomingDetails: {
    backgroundColor: driverTheme.colors.grey[50],
    borderRadius: 8,
    padding: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.md,
  },
  upcomingDetailRow: {
    marginBottom: driverTheme.spacing.sm,
  },
  upcomingDetailLabel: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
    marginBottom: 4,
  },
  upcomingDetailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
  },
  detailsButton: {
    borderRadius: 8,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: "600",
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
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: driverTheme.spacing.md,
  },
  dialogMessage: {
    fontSize: 16,
    color: driverTheme.colors.text.secondary,
    textAlign: "center",
    marginBottom: driverTheme.spacing.lg,
  },
  dialogButtons: {
    gap: driverTheme.spacing.sm,
  },
  dialogButton: {
    borderRadius: 8,
  },
  documentDialogCard: {
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    maxHeight: "85%",
    backgroundColor: driverTheme.colors.background.paper,
    padding: driverTheme.spacing.lg,
  },
  documentDialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  closeButton: {
    padding: driverTheme.spacing.xs,
    marginLeft: driverTheme.spacing.sm,
  },
  documentDialogScroll: {
    maxHeight: "100%",
  },
  documentDialogScrollContent: {
    paddingBottom: driverTheme.spacing.md,
  },
  documentField: {
    marginBottom: driverTheme.spacing.md,
  },
  documentFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: driverTheme.spacing.xs,
    color: driverTheme.colors.text.primary,
  },
  dropdownContainer: {
    position: "relative",
    zIndex: 1000,
  },
  selectContainer: {
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 8,
    padding: driverTheme.spacing.sm,
    backgroundColor: driverTheme.colors.background.paper,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
  },
  dropdownList: {
    backgroundColor: driverTheme.colors.background.paper,
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1001,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: driverTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: driverTheme.colors.divider,
  },
  dropdownItemSelected: {
    backgroundColor: driverTheme.colors.primary.light,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: driverTheme.colors.text.primary,
    flex: 1,
  },
  selectText: {
    fontSize: 16,
    color: driverTheme.colors.text.primary,
    flex: 1,
  },
  selectPlaceholder: {
    color: driverTheme.colors.text.secondary,
  },
  documentInput: {
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 8,
    paddingHorizontal: driverTheme.spacing.sm,
    backgroundColor: driverTheme.colors.background.paper,
    minHeight: 48,
  },
  documentInputWrapper: {
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  documentInputText: {
    fontSize: 16,
    color: driverTheme.colors.text.primary,
  },
  documentSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: driverTheme.spacing.md,
    marginTop: driverTheme.spacing.sm,
    color: driverTheme.colors.text.primary,
  },
  documentsList: {
    maxHeight: 300,
    marginBottom: driverTheme.spacing.lg,
  },
  documentItem: {
    borderRadius: 8,
    marginBottom: driverTheme.spacing.sm,
    borderWidth: 1,
    padding: driverTheme.spacing.md,
    backgroundColor: driverTheme.colors.background.paper,
  },
  documentItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: driverTheme.spacing.sm,
  },
  documentItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  documentItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: driverTheme.spacing.sm,
    color: driverTheme.colors.text.primary,
  },
  requiredChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: driverTheme.spacing.sm,
  },
  requiredChipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  uploadButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  uploadButtonTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  uploadedContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: driverTheme.spacing.xs,
  },
  uploadedText: {
    fontSize: 14,
    color: driverTheme.colors.success.main,
    marginLeft: driverTheme.spacing.xs,
    fontWeight: "500",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: driverTheme.spacing.md,
    borderRadius: 8,
    marginTop: driverTheme.spacing.lg,
    marginBottom: driverTheme.spacing.md,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: driverTheme.spacing.xs,
    color: driverTheme.colors.warning.dark,
    flex: 1,
  },
  documentDialogButtons: {
    marginTop: driverTheme.spacing.sm,
  },
  documentConfirmButton: {
    borderRadius: 8,
  },
  dialogIcon: {
    marginBottom: driverTheme.spacing.md,
  },
  completeInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: driverTheme.spacing.sm,
  },
  completeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
  },
  completeValue: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
    color: driverTheme.colors.text.primary,
  },
  completeDocumentItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: driverTheme.spacing.xs,
  },
  completeDocumentName: {
    fontSize: 14,
    marginLeft: driverTheme.spacing.xs,
    color: driverTheme.colors.text.primary,
  },
});

export default LoadSearch;
