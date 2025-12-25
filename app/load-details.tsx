import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Card, Button, Icon } from 'react-native-elements';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DriverLayout from '../src/components/common/DriverLayout';
import { useDriverLoadDecision, useLoadRouting } from '../src/hooks/useLoad';
import { driverTheme } from '../src/theme/driverTheme';

// Type assertion helper for Card component (React Native Elements types don't include children)
const TypedCard = Card as any;

const LoadDetails: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const loadId = params.loadId as string;
  const { data: loadRoutingData } = useLoadRouting(loadId || '');

  const handleBackClick = () => {
    router.back();
  };

  const handleAcceptLoad = () => {
    setConfirmDialog(true);
  };

  const updateLoadDecision = useDriverLoadDecision(loadId || '', {
    onSuccess: () => {
      router.push('/(tabs)/loads');
    },
    onError: () => {
      console.error('Error updating load decision');
      Alert.alert('Error', 'Failed to update load decision');
    },
  });

  const handleConfirmAccept = async () => {
    setIsAccepting(true);
    try {
      await updateLoadDecision.mutateAsync({
        data: { status: 'ACCEPTED' },
      });
    } catch (error) {
      console.error(error);
      setIsAccepting(false);
      setConfirmDialog(false);
    }
  };

  const handleConfirmReject = async () => {
    setIsRejecting(true);
    try {
      await updateLoadDecision.mutateAsync({
        data: { status: 'REJECTED' },
      });
    } catch (error) {
      console.error(error);
      setIsRejecting(false);
      setRejectDialog(false);
    }
  };

  return (
    <DriverLayout title="Load Details" showBackButton onBackClick={handleBackClick}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Map placeholder */}
        <View style={styles.mapContainer}>
          <Text style={styles.mapPlaceholder}>Map View</Text>
        </View>

        {/* Routing Events */}
        {loadRoutingData && (loadRoutingData as any).data && (loadRoutingData as any).data[0] && Array.isArray((loadRoutingData as any).data[0].events) && (
          <View style={styles.eventsContainer}>
            {((loadRoutingData as any).data[0].events as any[]).map((event: any, index: number) => (
              <TypedCard key={index} containerStyle={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventChip}>
                    <Text style={styles.eventChipText}>
                      {event.type.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  {event.createdAt && (
                    <Text style={styles.eventTime}>
                      {new Date(event.createdAt).toLocaleDateString()}
                      {'\n'}
                      {new Date(event.createdAt).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
                <Text style={styles.eventLocation}>
                  {event.location || 'Location not specified'}
                </Text>
              </TypedCard>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Reject"
            onPress={() => setRejectDialog(true)}
            buttonStyle={[styles.actionButton, styles.rejectButton]}
            titleStyle={styles.actionButtonTitle}
          />
          <Button
            title={isAccepting ? 'Accepting...' : 'Accept Load'}
            onPress={handleAcceptLoad}
            disabled={isAccepting}
            buttonStyle={[styles.actionButton, styles.acceptButton]}
            titleStyle={styles.actionButtonTitle}
          />
        </View>
      </ScrollView>

      {/* Accept Confirmation Dialog */}
      {confirmDialog && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.dialogCard}>
            <Icon
              name="warning"
              type="material"
              size={48}
              color={driverTheme.colors.grey[600]}
              containerStyle={styles.dialogIcon}
            />
            <Text style={styles.dialogTitle}>Are you sure you want to accept this load?</Text>
            <View style={styles.dialogButtons}>
              <Button
                title={isAccepting ? 'Accepting...' : 'Accept'}
                onPress={handleConfirmAccept}
                disabled={isAccepting}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.primary.main }]}
                titleStyle={styles.dialogButtonText}
              />
              <Button
                title="Accept with navigation"
                onPress={() => setConfirmDialog(false)}
                disabled={isAccepting}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.grey[400] }]}
                titleStyle={styles.dialogButtonText}
              />
              <Button
                title="Cancel"
                onPress={() => setConfirmDialog(false)}
                disabled={isAccepting}
                buttonStyle={[styles.dialogButton, styles.dialogButtonOutlined]}
                titleStyle={[styles.dialogButtonText, { color: driverTheme.colors.grey[600] }]}
              />
            </View>
          </TypedCard>
        </View>
      )}

      {/* Reject Confirmation Dialog */}
      {rejectDialog && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.dialogCard}>
            <Icon
              name="warning"
              type="material"
              size={48}
              color={driverTheme.colors.error.main}
              containerStyle={styles.dialogIcon}
            />
            <Text style={styles.dialogTitle}>Are you sure you want to reject this load?</Text>
            <View style={styles.dialogButtons}>
              <Button
                title={isRejecting ? 'Rejecting...' : 'Yes, Reject Load'}
                onPress={handleConfirmReject}
                disabled={isRejecting}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.error.main }]}
                titleStyle={styles.dialogButtonText}
              />
              <Button
                title="Cancel"
                onPress={() => setRejectDialog(false)}
                disabled={isRejecting}
                buttonStyle={[styles.dialogButton, styles.dialogButtonOutlined]}
                titleStyle={[styles.dialogButtonText, { color: driverTheme.colors.grey[600] }]}
              />
            </View>
          </TypedCard>
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
  mapContainer: {
    height: 300,
    backgroundColor: driverTheme.colors.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: driverTheme.spacing.md,
  },
  mapPlaceholder: {
    fontSize: 16,
    color: driverTheme.colors.text.secondary,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: driverTheme.spacing.xs,
  },
  eventChip: {
    backgroundColor: driverTheme.colors.grey[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventChipText: {
    fontSize: 8,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
  },
  eventTime: {
    fontSize: 10,
    color: driverTheme.colors.grey[600],
    textAlign: 'right',
  },
  eventLocation: {
    fontSize: 10,
    fontWeight: '600',
    color: driverTheme.colors.grey[600],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: driverTheme.spacing.md,
    padding: driverTheme.spacing.md,
    backgroundColor: driverTheme.colors.background.paper,
    marginTop: driverTheme.spacing.md,
    borderRadius: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: driverTheme.colors.grey[500],
    width: '30%',
  },
  acceptButton: {
    backgroundColor: driverTheme.colors.success.main,
    flex: 1,
  },
  actionButtonTitle: {
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
    alignItems: 'center',
  },
  dialogIcon: {
    marginBottom: driverTheme.spacing.md,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: driverTheme.spacing.lg,
  },
  dialogButtons: {
    width: '100%',
    gap: driverTheme.spacing.sm,
  },
  dialogButton: {
    borderRadius: 8,
  },
  dialogButtonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: driverTheme.colors.grey[400],
  },
  dialogButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoadDetails;

