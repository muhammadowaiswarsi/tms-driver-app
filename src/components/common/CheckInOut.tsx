import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Icon } from "react-native-elements";
import {
  useDriverBreakToggle,
  useDriverShiftStatus,
  useDriverShiftToggle,
} from "../../hooks/useShift";
import { driverTheme } from "../../theme/driverTheme";
import { ShiftStatus } from "../../types/driver.types";

interface CheckInOutProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
}

const CheckInOut: React.FC<CheckInOutProps> = ({
  visible,
  onClose,
  userName,
}) => {
  const { data: shiftStatus, isLoading, refetch } = useDriverShiftStatus();
  const shiftToggle = useDriverShiftToggle({ onSuccess: () => refetch() });
  const breakToggle = useDriverBreakToggle({ onSuccess: () => refetch() });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);

  const isClockedIn = ((shiftStatus as any)?.data as ShiftStatus)?.isCheckedIn || false;
  const isOnBreak = ((shiftStatus as any)?.data as ShiftStatus)?.isOnBreak || false;
  const shiftStartTime = ((shiftStatus as any)?.data as ShiftStatus)?.currentCheckIn
    ? new Date(((shiftStatus as any)?.data as ShiftStatus).currentCheckIn!)
    : null;

  useEffect(() => {
    if (visible) {
      refetch();
    }
  }, [visible, refetch]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isClockedIn && shiftStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor(
          (now.getTime() - shiftStartTime.getTime()) / 1000,
        );
        setElapsedTime(diff);
      }, 1000);
    }
    if (isOnBreak && ((shiftStatus as any)?.data as ShiftStatus)?.currentBreakStart) {
      const breakStart = new Date(((shiftStatus as any)?.data as ShiftStatus).currentBreakStart!);
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - breakStart.getTime()) / 1000);
        setBreakTime(diff);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isClockedIn,
    shiftStartTime,
    isOnBreak,
    ((shiftStatus as any)?.data as ShiftStatus)?.currentBreakStart,
  ]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatDateTime = () => {
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = days[now.getDay()];
    const month = months[now.getMonth()];
    const date = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${day}, ${month} ${date} - ${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
  };

  const handleStartShift = () => {
    shiftToggle.mutate({ action: "in" });
  };

  const handleEndShift = () => {
    Alert.alert("End Shift", "Are you sure you want to end your shift?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Shift",
        onPress: () => {
          shiftToggle.mutate({ action: "out" });
          onClose();
        },
      },
    ]);
  };

  const handlePauseBreak = () => {
    breakToggle.mutate({ action: isOnBreak ? "end" : "start" });
  };

  const displayName = userName?.split(" ")[0] || "User";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Icon name="arrow-back" type="material" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check In/Out</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={driverTheme.colors.primary.main}
            />
          ) : (
            <>
              <Text style={styles.greetingText}>
                {getGreeting()}, {displayName}!
              </Text>

              {/* Date and Time */}
              <Text style={styles.dateTimeText}>{formatDateTime()}</Text>

              {/* Status */}
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isClockedIn
                      ? driverTheme.colors.primary.main
                      : driverTheme.colors.grey[200],
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isClockedIn
                        ? "#4CAF50"
                        : driverTheme.colors.text.secondary,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: isClockedIn
                        ? driverTheme.colors.primary.contrastText
                        : driverTheme.colors.text.primary,
                    },
                  ]}
                >
                  Status: {isClockedIn ? "On Duty" : "Off Duty"}
                </Text>
              </View>

              {!isClockedIn ? (
                // Clocked Out State
                <>
                  <TouchableOpacity
                    style={styles.startShiftButton}
                    onPress={handleStartShift}
                    activeOpacity={0.8}
                  >
                    <View style={styles.startShiftButtonInner}>
                      <Icon
                        name="play-arrow"
                        type="material"
                        color="#fff"
                        size={48}
                      />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.startShiftText}>START SHIFT</Text>
                </>
              ) : (
                // Clocked In State
                <>
                  <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>
                      {formatTime(elapsedTime)}
                    </Text>
                    {isOnBreak && (
                      <Text style={styles.breakTimerText}>
                        Break: {formatTime(breakTime)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.buttonsContainer}>
                    <Button
                      title={isOnBreak ? "END BREAK" : "PAUSE FOR BREAK"}
                      onPress={handlePauseBreak}
                      loading={breakToggle.isPending}
                      disabled={breakToggle.isPending}
                      buttonStyle={[styles.actionButton, styles.pauseButton]}
                      titleStyle={styles.actionButtonTitle}
                    />
                    <Button
                      title="END SHIFT"
                      onPress={handleEndShift}
                      loading={shiftToggle.isPending}
                      disabled={shiftToggle.isPending}
                      buttonStyle={[styles.actionButton, styles.endShiftButton]}
                      titleStyle={styles.actionButtonTitle}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: driverTheme.colors.background.default,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: driverTheme.spacing.md,
    backgroundColor: driverTheme.colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: driverTheme.colors.divider,
  },
  backButton: {
    marginRight: driverTheme.spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: driverTheme.spacing.xl,
    alignItems: "center",
    width: "100%",
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
    marginBottom: driverTheme.spacing.sm,
  },
  dateTimeText: {
    fontSize: 16,
    color: driverTheme.colors.text.secondary,
    marginBottom: driverTheme.spacing.lg,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: driverTheme.spacing.md,
    paddingVertical: driverTheme.spacing.sm,
    borderRadius: 20,
    marginBottom: driverTheme.spacing.xl,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: driverTheme.spacing.sm,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  startShiftButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: driverTheme.colors.primary.main,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: driverTheme.spacing.md,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startShiftButtonInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: driverTheme.colors.primary.dark,
    justifyContent: "center",
    alignItems: "center",
  },
  startShiftText: {
    fontSize: 18,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
    marginBottom: driverTheme.spacing.xl,
  },
  timerContainer: {
    marginBottom: driverTheme.spacing.xl,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
    fontFamily: "monospace",
  },
  breakTimerText: {
    fontSize: 24,
    fontWeight: "500",
    color: driverTheme.colors.text.secondary,
    fontFamily: "monospace",
    marginTop: driverTheme.spacing.sm,
  },
  buttonsContainer: {
    width: "100%",
    paddingHorizontal: 0,
    gap: driverTheme.spacing.sm,
  },
  actionButton: {
    width: "100%",
    borderRadius: 8,
    marginBottom: 0,
  },
  pauseButton: {
    backgroundColor: driverTheme.colors.grey[500],
    borderWidth: 1,
    borderColor: driverTheme.colors.grey[400],
  },
  endShiftButton: {
    backgroundColor: driverTheme.colors.primary.main,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default CheckInOut;
