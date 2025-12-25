import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, Button, Icon, Input } from 'react-native-elements';
import { useRouter } from 'expo-router';
import DriverLayout from '../../src/components/common/DriverLayout';
import {
  useDriverActiveLoads,
  useDriverAssignedLoads,
  useDriverLoadLocationStatus,
  useDriverStartLoadRoutingMove,
  useUpdateDriverLoadReturnInfo,
} from '../../src/hooks/useLoad';
import { driverTheme } from '../../src/theme/driverTheme';
import { Event } from '../../src/types/driver.types';

// Type assertion helper for Card component (React Native Elements types don't include children)
const TypedCard = Card as any;

const LoadSearch: React.FC = () => {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [startLoadDialog, setStartLoadDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [actionType, setActionType] = useState<'departed' | 'arrived' | 'complete'>('arrived');
  const [chassisNumber, setChassisNumber] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);

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
    driverActiveLoads?.data?.id || '',
    {
      onSuccess: () => {
        refetchActive();
        Alert.alert('Success', 'Load routing move started successfully');
        setStartLoadDialog(false);
      },
      onError: (error: any) => {
        Alert.alert('Error', 'Error starting load routing move');
        console.error(error);
      },
    }
  );

  const updateEventStatus = useDriverLoadLocationStatus(driverActiveLoads?.data?.id, {
    onSuccess: () => {
      refetchActive();
      setConfirmDialog(false);
      setIsUpdating(false);
      Alert.alert('Success', 'Status updated successfully');
    },
    onError: (error: any) => {
      setIsUpdating(false);
      Alert.alert('Error', 'Error updating status');
      console.error(error);
    },
  });

  const updateLoadStatus = useUpdateDriverLoadReturnInfo(driverActiveLoads?.data?.id || '', {
    onSuccess: () => {
      refetchActive();
      setCompleteDialog(false);
      setDocumentDialog(false);
      setIsCompleting(false);
      Alert.alert('Success', 'Load completed successfully');
      setTimeout(() => {
        setCurrentTab(1);
      }, 1000);
    },
    onError: (error: any) => {
      setIsCompleting(false);
      Alert.alert('Error', 'Error completing load');
      console.error(error);
    },
  });

  const getAllEvents = () => {
    if (!driverActiveLoads?.data?.routing?.[0]?.events) return [];
    return driverActiveLoads.data.routing[0].events.sort(
      (a: Event, b: Event) => a.sequence - b.sequence
    );
  };

  const getCurrentEventIndex = () => {
    const events = getAllEvents();
    const currentIndex = events.findIndex(
      (event: Event) => event.status === 'PENDING' || event.status === 'ARRIVED'
    );
    return currentIndex !== -1 ? currentIndex : events.length - 1;
  };

  const getEventButtonStates = (event: Event, eventIndex: number) => {
    const currentEventIndex = getCurrentEventIndex();
    const isCurrentEvent = eventIndex === currentEventIndex;
    const isCompleteType = (event.type || '').toUpperCase() === 'COMPLETED';
    const showCompleted = isCompleteType;
    const completedEnabled = isCurrentEvent && isCompleteType;
    const arrivedEnabled = isCurrentEvent && event.status === 'PENDING';
    const departedEnabled = isCurrentEvent && event.status === 'ARRIVED';

    if (isCurrentEvent) {
      return {
        departedEnabled,
        arrivedEnabled,
        showCompleted,
        completedEnabled,
      };
    }
    return {
      departedEnabled: false,
      arrivedEnabled: false,
      showCompleted,
      completedEnabled: false,
    };
  };

  const handleEventAction = (
    eventId: string,
    action: 'departed' | 'arrived' | 'complete'
  ) => {
    setSelectedEventId(eventId);
    setActionType(action);

    if (action === 'complete') {
      setDocumentDialog(true);
    } else {
      setConfirmDialog(true);
    }
  };

  const handleConfirmEventUpdate = async () => {
    setIsUpdating(true);
    try {
      const status = actionType === 'departed' ? 'DEPARTED' : 'ARRIVED';
      await updateEventStatus.mutateAsync({
        data: {
          eventId: selectedEventId,
          status,
        },
      });
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

  const requiredDocuments = [
    {
      id: '1',
      name: 'Proof of Delivery',
      type: 'proofOfDelivery',
      required: true,
      uploaded: false,
      uploadData: null,
    },
    {
      id: '2',
      name: 'TIR Out',
      type: 'tirOut',
      required: true,
      uploaded: false,
      uploadData: null,
    },
    {
      id: '3',
      name: 'TIR In',
      type: 'tirIn',
      required: true,
      uploaded: false,
      uploadData: null,
    },
  ];

  useEffect(() => {
    if (driverActiveLoads?.data) {
      setDocuments(requiredDocuments.map((doc) => ({ ...doc })));
      setChassisNumber(driverActiveLoads.data.chassis?.chassisNumber || '');
      setContainerNumber(driverActiveLoads.data.containerNumber || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverActiveLoads]);

  useEffect(() => {
    refetchActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      pathname: '/load-details',
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
    } catch (error) {
      console.error('Error completing load:', error);
    }
  };

  const renderActiveTab = () => {
    if (!driverActiveLoads?.data) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="help" type="material" size={48} color={driverTheme.colors.text.secondary} />
          <Text style={styles.emptyTitle}>No Active Load</Text>
          <Text style={styles.emptySubtitle}>Check upcoming loads to get started</Text>
        </View>
      );
    }

    const events = getAllEvents();
    const currentEventIndex = getCurrentEventIndex();

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Map placeholder */}
        <View style={styles.mapContainer}>
          <Text style={styles.mapPlaceholder}>Map View</Text>
        </View>

        {/* Events List */}
        <View style={styles.eventsContainer}>
          {driverActiveLoads?.data?.status === 'PENDING' ? (
            <TypedCard containerStyle={styles.loadCard}>
              <View style={styles.loadInfo}>
                <View style={styles.loadHeader}>
                  <Text style={styles.loadNumber}>
                    Load Number: {driverActiveLoads?.data?.loadNumber || '--'}
                  </Text>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {driverActiveLoads?.data?.loadType?.toUpperCase() || '--'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.loadDetail}>
                  Container #: {driverActiveLoads?.data?.containerNumber || '--'}
                </Text>
                <Text style={styles.loadDetail}>
                  Chassis #: {driverActiveLoads?.data?.chassis?.chassisNumber || '--'}
                </Text>
                <Text style={styles.loadDetail}>
                  Route Type:{' '}
                  {driverActiveLoads?.data?.route?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                </Text>
                <Button
                  title="Start Load"
                  onPress={handleStartLoad}
                  buttonStyle={[styles.startButton, { backgroundColor: driverTheme.colors.success.dark }]}
                  titleStyle={styles.buttonTitle}
                />
              </View>
            </TypedCard>
          ) : (
            events
              .filter((event: Event, index: number) => {
                return event.status !== 'DEPARTED' || index === events.length - 1;
              })
              .map((event: Event, eventIndex: number) => {
                const originalEventIndex = events.findIndex((e: Event) => e.id === event.id);
                const buttonStates = getEventButtonStates(event, originalEventIndex);
                const isCurrentEvent = originalEventIndex === currentEventIndex;

                return (
                  <TypedCard
                    key={event.id}
                    containerStyle={[
                      styles.eventCard,
                      { backgroundColor: isCurrentEvent ? '#E3F2FD' : '#F5F5F5' },
                    ]}
                  >
                    <View style={styles.eventHeader}>
                      <View style={[styles.eventChip, { backgroundColor: isCurrentEvent ? '#377cf6' : '#a3a3a3' }]}>
                        <Text style={styles.eventChipText}>
                          {event.type.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </View>
                      {event.created && (
                        <Text style={styles.eventTime}>
                          {new Date(event.arrivedAt || '').toLocaleDateString()}
                          {'\n'}
                          {new Date(event.arrivedAt || '').toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.eventLocation}>{event.location || 'Location not specified'}</Text>
                    <View style={styles.eventButtons}>
                      {!buttonStates.showCompleted && (
                        <>
                          <Button
                            title="Arrived"
                            onPress={() => handleEventAction(event.id, 'arrived')}
                            disabled={isUpdating || !buttonStates.arrivedEnabled}
                            buttonStyle={[
                              styles.eventButton,
                              {
                                backgroundColor: buttonStates.arrivedEnabled
                                  ? driverTheme.colors.success.dark
                                  : driverTheme.colors.grey[300],
                              },
                            ]}
                            titleStyle={[
                              styles.eventButtonTitle,
                              {
                                color: buttonStates.arrivedEnabled
                                  ? driverTheme.colors.success.contrastText
                                  : driverTheme.colors.grey[500],
                              },
                            ]}
                          />
                          <Button
                            title="Departed"
                            onPress={() => handleEventAction(event.id, 'departed')}
                            disabled={isUpdating || !buttonStates.departedEnabled}
                            buttonStyle={[
                              styles.eventButton,
                              {
                                backgroundColor: buttonStates.departedEnabled
                                  ? driverTheme.colors.success.dark
                                  : driverTheme.colors.grey[300],
                              },
                            ]}
                            titleStyle={[
                              styles.eventButtonTitle,
                              {
                                color: buttonStates.departedEnabled
                                  ? driverTheme.colors.success.contrastText
                                  : driverTheme.colors.grey[500],
                              },
                            ]}
                          />
                        </>
                      )}
                      {buttonStates.showCompleted && (
                        <Button
                          title="Complete"
                          onPress={() => handleEventAction(event.id, 'complete')}
                          disabled={isUpdating || !buttonStates.completedEnabled}
                          buttonStyle={[
                            styles.eventButton,
                            styles.eventButtonFull,
                            {
                              backgroundColor: buttonStates.completedEnabled
                                ? driverTheme.colors.success.dark
                                : driverTheme.colors.grey[300],
                            },
                          ]}
                          titleStyle={[
                            styles.eventButtonTitle,
                            {
                              color: buttonStates.completedEnabled
                                ? driverTheme.colors.success.contrastText
                                : driverTheme.colors.grey[500],
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
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.upcomingContent}>
      {!driverUpcomingLoads?.data || driverUpcomingLoads?.data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="local-shipping" type="material" size={80} color={driverTheme.colors.grey[400]} />
          <Text style={styles.emptyTitle}>No Upcoming Loads</Text>
          <Text style={styles.emptySubtitle}>
            You don&apos;t have any upcoming loads at the moment. New loads will appear here when they become
            available.
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
                      load.driverDecision === 'PENDING'
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
                        load.driverDecision === 'PENDING'
                          ? driverTheme.colors.primary.contrastText
                          : driverTheme.colors.text.primary,
                    },
                  ]}
                >
                  {load.driverDecision === 'PENDING' ? 'NEW' : load.driverDecision}
                </Text>
              </View>
            </View>
            <View style={styles.upcomingDetails}>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Container</Text>
                <Text style={styles.upcomingDetailValue}>{load.containerNumber || 'N/A'}</Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Route Type</Text>
                <Text style={styles.upcomingDetailValue}>
                  {load.route?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                </Text>
              </View>
              <View style={styles.upcomingDetailRow}>
                <Text style={styles.upcomingDetailLabel}>Load Type</Text>
                <Text style={styles.upcomingDetailValue}>{load.loadType?.toUpperCase() || 'N/A'}</Text>
              </View>
            </View>
            <Button
              title="Show Details"
              onPress={() => handleShowDetails(load)}
              buttonStyle={[styles.detailsButton, { backgroundColor: driverTheme.colors.primary.main }]}
              titleStyle={styles.buttonTitle}
            />
          </TypedCard>
        ))
      )}
    </ScrollView>
  );

  const headerTitle = driverActiveLoads?.data?.loadNumber
    ? `Load -- ${driverActiveLoads.data.loadNumber}`
    : 'Loads';

  return (
    <DriverLayout title={headerTitle} currentTab="loads">
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, currentTab === 0 && styles.activeTab]}
            onPress={() => handleTabChange(0)}
          >
            <Text style={[styles.tabText, currentTab === 0 && styles.activeTabText]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentTab === 1 && styles.activeTab]}
            onPress={() => handleTabChange(1)}
          >
            <Text style={[styles.tabText, currentTab === 1 && styles.activeTabText]}>Upcoming</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {isLoadingActive || isLoadingUpcoming ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={driverTheme.colors.primary.main} />
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
              {actionType === 'departed'
                ? 'Confirm mark as departed?'
                : 'Confirm update the status to arrival?'}
            </Text>
            <View style={styles.dialogButtons}>
              <Button
                title={isUpdating ? 'Updating...' : 'Confirm'}
                onPress={handleConfirmEventUpdate}
                disabled={isUpdating}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.primary.main }]}
                titleStyle={styles.buttonTitle}
              />
              <Button
                title="Cancel"
                onPress={() => setConfirmDialog(false)}
                disabled={isUpdating}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.grey[200] }]}
                titleStyle={[styles.buttonTitle, { color: driverTheme.colors.grey[600] }]}
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
            <Text style={styles.dialogMessage}>Are you ready to start this load?</Text>
            <View style={styles.dialogButtons}>
              <Button
                title="Start Load"
                onPress={handleConfirmStartLoad}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.primary.main }]}
                titleStyle={styles.buttonTitle}
              />
              <Button
                title="Cancel"
                onPress={() => setStartLoadDialog(false)}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.grey[200] }]}
                titleStyle={[styles.buttonTitle, { color: driverTheme.colors.grey[600] }]}
              />
            </View>
          </TypedCard>
        </View>
      )}

      {/* Document Upload Dialog */}
      {documentDialog && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.documentDialogCard}>
            <Text style={styles.dialogTitle}>Complete Load</Text>
            
            {/* Chassis Number */}
            <View style={styles.documentField}>
              <Text style={styles.documentFieldLabel}>Chassis #</Text>
              <View style={styles.selectContainer}>
                {/* For now, using a simple text input - you can replace with a proper picker */}
                <Text style={styles.selectText}>{chassisNumber || 'Select Chassis'}</Text>
              </View>
            </View>

            {/* Container Number */}
            <View style={styles.documentField}>
              <Text style={styles.documentFieldLabel}>Container #</Text>
              <Input
                placeholder="Container number"
                value={containerNumber}
                onChangeText={setContainerNumber}
                inputContainerStyle={styles.documentInput}
              />
            </View>

            {/* Required Documents */}
            <Text style={styles.documentSectionTitle}>Required Documents</Text>
            <ScrollView style={styles.documentsList} nestedScrollEnabled>
              {documents.map((doc) => (
                <TypedCard key={doc.id} containerStyle={[
                  styles.documentItem,
                  {
                    borderColor: doc.uploaded ? driverTheme.colors.success.main : driverTheme.colors.error.main,
                    backgroundColor: doc.uploaded ? '#E8F5E9' : '#FFEBEE',
                  }
                ]}>
                  <View style={styles.documentItemContent}>
                    <View style={styles.documentItemLeft}>
                      <Icon
                        name={doc.uploaded ? 'check-circle' : 'description'}
                        type="material"
                        color={doc.uploaded ? driverTheme.colors.success.main : driverTheme.colors.error.main}
                        size={20}
                      />
                      <Text style={styles.documentItemName}>{doc.name}</Text>
                    </View>
                    {doc.required && (
                      <View style={[styles.requiredChip, { backgroundColor: driverTheme.colors.error.main }]}>
                        <Text style={styles.requiredChipText}>Required</Text>
                      </View>
                    )}
                  </View>
                  {!doc.uploaded && (
                    <Button
                      title="Upload"
                      onPress={() => {
                        // File upload logic - you can integrate expo-document-picker or expo-image-picker here
                        Alert.alert('Info', 'File upload functionality - integrate expo-document-picker');
                      }}
                      buttonStyle={[styles.uploadButton, { backgroundColor: driverTheme.colors.primary.main }]}
                      titleStyle={styles.uploadButtonTitle}
                      icon={<Icon name="cloud-upload" type="material" color="#fff" size={16} />}
                    />
                  )}
                  {doc.uploaded && (
                    <Text style={styles.uploadedText}>✓ Uploaded successfully</Text>
                  )}
                </TypedCard>
              ))}
            </ScrollView>

            {!allRequiredDocsUploaded && (
              <View style={styles.warningContainer}>
                <Icon name="warning" type="material" color={driverTheme.colors.warning.main} size={20} />
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
                icon={<Icon name="assignment" type="material" color="#fff" size={16} />}
              />
            </View>
          </TypedCard>
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
              <Text style={styles.completeValue}>{chassisNumber || 'N/A'}</Text>
            </View>
            <View style={styles.completeInfo}>
              <Text style={styles.completeLabel}>Container #</Text>
              <Text style={styles.completeValue}>{containerNumber || 'N/A'}</Text>
            </View>
            <Text style={styles.documentsTitle}>Documents</Text>
            {documents
              .filter((doc) => doc.uploaded)
              .map((doc) => (
                <View key={doc.id} style={styles.completeDocumentItem}>
                  <Icon name="check-circle" type="material" size={16} color={driverTheme.colors.success.main} />
                  <Text style={styles.completeDocumentName}>{doc.name}</Text>
                </View>
              ))}
            <View style={styles.dialogButtons}>
              <Button
                title={isCompleting ? 'Completing Load...' : 'Confirm Complete'}
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
    flexDirection: 'row',
    backgroundColor: '#cbcbcb',
    borderRadius: 8,
    margin: driverTheme.spacing.sm,
    marginTop: driverTheme.spacing.md,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: driverTheme.colors.background.paper,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#e61919',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsContainer: {
    padding: driverTheme.spacing.sm,
    paddingTop: driverTheme.spacing.md,
  },
  loadCard: {
    borderRadius: 12,
    marginBottom: driverTheme.spacing.sm,
    backgroundColor: '#E3F2FD',
  },
  loadInfo: {
    padding: driverTheme.spacing.sm,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: driverTheme.spacing.sm,
  },
  loadNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: driverTheme.colors.text.primary,
  },
  chip: {
    backgroundColor: '#377cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  chipText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  loadDetail: {
    fontSize: 12,
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
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: driverTheme.spacing.xs,
  },
  eventChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventChipText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 10,
    color: driverTheme.colors.grey[600],
    textAlign: 'right',
  },
  eventLocation: {
    fontSize: 10,
    color: driverTheme.colors.grey[600],
    marginBottom: driverTheme.spacing.sm,
  },
  eventButtons: {
    flexDirection: 'row',
    gap: driverTheme.spacing.sm,
  },
  eventButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
  },
  eventButtonFull: {
    flex: 1,
  },
  eventButtonTitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: driverTheme.spacing.xl,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: driverTheme.colors.text.secondary,
    marginTop: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: driverTheme.colors.text.disabled,
    textAlign: 'center',
    maxWidth: 300,
  },
  upcomingCard: {
    borderRadius: 12,
    marginBottom: driverTheme.spacing.md,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: driverTheme.spacing.md,
  },
  upcomingLoadNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: driverTheme.colors.primary.main,
  },
  upcomingChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upcomingChipText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 12,
    color: driverTheme.colors.text.secondary,
    marginBottom: 4,
  },
  upcomingDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
  },
  detailsButton: {
    borderRadius: 8,
  },
  buttonTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialogCard: {
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: driverTheme.spacing.md,
  },
  dialogMessage: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
    textAlign: 'center',
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  documentField: {
    marginBottom: driverTheme.spacing.md,
  },
  documentFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: driverTheme.spacing.xs,
    color: driverTheme.colors.text.primary,
  },
  selectContainer: {
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 8,
    padding: driverTheme.spacing.sm,
    backgroundColor: driverTheme.colors.background.paper,
  },
  selectText: {
    fontSize: 14,
    color: driverTheme.colors.text.primary,
  },
  documentInput: {
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 8,
    paddingHorizontal: driverTheme.spacing.sm,
  },
  documentSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: driverTheme.spacing.md,
    marginTop: driverTheme.spacing.sm,
    color: driverTheme.colors.text.primary,
  },
  documentsList: {
    maxHeight: 300,
    marginBottom: driverTheme.spacing.md,
  },
  documentItem: {
    borderRadius: 8,
    marginBottom: driverTheme.spacing.sm,
    borderWidth: 1,
    padding: driverTheme.spacing.sm,
  },
  documentItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: driverTheme.spacing.xs,
  },
  documentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: driverTheme.spacing.sm,
    color: driverTheme.colors.text.primary,
  },
  requiredChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  requiredChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  uploadButton: {
    borderRadius: 8,
    paddingVertical: 8,
  },
  uploadButtonTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadedText: {
    fontSize: 12,
    color: driverTheme.colors.success.main,
    marginTop: driverTheme.spacing.xs,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: driverTheme.spacing.sm,
    borderRadius: 8,
    marginBottom: driverTheme.spacing.md,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: driverTheme.spacing.sm,
  },
  completeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
  },
  completeValue: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
    color: driverTheme.colors.text.primary,
  },
  completeDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: driverTheme.spacing.xs,
  },
  completeDocumentName: {
    fontSize: 14,
    marginLeft: driverTheme.spacing.xs,
    color: driverTheme.colors.text.primary,
  },
});

export default LoadSearch;
