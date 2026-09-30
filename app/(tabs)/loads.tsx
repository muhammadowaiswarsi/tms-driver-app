import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, Card, Icon, Input } from "react-native-elements";
import DriverLayout from "../../src/components/common/DriverLayout";
import CustomMapView, {
  type MapMarker,
} from "../../src/components/common/MapView";
import {
  geocodeAddress,
  markerTypeFromEventType,
} from "../../src/utils/geocode";
import {
  ESignScreen,
  createDefaultPodEsignValues,
  type PodEsignFormValues,
  normalizeSignatureDataUrl,
  toApiDateYmd,
  toApiTime24h,
} from "../../src/components/pod";
import { useAuth } from "../../src/hooks/useAuth";
import LoadReferenceDetails from "../../src/components/LoadReferenceDetails";
import { setSelectedDriverLoad } from "../../src/driver/selectedLoad";
import {
  useChassis,
  useDriverAcceptedLoads,
  useDriverActiveLoads,
  useDriverAssignedLoads,
  useDriverLoadLocationStatus,
  useLoadDocuments,
  useUpdateDriverLoadReturnInfo,
} from "../../src/hooks/useLoad";
import { customAxios } from "../../src/services/api";
import { driverTheme } from "../../src/theme/driverTheme";
import { Event } from "../../src/types/driver.types";
import { formatPickupDateTime, getLoadDeliveryAddress, getLoadPickupAddress, getUpcomingDriverLoads, sortDriverLoadsByPickupDate } from "../../src/utils/driverLoadFilters";


const TypedCard = Card as any;

const EMPTY_LOADS_SEARCH = require("../../assets/images/empty-loads-search.png");

const ORGANIZATION_DOCUMENT_OPTIONS = [
  {
    label: "Proof of Delivery",
    type: "proofOfDelivery",
    required: true,
  },
  {
    label: "Bill of Lading",
    type: "billOfLading",
    required: true,
  },
  {
    label: "Inspection Report",
    type: "inspectionReport",
    required: false,
  },
  {
    label: "TIR Out",
    type: "tirOut",
    required: true,
  },
  {
    label: "TIR In",
    type: "tirIn",
    required: true,
  },
];

const normalizeDocumentType = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .replace(/_/g, "");

const getAttachedDocumentsByType = (
  documentGroups: any,
): Map<string, { url?: string }> => {
  const groups = Array.isArray(documentGroups)
    ? documentGroups
    : Array.isArray(documentGroups?.data)
      ? documentGroups.data
      : [];
  const byType = new Map<string, { url?: string }>();
  groups.forEach((group: any) => {
    (group?.files || []).forEach((file: any) => {
      const type = normalizeDocumentType(String(file?.documentType || ""));
      if (!type) return;
      byType.set(type, {
        url: file?.file?.presignedUrl || file?.file?.url || "",
      });
    });
  });
  return byType;
};

const getDocumentViewUrl = (doc: any) =>
  String(
    doc?.uploadData?.presignedUrl ||
      doc?.uploadData?.url ||
      doc?.viewUrl ||
      "",
  ).trim();

const isProofOfDeliveryDoc = (doc: { type?: string }) => {
  const t = normalizeDocumentType(String(doc?.type || ""));
  return t === "proofofdelivery" || t === "proofofdeliverydocument";
};

