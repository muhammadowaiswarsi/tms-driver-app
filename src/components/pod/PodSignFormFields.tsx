import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, Input } from "react-native-elements";
import { driverTheme } from "../../theme/driverTheme";
import { DatePickerModal, TimePickerModal } from "./PodDateTimeModals";
import {
  formatDateMdYy,
  formatTimeAmPm,
  parseDateMdYy,
  parseTimeAmPmOnDay,
} from "./dateTimeFormat";
import type { PodEsignFormValues } from "./types";

type Field = keyof Pick<
  PodEsignFormValues,
  "printName" | "date" | "timeIn" | "timeOut"
>;

type FieldErrors = Partial<Record<Field, string>>;

type PickerOpen = "date" | "timeIn" | "timeOut" | null;

type Props = {
  values: Pick<PodEsignFormValues, Field>;
  errors: FieldErrors;
  onChange: (field: Field, value: string) => void;
};

const PodSignFormFields: React.FC<Props> = ({ values, errors, onChange }) => {
  const [open, setOpen] = useState<PickerOpen>(null);

  const dayForTimes = useMemo(
    () => parseDateMdYy(values.date),
    [values.date],
  );

  const timeInInitial = useMemo(
    () => parseTimeAmPmOnDay(values.timeIn, dayForTimes),
    [values.timeIn, dayForTimes],
  );

  const timeOutInitial = useMemo(
    () => parseTimeAmPmOnDay(values.timeOut, dayForTimes),
    [values.timeOut, dayForTimes],
  );

  return (
    <View>
      <Input
        label="Print Name of Signature"
        placeholder="Print Name of Signature"
        value={values.printName}
        onChangeText={(t) => onChange("printName", t)}
        inputContainerStyle={styles.input}
        inputStyle={styles.inputText}
        containerStyle={styles.inputWrapper}
        errorMessage={errors.printName}
      />

      <Pressable
        onPress={() => setOpen("date")}
        accessibilityRole="button"
        accessibilityLabel="Open date picker"
      >
        <View pointerEvents="none">
          <Input
            label="Date"
            placeholder="MM/DD/YY"
            value={values.date}
            editable={false}
            onChangeText={() => undefined}
            inputContainerStyle={styles.input}
            inputStyle={styles.inputText}
            containerStyle={styles.inputWrapper}
            errorMessage={errors.date}
            rightIcon={
              <Icon
                name="event"
                type="material"
                color={driverTheme.colors.text.secondary}
                size={20}
              />
            }
          />
        </View>
      </Pressable>

      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Pressable
            onPress={() => setOpen("timeIn")}
            accessibilityRole="button"
            accessibilityLabel="Open time in picker"
          >
            <View pointerEvents="none">
              <Input
                label="Time In"
                placeholder="4:15 PM"
                value={values.timeIn}
                editable={false}
                onChangeText={() => undefined}
                inputContainerStyle={styles.input}
                inputStyle={styles.inputText}
                containerStyle={styles.inputWrapper}
                errorMessage={errors.timeIn}
                rightIcon={
                  <Icon
                    name="schedule"
                    type="material"
                    color={driverTheme.colors.text.secondary}
                    size={20}
                  />
                }
              />
            </View>
          </Pressable>
        </View>
        <View style={styles.timeCol}>
          <Pressable
            onPress={() => setOpen("timeOut")}
            accessibilityRole="button"
            accessibilityLabel="Open time out picker"
          >
            <View pointerEvents="none">
              <Input
                label="Time Out"
                placeholder="4:27 PM"
                value={values.timeOut}
                editable={false}
                onChangeText={() => undefined}
                inputContainerStyle={styles.input}
                inputStyle={styles.inputText}
                containerStyle={styles.inputWrapper}
                errorMessage={errors.timeOut}
                rightIcon={
                  <Icon
                    name="schedule"
                    type="material"
                    color={driverTheme.colors.text.secondary}
                    size={20}
                  />
                }
              />
            </View>
          </Pressable>
        </View>
      </View>

      <DatePickerModal
        visible={open === "date"}
        initial={parseDateMdYy(values.date)}
        onClose={() => setOpen(null)}
        onConfirm={(d) => onChange("date", formatDateMdYy(d))}
      />

      <TimePickerModal
        visible={open === "timeIn"}
        dayRef={dayForTimes}
        initialTime={timeInInitial}
        onClose={() => setOpen(null)}
        onConfirm={(d) => onChange("timeIn", formatTimeAmPm(d))}
      />

      <TimePickerModal
        visible={open === "timeOut"}
        dayRef={dayForTimes}
        initialTime={timeOutInitial}
        onClose={() => setOpen(null)}
        onConfirm={(d) => onChange("timeOut", formatTimeAmPm(d))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
    borderRadius: 10,
    paddingHorizontal: driverTheme.spacing.sm,
    minHeight: 48,
  },
  inputText: {
    fontSize: 16,
  },
  timeRow: {
    flexDirection: "row",
    gap: driverTheme.spacing.sm,
  },
  timeCol: {
    flex: 1,
  },
});

export default PodSignFormFields;
