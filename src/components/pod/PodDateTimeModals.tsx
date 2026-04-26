import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { driverTheme } from "../../theme/driverTheme";
import {
  formatDateMdYy,
  formatTimeAmPm,
  parseDateMdYy,
  parseTimeAmPmOnDay,
} from "./dateTimeFormat";

const ROW_H = 40;
const VISIBLE = 5;
const COL_H = ROW_H * VISIBLE;

const YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 21 }, (_, i) => y - 5 + i);
})();

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function daysInMonth(month1to12: number, year: number) {
  return new Date(year, month1to12, 0).getDate();
}

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const HOURS12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MERIDIEM = ["AM", "PM"] as const;

type ColProps = {
  title: string;
  children: React.ReactNode;
};

const Column: React.FC<ColProps> = ({ title, children }) => (
  <View style={styles.col}>
    <Text style={styles.colTitle}>{title}</Text>
    <View style={styles.colScrollShell}>
      {children}
    </View>
  </View>
);

type DatePickerModalProps = {
  visible: boolean;
  initial: Date;
  onClose: () => void;
  onConfirm: (d: Date) => void;
};

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  initial,
  onClose,
  onConfirm,
}) => {
  const [m, setM] = useState(initial.getMonth() + 1);
  const [d, setD] = useState(initial.getDate());
  const [y, setY] = useState(initial.getFullYear());

  useEffect(() => {
    if (!visible) {
      return;
    }
    const n = new Date(initial);
    setM(n.getMonth() + 1);
    setD(n.getDate());
    setY(n.getFullYear());
  }, [visible, initial]);

  const maxDay = useMemo(() => daysInMonth(m, y), [m, y]);

  useEffect(() => {
    if (d > maxDay) {
      setD(maxDay);
    }
  }, [m, y, d, maxDay]);

  const dayItems = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay],
  );

  const onDone = () => {
    onConfirm(new Date(y, m - 1, d, 12, 0, 0, 0));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select date</Text>
          <View style={styles.dateRow}>
            <Column title="Month">
              <ScrollView
                style={{ maxHeight: COL_H }}
                showsVerticalScrollIndicator
              >
                {MONTHS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.row, m === n && styles.rowOn]}
                    onPress={() => setM(n)}
                  >
                    <Text
                      style={[styles.rowText, m === n && styles.rowTextOn]}
                    >
                      {String(n).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Column>
            <Column title="Day">
              <ScrollView
                style={{ maxHeight: COL_H }}
                showsVerticalScrollIndicator
              >
                {dayItems.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.row, d === n && styles.rowOn]}
                    onPress={() => setD(n)}
                  >
                    <Text
                      style={[styles.rowText, d === n && styles.rowTextOn]}
                    >
                      {String(n).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Column>
            <Column title="Year">
              <ScrollView
                style={{ maxHeight: COL_H }}
                showsVerticalScrollIndicator
              >
                {YEARS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.row, y === n && styles.rowOn]}
                    onPress={() => setY(n)}
                  >
                    <Text
                      style={[styles.rowText, y === n && styles.rowTextOn]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Column>
          </View>
          <View style={styles.btnRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.btnPrimaryText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

type TimePickerModalProps = {
  visible: boolean;
  dayRef: Date;
  initialTime: Date;
  onClose: () => void;
  onConfirm: (d: Date) => void;
};

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  dayRef,
  initialTime,
  onClose,
  onConfirm,
}) => {
  const [hour12, setHour12] = useState(() => {
    const t = new Date(initialTime);
    let h = t.getHours() % 12;
    if (h === 0) {
      h = 12;
    }
    return h;
  });
  const [min, setMin] = useState(() => new Date(initialTime).getMinutes());
  const [ap, setAp] = useState<"AM" | "PM">(() =>
    new Date(initialTime).getHours() >= 12 ? "PM" : "AM",
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    const t = new Date(initialTime);
    let h = t.getHours() % 12;
    if (h === 0) {
      h = 12;
    }
    setHour12(h);
    setMin(t.getMinutes());
    setAp(t.getHours() >= 12 ? "PM" : "AM");
  }, [visible, initialTime]);

  const onDone = () => {
    const out = new Date(dayRef);
    const h24 =
      ap === "AM" ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;
    out.setHours(h24, min, 0, 0);
    onConfirm(out);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select time</Text>
          <View style={styles.timeRow}>
            <Column title="Hour">
              <ScrollView
                style={{ maxHeight: COL_H }}
                showsVerticalScrollIndicator
              >
                {HOURS12.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.row, hour12 === n && styles.rowOn]}
                    onPress={() => setHour12(n)}
                  >
                    <Text
                      style={[
                        styles.rowText,
                        hour12 === n && styles.rowTextOn,
                      ]}
                    >
                      {String(n).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Column>
            <Column title="Min">
              <ScrollView
                style={{ maxHeight: COL_H }}
                showsVerticalScrollIndicator
              >
                {MINUTES.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.row, min === n && styles.rowOn]}
                    onPress={() => setMin(n)}
                  >
                    <Text
                      style={[styles.rowText, min === n && styles.rowTextOn]}
                    >
                      {String(n).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Column>
            <Column title="AM/PM">
              <ScrollView
                style={{ maxHeight: COL_H }}
                showsVerticalScrollIndicator
              >
                {MERIDIEM.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.row, ap === m && styles.rowOn]}
                    onPress={() => setAp(m)}
                  >
                    <Text style={[styles.rowText, ap === m && styles.rowTextOn]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Column>
          </View>
          <View style={styles.btnRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.btnPrimaryText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: driverTheme.colors.background.paper,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: driverTheme.spacing.md,
    paddingTop: driverTheme.spacing.md,
    paddingBottom: driverTheme.spacing.lg,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: driverTheme.spacing.md,
    color: driverTheme.colors.text.primary,
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeRow: {
    flexDirection: "row",
    gap: 8,
  },
  col: {
    flex: 1,
  },
  colTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: driverTheme.colors.text.secondary,
    marginBottom: 4,
    textAlign: "center",
  },
  colScrollShell: {
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    minHeight: ROW_H,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  rowOn: {
    backgroundColor: driverTheme.colors.primary.light,
  },
  rowText: {
    fontSize: 16,
    color: driverTheme.colors.text.primary,
  },
  rowTextOn: {
    fontWeight: "700",
    color: driverTheme.colors.primary.dark,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: driverTheme.spacing.lg,
  },
  btnGhost: {
    padding: driverTheme.spacing.sm,
  },
  btnGhostText: {
    fontSize: 16,
    color: driverTheme.colors.text.secondary,
  },
  btnPrimary: {
    padding: driverTheme.spacing.sm,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: driverTheme.colors.primary.main,
  },
});