const parseOrganizationDocumentRequirements = (documentTypeValue: any) => {
  if (!documentTypeValue) return [];

  let rawItems: any[] = [];

  if (Array.isArray(documentTypeValue)) {
    rawItems = documentTypeValue;
  } else if (typeof documentTypeValue === "string") {
    const trimmedValue = documentTypeValue.trim();

    try {
      const parsedValue = JSON.parse(trimmedValue);

      if (Array.isArray(parsedValue)) {
        rawItems = parsedValue;
      } else if (Array.isArray(parsedValue?.documents)) {
        rawItems = parsedValue.documents;
      } else if (
        parsedValue?.type ||
        parsedValue?.label ||
        parsedValue?.value
      ) {
        rawItems = [parsedValue];
      }
    } catch {
      rawItems = trimmedValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } else if (Array.isArray(documentTypeValue?.documents)) {
    rawItems = documentTypeValue.documents;
  } else if (
    documentTypeValue?.type ||
    documentTypeValue?.label ||
    documentTypeValue?.value
  ) {
    rawItems = [documentTypeValue];
  }

  return rawItems
    .map((item) => {
      if (item?.type || item?.label || item?.value) {
        const normalizedType = normalizeDocumentType(
          item?.type || item?.value || item?.label,
        );

        const matchedOption = ORGANIZATION_DOCUMENT_OPTIONS.find((option) => {
          const optionType = normalizeDocumentType(option.type);
          const optionLabel = normalizeDocumentType(option.label);
          return (
            normalizedType === optionType || normalizedType === optionLabel
          );
        });

        if (matchedOption) {
          return {
            ...matchedOption,
            label: item?.label || matchedOption.label,
            required:
              typeof item?.required === "boolean"
                ? item.required
                : matchedOption.required,
          };
        }

        return {
          label: item?.label || item?.type || item?.value,
          type: item?.type || item?.value,
          required: Boolean(item?.required),
        };
      }

      const normalizedType = normalizeDocumentType(
        typeof item === "string"
          ? item
          : item?.type || item?.value || item?.label,
      );

      return ORGANIZATION_DOCUMENT_OPTIONS.find((option) => {
        const optionType = normalizeDocumentType(option.type);
        const optionLabel = normalizeDocumentType(option.label);
        return normalizedType === optionType || normalizedType === optionLabel;
      });
    })
    .filter(Boolean);
};

const LoadSearch: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: windowWidth } = useWindowDimensions();
  const acceptedDetailItemWidth = windowWidth >= 420 ? "33.333%" : "100%";
  const [activeProgressOpen, setActiveProgressOpen] = useState(false);
  const previousActiveLoadIdRef = useRef<string | null>(null);
  const [currentTab, setCurrentTab] = useState(() => {
    
    return params.tab === "upcoming" ? 1 : 0;
  });
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [podSignPromptDialog, setPodSignPromptDialog] = useState(false);
  const [podSignPurpose, setPodSignPurpose] = useState<"deliver" | "complete">("deliver");
  const [hasPodSignature, setHasPodSignature] = useState(false);
  const [loadToStartId, setLoadToStartId] = useState("");
  const [startChassisNumber, setStartChassisNumber] = useState("");
  const [isStartingLoad, setIsStartingLoad] = useState(false);
  const [startChassisPickerVisible, setStartChassisPickerVisible] = useState(false);
  const [documentChassisPickerVisible, setDocumentChassisPickerVisible] =
    useState(false);
  const [podEsignDialog, setPodEsignDialog] = useState(false);
  const [podEsignData, setPodEsignData] = useState<PodEsignFormValues>(() =>
    createDefaultPodEsignValues(),
  );
  const [esignInitialSnapshot, setEsignInitialSnapshot] =
    useState<PodEsignFormValues>(() => createDefaultPodEsignValues());
  const [documentDialog, setDocumentDialog] = useState(false);
  const [documentDialogMode, setDocumentDialogMode] = useState<"upload" | "complete">(
    "complete",
  );
  const [completeDialog, setCompleteDialog] = useState(false);
  const [startLoadDialog, setStartLoadDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [actionType, setActionType] = useState<
    "departed" | "arrived" | "complete"
  >("arrived");
  const [chassisNumber, setChassisNumber] = useState("");
  const [containerNumber, setContainerNumber] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
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
    data: driverAcceptedLoads,
    isLoading: isLoadingAccepted,
    refetch: refetchAccepted,
  } = useDriverAcceptedLoads();

  const {
    data: driverActiveLoads,
    isLoading: isLoadingActive,
    refetch: refetchActive,
  } = useDriverActiveLoads();
  const { data: activeLoadDocuments, refetch: refetchActiveLoadDocuments } =
    useLoadDocuments(driverActiveLoads?.data?.id);

  const upcomingLoads = getUpcomingDriverLoads(driverUpcomingLoads?.data);
  const acceptedLoads = sortDriverLoadsByPickupDate(
    Array.isArray(driverAcceptedLoads?.data) ? driverAcceptedLoads.data : [],
  );

  const inProgressLoadId = driverActiveLoads?.data?.id || null;
  const hasLoadInProgress = Boolean(inProgressLoadId);

  useEffect(() => {
    const activeId = inProgressLoadId ? String(inProgressLoadId) : null;
    if (!activeId) {
      setActiveProgressOpen(false);
      previousActiveLoadIdRef.current = null;
      return;
    }
    if (previousActiveLoadIdRef.current !== activeId) {
      setActiveProgressOpen(true);
    }
    previousActiveLoadIdRef.current = activeId;
  }, [inProgressLoadId]);

  const loadId = driverActiveLoads?.data?.id;
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);

  const activeEventsKey = useMemo(() => {
    const events = driverActiveLoads?.data?.routing?.[0]?.events || [];
    return events
      .map((e: Event) => `${e.id}:${e.type}:${e.location || ""}`)
      .join("|");
  }, [driverActiveLoads?.data?.routing]);

  useEffect(() => {
    let cancelled = false;

    const readGps = async () => {
      try {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setCurrentLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch {
      }
    };

    readGps();
    const timer = setInterval(readGps, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const events = (driverActiveLoads?.data?.routing?.[0]?.events ||
      []) as Event[];

    const run = async () => {
      if (!events.length) {
        if (!cancelled) setMapMarkers([]);
        return;
      }

      const sorted = [...events].sort(
        (a, b) => (a.sequence || 0) - (b.sequence || 0),
      );
      const seen = new Set<string>();
      const next: MapMarker[] = [];

      for (const event of sorted) {
        const address = (event.location || "").trim();
        if (!address) continue;
        const dedupeKey = address.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const point = await geocodeAddress(address);
        if (!point || cancelled) continue;

        const type = markerTypeFromEventType(event.type);
        next.push({
          latitude: point.latitude,
          longitude: point.longitude,
          title: `${(event.type || "Stop").replace(/_/g, " ")} — ${address}`,
          type,
        });
      }

      if (!cancelled) setMapMarkers(next);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeEventsKey, driverActiveLoads?.data?.id]);



  const chassisNumbers = (chassisData?.data || [])
    .map((item: any) => String(item?.chassisNumber || "").trim())
    .filter(Boolean);

  const matchingStartChassis = chassisNumbers.filter((number: string) =>
    number.toLowerCase().includes(startChassisNumber.trim().toLowerCase()),
  );

  const matchingDocumentChassis = chassisNumbers.filter((number: string) =>
    number.toLowerCase().includes(chassisNumber.trim().toLowerCase()),
  );

  const handleStartLoad = (load: any) => {
    if (hasLoadInProgress && String(load?.id) !== String(inProgressLoadId)) {
      Alert.alert(
        "Load in progress",
        "Finish the current in-progress load before starting another.",
      );
      return;
    }
    setLoadToStartId(load?.id || "");
    setStartChassisNumber(
      load?.chassis?.chassisNumber || load?.otherChassisNumber || "",
    );
    setIsStartingLoad(false);
    setStartChassisPickerVisible(false);
    setStartLoadDialog(true);
  };

  const handleOpenActiveProgress = () => {
    if (!hasLoadInProgress) return;
    setActiveProgressOpen(true);
    setCurrentTab(0);
  };

  const handleConfirmStartLoad = async () => {
    const id = loadToStartId || driverActiveLoads?.data?.id;
    const trimmedChassisNumber = startChassisNumber.trim();
    if (!id) return;
    if (!trimmedChassisNumber) {
      Alert.alert("Required", "Enter the chassis number to start this load.");
      return;
    }
    setIsStartingLoad(true);
    try {
      await customAxios.patch(`/driver/loads/${id}/start`, {
        chassisNumber: trimmedChassisNumber,
      });
      await Promise.all([refetchActive(), refetchAccepted()]);
      setStartLoadDialog(false);
      setStartChassisNumber("");
      setStartChassisPickerVisible(false);
      setActiveProgressOpen(true);
    } catch {
      Alert.alert("Error", "Error starting load");
    } finally {
      setIsStartingLoad(false);
    }
  };

  const updateEventStatus = useDriverLoadLocationStatus(
    driverActiveLoads?.data?.id,
    {
      onSuccess: () => {
        refetchActive();
        refetchAccepted();
        setConfirmDialog(false);
        setIsUpdating(false);
      },
      onError: (error: any) => {
        setIsUpdating(false);
        Alert.alert("Error", "Error updating status");
      },
    },
  );

  const updateLoadStatus = useUpdateDriverLoadReturnInfo(
    driverActiveLoads?.data?.id || "",
    {
      onSuccess: () => {
        refetchActive();
        setCompleteDialog(false);
        setDocumentDialog(false);
        setPodSignPromptDialog(false);
        setPodEsignDialog(false);
        setHasPodSignature(false);
        setPodEsignData(createDefaultPodEsignValues());
        setEsignInitialSnapshot(createDefaultPodEsignValues());
        setIsCompleting(false);
        setTimeout(() => {
          setCurrentTab(1);
        }, 1000);
      },
      onError: (error: any) => {
        setIsCompleting(false);
        Alert.alert("Error", "Error completing load");
      },
    },
  );

  const getAllEvents = () => {
    if (!driverActiveLoads?.data?.routing?.[0]?.events) return [];
    return driverActiveLoads.data.routing[0].events.sort(
      (a: Event, b: Event) => a.sequence - b.sequence,
    );
  };

  const getCurrentEventIndex = () => {
    const events = getAllEvents();
    const currentIndex = events.findIndex(
      (event: Event) =>
        event.status === "PENDING" || event.status === "ARRIVED",
    );
    return currentIndex !== -1 ? currentIndex : events.length - 1;
  };

  // Next stop the driver still needs to reach (or finish at).
  const getNavigationDestination = () => {
    const events = getAllEvents();
    const current =
      events.find(
        (event: Event) =>
          event.status === "PENDING" || event.status === "ARRIVED",
      ) || events[events.length - 1];
    const address = String(current?.location || "").trim();
    return address || null;
  };

  const openExternalMaps = async (address: string) => {
    const trimmed = String(address || "").trim();
    if (!trimmed) {
      Alert.alert("Error", "No destination address found for this stop.");
      return;
    }

    const query = encodeURIComponent(trimmed);
    const urls =
      Platform.OS === "ios"
        ? [
            `maps://?daddr=${query}&dirflg=d`,
            `https://maps.apple.com/?daddr=${query}&dirflg=d`,
            `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`,
          ]
        : [
            `google.navigation:q=${query}`,
            `geo:0,0?q=${query}`,
            `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`,
            `https://maps.google.com/?daddr=${query}&directionsmode=driving`,
          ];

    for (const url of urls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Try the next maps URL / scheme.
      }
    }

    Alert.alert("Error", "Unable to open maps on this device.");
  };

  const getEventButtonStates = (event: Event, eventIndex: number) => {
    const currentEventIndex = getCurrentEventIndex();
    const isCurrentEvent = eventIndex === currentEventIndex;
    const isCompleteType = (event.type || "").toUpperCase() === "COMPLETED";
    const showCompleted = isCompleteType;
    const completedEnabled = isCurrentEvent && isCompleteType;
    const arrivedEnabled = isCurrentEvent && event.status === "PENDING";
    const departedEnabled = isCurrentEvent && event.status === "ARRIVED";

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
    action: "departed" | "arrived" | "complete",
  ) => {
    setSelectedEventId(eventId);
    setActionType(action);

    const event = getAllEvents().find((item: Event) => item.id === eventId);
    const isDeliverContainer = String(event?.type || "").toUpperCase().includes("DELIVER");

    if (action === "arrived" && isDeliverContainer) {
      setPodSignPurpose("deliver");
      setPodSignPromptDialog(true);
      return;
    }

    if (action === "complete") {
      if (!hasPodSignature) {
        setPodSignPurpose("complete");
        setPodSignPromptDialog(true);
        return;
      }
      setDocumentDialogMode("complete");
      setDocumentDialog(true);
      return;
    }

    setConfirmDialog(true);
  };

  const finishPodPrompt = () => {
    setPodSignPromptDialog(false);
    if (podSignPurpose === "deliver") {
      setActionType("arrived");
      setConfirmDialog(true);
      return;
    }
    setDocumentDialogMode("complete");
    setDocumentDialog(true);
  };

  const openDocumentUploadDialog = () => {
    setDocumentDialogMode("upload");
    setDocumentDialog(true);
  };

  const openPodEsign = () => {
    setEsignInitialSnapshot(
      hasPodSignature ? { ...podEsignData } : createDefaultPodEsignValues(),
    );
    setPodSignPromptDialog(false);
    setPodEsignDialog(true);
  };

  const handlePodEsignBack = () => {
    setPodEsignDialog(false);
    setPodSignPromptDialog(true);
  };

  const handlePodEsignApply = (values: PodEsignFormValues) => {
    setPodEsignData(values);
    setHasPodSignature(true);
    setPodEsignDialog(false);
    setPodSignPromptDialog(true);
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

  const mapDocumentTypeToAPI = (localType: string): string => {
    const typeMap: Record<string, string> = {
      proofOfDelivery: "PROOF_OF_DELIVERY",
      tirOut: "TIR_OUT",
      tirIn: "TIR_IN",
    };
    return typeMap[localType] || localType.toUpperCase();
  };

  useEffect(() => {
    if (driverActiveLoads?.data) {
      const customerDocumentRequirements =
        parseOrganizationDocumentRequirements(
          driverActiveLoads?.data?.customer?.documentType,
        );
      const apiDocumentRequirements =
        driverActiveLoads?.data?.documentRequirements?.documents;

      const fallbackDocuments = ORGANIZATION_DOCUMENT_OPTIONS.map(
        (doc, index) => ({
          id: String(index + 1),
          name: doc.label,
          type: doc.type,
          required: Boolean(doc.required),
          uploaded: false,
          uploadData: null,
        }),
      );

      const nextDocuments =
        customerDocumentRequirements.length > 0
          ? customerDocumentRequirements.map((doc, index) => ({
              id: String(index + 1),
              name: doc?.label ?? "",
              type: doc?.type ?? "",
              required: Boolean(doc?.required),
              uploaded: false,
              uploadData: null,
            }))
          : Array.isArray(apiDocumentRequirements) &&
              apiDocumentRequirements.length > 0
            ? apiDocumentRequirements.map((doc: any, index: number) => ({
                id: String(index + 1),
                name: doc.label,
                type: doc.type,
                required: Boolean(doc.required),
                uploaded: false,
                uploadData: null,
              }))
            : fallbackDocuments;

      if (!nextDocuments.some((doc) => isProofOfDeliveryDoc(doc))) {
        const podOption = ORGANIZATION_DOCUMENT_OPTIONS.find((doc) => isProofOfDeliveryDoc(doc));
        if (podOption) {
          nextDocuments.push({
            id: String(nextDocuments.length + 1),
            name: podOption.label,
            type: podOption.type,
            required: podOption.required,
            uploaded: false,
            uploadData: null,
          });
        }
      }

      setDocuments((prev) => {
        const attachedByType = getAttachedDocumentsByType(activeLoadDocuments);
        return nextDocuments.map((doc) => {
          const existingDoc = prev.find(
            (item) =>
              normalizeDocumentType(item.type) ===
              normalizeDocumentType(doc.type),
          );
          const attached = attachedByType.get(
            normalizeDocumentType(doc.type),
          );
          const alreadyAttached = Boolean(attached);

          if (existingDoc) {
            return {
              ...doc,
              uploaded: existingDoc.uploaded || alreadyAttached,
              uploadedAt: existingDoc.uploadedAt,
              uploadData: existingDoc.uploadData,
              viewUrl: existingDoc.viewUrl || attached?.url || "",
              persisted: Boolean(existingDoc.persisted) || alreadyAttached,
            };
          }

          return {
            ...doc,
            uploaded: alreadyAttached,
            viewUrl: attached?.url || "",
            persisted: alreadyAttached,
          };
        });
      });
      setChassisNumber(
        driverActiveLoads.data.chassis?.chassisNumber ||
          driverActiveLoads.data.otherChassisNumber ||
          "",
      );
      setContainerNumber(driverActiveLoads.data.containerNumber || "");
    }
  }, [driverActiveLoads, activeLoadDocuments]);

  useFocusEffect(
    useCallback(() => {
      refetchActive();
      refetchAccepted();
      refetchUpcoming();
    }, [refetchActive, refetchAccepted, refetchUpcoming]),
  );

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
      refetchAccepted();
    }
  };

  const handleShowDetails = (load: any) => {
    setSelectedDriverLoad(load);
    router.push({
      pathname: "/load-details",
      params: { loadId: load.id },
    } as any);
  };

  const isDocumentDone = (doc: { type?: string; uploaded?: boolean }) =>
    isProofOfDeliveryDoc(doc) ? hasPodSignature || Boolean(doc.uploaded) : Boolean(doc.uploaded);

  const documentsForComplete = [
    ...documents.filter((doc) => !isProofOfDeliveryDoc(doc)),
    ...documents.filter((doc) => isProofOfDeliveryDoc(doc)),
  ];

  const allRequiredDocsUploaded = documents
    .filter((doc) => doc.required)
    .every((doc) => isDocumentDone(doc));

  const handleViewDocument = async (doc: any) => {
    const url = getDocumentViewUrl(doc);
    if (!url) {
      Alert.alert("Error", "Document file is not available yet");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Unable to open document");
    }
  };

  const handleSaveChassisFromDocuments = async () => {
    const loadId = driverActiveLoads?.data?.id;
    const trimmedChassisNumber = chassisNumber.trim();
    if (!loadId || !trimmedChassisNumber) {
      Alert.alert("Required", "Enter a chassis number");
      return false;
    }
    try {
      await customAxios.patch(`/driver/loads/${loadId}/chassis`, {
        chassisNumber: trimmedChassisNumber,
      });
      await refetchActive();
      return true;
    } catch (error: any) {
      let errorMessage = "Failed to update chassis";
      if (error?.response?.data?.message) {
        const message = error.response.data.message;
        errorMessage = Array.isArray(message) ? message[0] : String(message);
      } else if (error?.message) {
        errorMessage = String(error.message);
      }
      Alert.alert("Error", errorMessage);
      return false;
    }
  };

  const handleDocumentDialogDone = async () => {
    const saved = await handleSaveChassisFromDocuments();
    if (saved) {
      setDocumentChassisPickerVisible(false);
      setDocumentDialog(false);
    }
  };

  const handleCompleteLoad = async () => {
    if (!allRequiredDocsUploaded) return;
    const saved = await handleSaveChassisFromDocuments();
    if (!saved) return;
    setCompleteDialog(true);
  };

  const handleFileUpload = async (docId: string) => {
    try {
      let getDocumentAsync;
      try {
        const documentPicker = await import("expo-document-picker");
        getDocumentAsync = documentPicker.getDocumentAsync;
      } catch (importError) {
        Alert.alert(
          "Error",
          "expo-document-picker is not installed. Please run: npm install expo-document-picker",
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

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        name: file.name || `document_${Date.now()}`,
      } as any);

      const customFileName = `${Date.now()}_${file.name || "document"}`;

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
        },
      );

      if (uploadResponse.data.success && uploadResponse.data.data) {
        const uploadData = uploadResponse.data.data;
        const loadId = driverActiveLoads?.data?.id;
        const targetDoc = documents.find((d) => d.id === docId);

        if (!loadId || !targetDoc) {
          Alert.alert("Error", "Active load not found");
          return;
        }

        await customAxios.post(`/driver/loads/${loadId}/documents`, {
          documentType: targetDoc.type,
          file: {
            key: uploadData.key,
            url: uploadData.url,
            originalName: uploadData.originalName,
            bucket: uploadData.bucket,
            mimeType: uploadData.mimeType,
            size: Number(uploadData.size) || 0,
          },
        });

        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  uploaded: true,
                  uploadedAt: new Date(),
                  uploadData: uploadData,
                  viewUrl: uploadData.url || "",
                  persisted: true,
                }
              : d,
          ),
        );
        await refetchActiveLoadDocuments();
      }
    } catch (error: any) {
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
    const rawSig = podEsignData.signatureDataUrl?.trim() ?? "";

    setIsCompleting(true);
    try {
      const podSubmission: Record<string, string> = {};
      if (rawSig) podSubmission.signatureDataUrl = normalizeSignatureDataUrl(rawSig);
      if (podEsignData.printName?.trim()) {
        podSubmission.receiverName = podEsignData.printName.trim();
      }
      if (podEsignData.date?.trim()) {
        podSubmission.date = toApiDateYmd(podEsignData.date);
      }
      if (podEsignData.timeIn?.trim()) {
        podSubmission.timeIn = toApiTime24h(podEsignData.timeIn);
      }
      if (podEsignData.timeOut?.trim()) {
        podSubmission.timeOut = toApiTime24h(podEsignData.timeOut);
      }

      const payload: Record<string, unknown> = {};
      if (rawSig) payload.podSubmission = podSubmission;
      if (containerNumber.trim()) {
        payload.containerNumber = containerNumber.trim();
      }
      if (chassisNumber.trim()) {
        payload.chassisNumber = chassisNumber.trim();
      }

      documents.forEach((doc) => {
        if (isProofOfDeliveryDoc(doc)) {
          if (!rawSig && doc.uploaded && doc.uploadData && !doc.persisted) {
            (payload as Record<string, unknown>)[doc.type] = {
              key: doc.uploadData.key,
              url: doc.uploadData.url,
              originalName: doc.uploadData.originalName,
              bucket: doc.uploadData.bucket,
              mimeType: doc.uploadData.mimeType,
              size: doc.uploadData.size,
            };
          }
          return;
        }
        // Mid-load uploads are already persisted on the load.
        if (doc.uploaded && doc.uploadData && !doc.persisted) {
          (payload as Record<string, unknown>)[doc.type] = {
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
    }
  };

  const renderAcceptedLoadCard = (load: any) => {
    const isCurrentInProgress =
      hasLoadInProgress && String(load.id) === String(inProgressLoadId);
    const canStartThisLoad =
      !hasLoadInProgress &&
      (load.status === "PENDING" ||
        load.status === "DISPATCHED" ||
        !load.status);

    const detailItems = [
      { label: "Container", value: load.containerNumber || "--" },
      {
        label: "Route Type",
        value: load.route?.replace(/_/g, " ").toUpperCase() || "--",
      },
      { label: "Pickup", value: formatPickupDateTime(load) },
      { label: "Load Type", value: load.loadType?.toUpperCase() || "--" },
      { label: "Pickup Location", value: getLoadPickupAddress(load) },
      { label: "Delivery Address", value: getLoadDeliveryAddress(load) },
      { label: "SCAC", value: load.scac || "--" },
      { label: "SSL", value: load.ssl || "--" },
      {
        label: "BOL",
        value:
          load.shipmentInfo?.billOfLading ||
          load.shipmentInfo?.masterBillOfLading ||
          load.shipmentInfo?.houseBillOfLading ||
          "--",
      },
    ];

    return (
      <TypedCard
        key={load.id}
        containerStyle={[
          styles.acceptedCard,
          isCurrentInProgress ? styles.acceptedCardInProgress : null,
        ]}
      >
        <View style={styles.acceptedHeader}>
          <Text style={styles.acceptedLoadNumber}>{load.loadNumber}</Text>
          <View
            style={[
              styles.acceptedChip,
              { backgroundColor: driverTheme.colors.primary.main },
            ]}
          >
            <Text style={styles.acceptedChipText}>
              {isCurrentInProgress ? "In Progress" : "Accepted"}
            </Text>
          </View>
        </View>
        <View style={styles.acceptedDetails}>
          <View style={styles.acceptedGrid}>
            {detailItems.map((item) => (
              <View
                key={item.label}
                style={[styles.acceptedGridItem, { width: acceptedDetailItemWidth }]}
              >
                <Text style={styles.acceptedDetailLabel}>{item.label}</Text>
                <Text style={styles.acceptedDetailValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.acceptedActionsRow}>
          {isCurrentInProgress ? (
            <Button
              title="Continue Load"
              onPress={handleOpenActiveProgress}
              containerStyle={styles.acceptedActionButton}
              buttonStyle={[
                styles.acceptedActionBtn,
                { backgroundColor: driverTheme.colors.success.dark },
              ]}
              titleStyle={styles.acceptedActionTitle}
            />
          ) : (
            <Button
              title="Start Load"
              onPress={() => handleStartLoad(load)}
              disabled={!canStartThisLoad}
              containerStyle={styles.acceptedActionButton}
              buttonStyle={[
                styles.acceptedActionBtn,
                {
                  backgroundColor: canStartThisLoad
                    ? driverTheme.colors.success.dark
                    : driverTheme.colors.grey[300],
                },
              ]}
              titleStyle={[
                styles.acceptedActionTitle,
                !canStartThisLoad
                  ? { color: driverTheme.colors.grey[600] }
                  : null,
              ]}
              disabledStyle={{
                backgroundColor: driverTheme.colors.grey[300],
              }}
            />
          )}
          <Button
            title="Show Details"
            onPress={() => handleShowDetails(load)}
            containerStyle={styles.acceptedActionButton}
            buttonStyle={[
              styles.acceptedActionBtn,
              { backgroundColor: driverTheme.colors.primary.main },
            ]}
            titleStyle={styles.acceptedActionTitle}
          />
        </View>
        {hasLoadInProgress && !isCurrentInProgress ? (
          <Text style={styles.acceptedHintText}>
            Another load is in progress. Finish it before starting this one.
          </Text>
        ) : null}
      </TypedCard>
    );
  };

  const renderActiveTab = () => {
    if (!(hasLoadInProgress && activeProgressOpen)) {
      if (acceptedLoads.length > 0) {
        return (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.upcomingContent}>
            {acceptedLoads.map(renderAcceptedLoadCard)}
          </ScrollView>
        );
      }
      return (
        <View style={styles.emptyContainerActive}>
          <Image
            source={EMPTY_LOADS_SEARCH}
            style={styles.emptySearchImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitleCaughtUp}>You&apos;re All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            There are no active loads assigned right now.
          </Text>
          <TouchableOpacity
            style={styles.seeLoadsButton}
            onPress={() => handleTabChange(1)}
            activeOpacity={0.85}
          >
            <Icon name="local-shipping" type="material" color="#fff" size={20} />
            <Text style={styles.seeLoadsButtonText}>See Available Loads</Text>
            <Icon name="chevron-right" type="material" color="#fff" size={22} />
          </TouchableOpacity>
        </View>
      );
    }

    const events = getAllEvents();
    const currentEventIndex = getCurrentEventIndex();
    const loadStarted =
      Boolean(driverActiveLoads?.data?.status) &&
      driverActiveLoads.data.status !== "PENDING" &&
      driverActiveLoads.data.status !== "DISPATCHED";
    const navigationDestination = loadStarted
      ? getNavigationDestination()
      : null;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={styles.progressBackRow}
          onPress={() => setActiveProgressOpen(false)}
          activeOpacity={0.75}
        >
          <Icon
            name="arrow-back"
            type="material"
            color={driverTheme.colors.text.secondary}
            size={20}
          />
          <Text style={styles.progressBackText}>Active Loads</Text>
        </TouchableOpacity>

        <CustomMapView
          height={300}
          markers={mapMarkers}
          currentLocation={currentLocation}
          showRoute
        />

        {navigationDestination ? (
          <View style={styles.navigateButtonWrap}>
            <Button
              title="Navigate"
              onPress={() => openExternalMaps(navigationDestination)}
              buttonStyle={styles.navigateButton}
              titleStyle={styles.navigateButtonTitle}
              icon={
                <Icon
                  name="navigation"
                  type="material"
                  color="#fff"
                  size={18}
                  style={{ marginRight: 6 }}
                />
              }
            />
          </View>
        ) : null}

        
        <View style={styles.eventsContainer}>
            {events
              .filter((event: Event, index: number) => {
                return (
                  event.status !== "DEPARTED" || index === events.length - 1
                );
              })
              .map((event: Event, eventIndex: number) => {
                const originalEventIndex = events.findIndex(
                  (e: Event) => e.id === event.id,
                );
                const buttonStates = getEventButtonStates(
                  event,
                  originalEventIndex,
                );
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
              })}
        </View>
        <LoadReferenceDetails
          load={driverActiveLoads?.data}
          documents={activeLoadDocuments?.data || activeLoadDocuments}
          onUploadPress={openDocumentUploadDialog}
        />
      </ScrollView>
    );
  };

  const renderUpcomingTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={
        upcomingLoads.length === 0
          ? styles.upcomingContentEmpty
          : styles.upcomingContent
      }
    >
      {upcomingLoads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={EMPTY_LOADS_SEARCH}
            style={styles.emptySearchImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitleCaughtUp}>You&apos;re All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            There are no upcoming loads assigned right now.
          </Text>
        </View>
      ) : (
        upcomingLoads.map((load: any) => (
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
                  {load.containerNumber || "--"}
                </Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Route Type</Text>
                <Text style={styles.upcomingDetailValue}>
                  {load.route?.replace(/_/g, " ").toUpperCase() || "--"}
                </Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Pickup</Text>
                <Text style={styles.upcomingDetailValue}>
                  {formatPickupDateTime(load)}
                </Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Load Type</Text>
                <Text style={styles.upcomingDetailValue}>
                  {load.loadType?.toUpperCase() || "--"}
                </Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>SCAC</Text>
                <Text style={styles.upcomingDetailValue}>{load.scac || "--"}</Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>SSL</Text>
                <Text style={styles.upcomingDetailValue}>{load.ssl || "--"}</Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>BOL</Text>
                <Text style={styles.upcomingDetailValue}>
                  {load.shipmentInfo?.billOfLading || load.shipmentInfo?.masterBillOfLading || load.shipmentInfo?.houseBillOfLading || "--"}
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

  const activeCount = acceptedLoads.length;
  const upcomingCount = upcomingLoads.length;

  return (
    <DriverLayout currentTab="loads">
      <View style={styles.container}>
        
        <View style={styles.tabsWrap}>
          <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, currentTab === 0 && styles.activeTab]}
            onPress={() => handleTabChange(0)}
          >
            <Text
              style={[styles.tabText, currentTab === 0 && styles.activeTabText]}
            >
              Active ({activeCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentTab === 1 && styles.activeTab]}
            onPress={() => handleTabChange(1)}
          >
            <Text
              style={[styles.tabText, currentTab === 1 && styles.activeTabText]}
            >
              Upcoming ({upcomingCount})
            </Text>
          </TouchableOpacity>
          </View>
        </View>

        
        {isLoadingActive || isLoadingUpcoming || (currentTab === 0 && isLoadingAccepted) ? (
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

      
      {startLoadDialog && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Start Load</Text>
            <Text style={styles.dialogMessage}>
              Enter the chassis number to start this load.
            </Text>
            <Text style={styles.documentFieldLabel}>Chassis #</Text>
            <Input
              placeholder="Select or type chassis #"
              value={startChassisNumber}
              onChangeText={(value) => {
                setStartChassisNumber(value);
                setStartChassisPickerVisible(true);
              }}
              onFocus={() => setStartChassisPickerVisible(true)}
              inputContainerStyle={styles.documentInput}
              inputStyle={styles.documentInputText}
              containerStyle={styles.documentInputWrapper}
              errorStyle={styles.documentInputError}
            />
            {startChassisPickerVisible && matchingStartChassis.length > 0 && (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {matchingStartChassis.map((number: string) => (
                    <TouchableOpacity
                      key={number}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setStartChassisNumber(number);
                        setStartChassisPickerVisible(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{number}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                onPress={handleConfirmStartLoad}
                disabled={!startChassisNumber.trim() || isStartingLoad}
                activeOpacity={0.85}
                style={[
                  styles.dialogButton,
                  {
                    backgroundColor:
                      startChassisNumber.trim() && !isStartingLoad
                        ? driverTheme.colors.primary.main
                        : driverTheme.colors.grey[300],
                    opacity:
                      !startChassisNumber.trim() || isStartingLoad ? 0.9 : 1,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                {isStartingLoad ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.buttonTitle,
                      {
                        color: startChassisNumber.trim()
                          ? "#fff"
                          : driverTheme.colors.grey[700],
                      },
                    ]}
                  >
                    Start Load
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (isStartingLoad) return;
                  setStartLoadDialog(false);
                  setStartChassisPickerVisible(false);
                }}
                disabled={isStartingLoad}
                activeOpacity={0.85}
                style={[
                  styles.dialogButton,
                  {
                    backgroundColor: driverTheme.colors.grey[200],
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isStartingLoad ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonTitle,
                    { color: driverTheme.colors.grey[700] },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TypedCard>
        </View>
      )}

      
      {podSignPromptDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.podSignCard}>
            <Icon
              name="warning"
              type="material"
              size={34}
              color={driverTheme.colors.grey[500]}
              containerStyle={styles.podSignIconWrap}
            />
            <Text style={styles.podSignHeading}>Sign Proof of Delivery</Text>

            <View
              style={[
                styles.podSignRequirement,
                hasPodSignature && styles.podSignRequirementDone,
              ]}
            >
              <View style={styles.podSignRequirementLeft}>
                <Icon
                  name={hasPodSignature ? "check-circle" : "description"}
                  type="material"
                  color={
                    hasPodSignature
                      ? driverTheme.colors.success.main
                      : driverTheme.colors.grey[600]
                  }
                  size={22}
                />
                <View style={styles.podSignRequirementText}>
                  <Text
                    style={[
                      styles.podSignStatus,
                      hasPodSignature && styles.podSignStatusDone,
                    ]}
                    numberOfLines={1}
                  >
                    {hasPodSignature
                      ? "Signature Captured"
                      : "Missing Signature"}
                  </Text>
                  <Text style={styles.podSignDocName} numberOfLines={2}>
                    Proof of Delivery
                  </Text>
                </View>
              </View>
              <Button
                title={hasPodSignature ? "Edit" : "Sign"}
                onPress={openPodEsign}
                buttonStyle={styles.podSignActionButton}
                titleStyle={styles.podSignActionButtonTitle}
                icon={
                  <Icon
                    name="edit"
                    type="material"
                    color="#fff"
                    size={15}
                    containerStyle={styles.podSignActionIcon}
                  />
                }
              />
            </View>

            <View style={styles.podSignActions}>
              <TouchableOpacity onPress={finishPodPrompt} activeOpacity={0.75}>
                <Text style={styles.podSignSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.podSignDoneButton} onPress={finishPodPrompt} activeOpacity={0.75}>
                <Text style={styles.podSignDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      
      {podEsignDialog && (
        <View style={styles.dialogOverlay}>
          <ESignScreen
            visible={podEsignDialog}
            initialValues={esignInitialSnapshot}
            onBack={handlePodEsignBack}
            onApply={handlePodEsignApply}
          />
        </View>
      )}

      
      {documentDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.documentDialogCard}>
            <View style={styles.documentDialogHeader}>
              <Text style={styles.dialogTitle}>
                {documentDialogMode === "complete"
                  ? "Complete Load"
                  : "Upload Documents"}
              </Text>
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
              <View style={styles.documentField}>
                <Text style={styles.documentFieldLabel}>Chassis #</Text>
                <Input
                  placeholder="Select or type chassis #"
                  value={chassisNumber}
                  onChangeText={(value) => {
                    setChassisNumber(value);
                    setDocumentChassisPickerVisible(true);
                  }}
                  onFocus={() => setDocumentChassisPickerVisible(true)}
                  inputContainerStyle={styles.documentInput}
                  inputStyle={styles.documentInputText}
                  containerStyle={styles.documentInputWrapper}
                  errorStyle={styles.documentInputError}
                />
                {documentChassisPickerVisible &&
                  matchingDocumentChassis.length > 0 && (
                    <View style={styles.dropdownList}>
                      <ScrollView
                        style={styles.dropdownScroll}
                        nestedScrollEnabled
                      >
                        {matchingDocumentChassis.map((number: string) => (
                          <TouchableOpacity
                            key={number}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setChassisNumber(number);
                              setDocumentChassisPickerVisible(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{number}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
              </View>

              
              <Text style={styles.documentSectionTitle}>Documents</Text>
              <View>
                {documentsForComplete.map((raw) => {
                  const doc = { ...raw, uploaded: isDocumentDone(raw) };
                  const viewUrl = getDocumentViewUrl(doc);
                  return (
                  <View
                    key={doc.id}
                    style={[
                      styles.documentItem,
                      {
                        borderColor: doc.uploaded
                          ? driverTheme.colors.success.main
                          : doc.required
                            ? driverTheme.colors.error.main
                            : driverTheme.colors.success.main,
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
                      <View
                        style={[
                          styles.requiredChip,
                          {
                            backgroundColor: doc.required
                              ? driverTheme.colors.error.main
                              : driverTheme.colors.success.main,
                          },
                        ]}
                      >
                        <Text style={styles.requiredChipText}>
                          {doc.required ? "Required" : "Optional"}
                        </Text>
                      </View>
                    </View>
                    {!doc.uploaded && (
                      <TouchableOpacity
                        onPress={() => handleFileUpload(doc.id)}
                        disabled={uploadingDocId === doc.id}
                        activeOpacity={0.85}
                        style={[
                          styles.docActionButton,
                          {
                            backgroundColor: driverTheme.colors.primary.main,
                            opacity: uploadingDocId === doc.id ? 0.7 : 1,
                          },
                        ]}
                      >
                        {uploadingDocId === doc.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Icon
                              name="cloud-upload"
                              type="material"
                              color="#fff"
                              size={18}
                            />
                            <Text style={styles.docActionButtonText}>Upload</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {doc.uploaded && (
                      <TouchableOpacity
                        onPress={() => handleViewDocument(doc)}
                        disabled={!viewUrl}
                        activeOpacity={0.85}
                        style={[
                          styles.docActionButton,
                          {
                            backgroundColor: viewUrl
                              ? driverTheme.colors.primary.main
                              : driverTheme.colors.grey[300],
                          },
                        ]}
                      >
                        <Icon
                          name="visibility"
                          type="material"
                          color={viewUrl ? "#fff" : driverTheme.colors.grey[600]}
                          size={18}
                        />
                        <Text
                          style={[
                            styles.docActionButtonText,
                            !viewUrl && { color: driverTheme.colors.grey[600] },
                          ]}
                        >
                          View
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  );
                })}
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
                {documentDialogMode === "complete" ? (
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
                ) : (
                  <Button
                    title="Done"
                    onPress={handleDocumentDialogDone}
                    buttonStyle={[
                      styles.documentConfirmButton,
                      { backgroundColor: driverTheme.colors.primary.main },
                    ]}
                    titleStyle={styles.buttonTitle}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      
      {completeDialog && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.dialogCard}>
            <View style={styles.completeDialogHeader}>
              <TouchableOpacity
                onPress={() => setCompleteDialog(false)}
                disabled={isCompleting}
                style={[
                  styles.closeButton,
                  isCompleting && styles.closeButtonDisabled,
                ]}
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <Icon
                  name="close"
                  type="material"
                  color={driverTheme.colors.text.primary}
                  size={24}
                />
              </TouchableOpacity>
            </View>
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
            {documentsForComplete
              .filter((doc) => isDocumentDone(doc))
              .map((doc) => (
                <View key={doc.id} style={styles.completeDocumentItem}>
                  <View style={styles.completeDocumentLeft}>
                    <Icon
                      name="check-circle"
                      type="material"
                      size={16}
                      color={driverTheme.colors.success.main}
                    />
                    <Text style={styles.completeDocumentName}>{doc.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.requiredChip,
                      {
                        backgroundColor: doc.required
                          ? driverTheme.colors.error.main
                          : driverTheme.colors.success.main,
                      },
                    ]}
                  >
                    <Text style={styles.requiredChipText}>
                      {doc.required ? "Required" : "Optional"}
                    </Text>
                  </View>
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
  tabsWrap: {
    alignItems: "center",
    marginHorizontal: driverTheme.spacing.md,
    marginTop: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
  },
  tabsContainer: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 999,
  },
  activeTab: {
    backgroundColor: "#0066FF",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  activeTabText: {
    color: "#fff",
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
    flex: 1,
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
  emptySearchImage: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: driverTheme.colors.text.secondary,
    marginTop: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
  },
  emptyTitleCaughtUp: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1B365D",
    marginTop: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: driverTheme.colors.text.secondary,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 22,
  },
  seeLoadsButton: {
    marginTop: driverTheme.spacing.lg,
    backgroundColor: driverTheme.colors.primary.main,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 320,
  },
  seeLoadsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
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
  acceptedCard: {
    borderRadius: 12,
    marginBottom: driverTheme.spacing.md,
    width: "100%",
  },
  acceptedCardInProgress: {
    borderWidth: 1,
    borderColor: driverTheme.colors.primary.main,
  },
  acceptedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  acceptedLoadNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: driverTheme.colors.primary.main,
    flexShrink: 1,
    marginRight: 8,
  },
  acceptedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  acceptedChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  acceptedDetails: {
    backgroundColor: driverTheme.colors.grey[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  acceptedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  acceptedGridItem: {
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  acceptedDetailLabel: {
    fontSize: 12,
    color: driverTheme.colors.text.secondary,
    marginBottom: 2,
  },
  acceptedDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
  },
  acceptedActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  acceptedActionButton: {
    flex: 1,
  },
  acceptedActionBtn: {
    borderRadius: 8,
    paddingVertical: 12,
  },
  acceptedActionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  acceptedHintText: {
    marginTop: 8,
    fontSize: 12,
    color: driverTheme.colors.text.secondary,
  },
  progressBackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: driverTheme.spacing.md,
    paddingTop: driverTheme.spacing.sm,
    paddingBottom: driverTheme.spacing.xs,
    gap: 6,
  },
  progressBackText: {
    fontSize: 14,
    fontWeight: "600",
    color: driverTheme.colors.text.secondary,
  },
  navigateButtonWrap: {
    paddingHorizontal: driverTheme.spacing.sm,
    paddingTop: driverTheme.spacing.sm,
  },
  navigateButton: {
    backgroundColor: "#1a73e8",
    borderRadius: 8,
    paddingVertical: 12,
  },
  navigateButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
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
  completeDialogHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    marginBottom: driverTheme.spacing.xs,
  },
  closeButtonDisabled: {
    opacity: 0.4,
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
    marginTop: driverTheme.spacing.md,
  },
  dialogButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    minHeight: 44,
  },
  documentDialogCard: {
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    height: "85%",
    backgroundColor: driverTheme.colors.background.paper,
    paddingTop: driverTheme.spacing.lg,
    paddingHorizontal: driverTheme.spacing.lg,
    paddingBottom: driverTheme.spacing.lg,
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
    flex: 1,
  },
  documentDialogScrollContent: {
    paddingBottom: driverTheme.spacing.md,
    flexGrow: 1,
  },
  documentField: {
    marginBottom: driverTheme.spacing.xs,
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
  documentInputWrapper: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    marginBottom: 0,
    marginVertical: 0,
  },
  documentInputError: {
    height: 0,
    margin: 0,
    padding: 0,
  },
  documentInput: {
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 8,
    paddingHorizontal: driverTheme.spacing.sm,
    backgroundColor: driverTheme.colors.background.paper,
    minHeight: 48,
  },
  documentInputText: {
    fontSize: 16,
    color: driverTheme.colors.text.primary,
  },
  dropdownList: {
    backgroundColor: driverTheme.colors.background.paper,
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 8,
    marginTop: 0,
    marginBottom: driverTheme.spacing.md,
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
  documentSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: driverTheme.spacing.md,
    color: driverTheme.colors.text.primary,
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
  docActionButton: {
    marginTop: 8,
    borderRadius: 10,
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  docActionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
    justifyContent: "space-between",
    marginBottom: driverTheme.spacing.xs,
  },
  completeDocumentLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  completeDocumentName: {
    fontSize: 14,
    marginLeft: driverTheme.spacing.xs,
    marginRight: driverTheme.spacing.sm,
    color: driverTheme.colors.text.primary,
  },
  podSignCard: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    backgroundColor: driverTheme.colors.background.paper,
    paddingHorizontal: driverTheme.spacing.lg,
    paddingTop: driverTheme.spacing.lg,
    paddingBottom: driverTheme.spacing.md,
  },
  podSignIconWrap: {
    alignSelf: "center",
    marginBottom: driverTheme.spacing.xs,
  },
  podSignHeading: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: driverTheme.colors.text.primary,
    marginBottom: driverTheme.spacing.lg,
  },
  podSignRequirement: {
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f5d8df",
    backgroundColor: "#fff1f4",
    paddingHorizontal: driverTheme.spacing.sm,
    paddingVertical: driverTheme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: driverTheme.spacing.sm,
  },
  podSignRequirementDone: {
    borderColor: "#cfe8d2",
    backgroundColor: "#f0fbf2",
  },
  podSignRequirementLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  podSignRequirementText: {
    flex: 1,
    marginLeft: driverTheme.spacing.sm,
    minWidth: 0,
  },
  podSignStatus: {
    color: "#9e4d5e",
    fontSize: 12,
    fontWeight: "700",
  },
  podSignStatusDone: {
    color: driverTheme.colors.success.dark,
  },
  podSignDocName: {
    marginTop: 2,
    color: driverTheme.colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  podSignActionButton: {
    minWidth: 82,
    borderRadius: 8,
    backgroundColor: driverTheme.colors.primary.main,
    paddingHorizontal: driverTheme.spacing.sm,
    paddingVertical: 8,
  },
  podSignActionButtonTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  podSignActionIcon: {
    marginRight: 4,
  },
  chassisHelper: {
    marginTop: 4,
    color: driverTheme.colors.text.secondary,
    fontSize: 12,
  },
  podSignActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  podSignDoneButton: {
    backgroundColor: driverTheme.colors.primary.main,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  podSignDoneText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  podSignSkipButton: {
    marginTop: driverTheme.spacing.xl,
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: driverTheme.colors.grey[200],
  },
  podSignSkipText: {
    color: driverTheme.colors.text.secondary,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default LoadSearch;
