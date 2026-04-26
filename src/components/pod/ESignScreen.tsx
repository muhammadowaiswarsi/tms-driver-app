import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { SignatureViewRef } from "react-native-signature-canvas";
import { driverTheme } from "../../theme/driverTheme";
import ESignHeader from "./ESignHeader";
import PodSignFormFields from "./PodSignFormFields";
import SignaturePadField from "./SignaturePadField";
import { createDefaultPodEsignValues, type PodEsignFormValues } from "./types";

type FormField = "printName" | "date" | "timeIn" | "timeOut";

type FormErrors = Partial<Record<FormField | "signature", string>>;

type Props = {
  visible: boolean;
  initialValues: PodEsignFormValues;
  onBack: () => void;
  onApply: (values: PodEsignFormValues) => void;
};

const ESignScreen: React.FC<Props> = ({
  visible,
  initialValues,
  onBack,
  onApply,
}) => {
  const signRef = useRef<SignatureViewRef | null>(null);
  const [form, setForm] = useState<PodEsignFormValues>(createDefaultPodEsignValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isApplying, setIsApplying] = useState(false);
  const [padKey, setPadKey] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setForm({ ...initialValues });
    setErrors({});
    setPadKey((k) => k + 1);
  }, [visible, initialValues]);

  const updateField = useCallback(
    (field: FormField, value: string) => {
      setForm((f) => ({ ...f, [field]: value }));
      setErrors((e) => ({ ...e, [field]: undefined, signature: undefined }));
    },
    [],
  );

  const validateForm = useCallback((): string | null => {
    if (!form.printName?.trim()) {
      return "Print name is required.";
    }
    if (!form.date?.trim()) {
      return "Date is required.";
    }
    if (!form.timeIn?.trim()) {
      return "Time in is required.";
    }
    if (!form.timeOut?.trim()) {
      return "Time out is required.";
    }
    return null;
  }, [form.printName, form.date, form.timeIn, form.timeOut]);

  const handleSignatureOK = (signature: string) => {
    setIsApplying(false);
    if (!signature?.trim()) {
      setErrors((e) => ({ ...e, signature: "Please sign in the box." }));
      return;
    }
    const err = validateForm();
    if (err) {
      Alert.alert("Missing info", err);
      return;
    }
    onApply({
      ...form,
      signatureDataUrl: signature,
    });
  };

  const handleSignatureEmpty = () => {
    setIsApplying(false);
    setErrors((e) => ({ ...e, signature: "Please sign in the box." }));
  };

  const handleHeaderApply = () => {
    const err = validateForm();
    if (err) {
      Alert.alert("Missing info", err);
      return;
    }
    setErrors((e) => ({ ...e, signature: undefined }));
    setIsApplying(true);
    requestAnimationFrame(() => {
      signRef.current?.readSignature();
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.root}>
      <ESignHeader
        title="E-Sign Below"
        onBack={onBack}
        onApply={handleHeaderApply}
        applyLoading={isApplying}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <SignaturePadField
          key={padKey}
          ref={signRef}
          dataURL={form.signatureDataUrl || undefined}
          onOK={handleSignatureOK}
          onEmpty={handleSignatureEmpty}
        />
        {errors.signature ? (
          <Text style={styles.sigError}>{errors.signature}</Text>
        ) : null}
        <PodSignFormFields
          values={{
            printName: form.printName,
            date: form.date,
            timeIn: form.timeIn,
            timeOut: form.timeOut,
          }}
          errors={{
            printName: errors.printName,
            date: errors.date,
            timeIn: errors.timeIn,
            timeOut: errors.timeOut,
          }}
          onChange={updateField}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: "94%",
    maxWidth: 480,
    maxHeight: "90%",
    backgroundColor: driverTheme.colors.background.paper,
    borderRadius: 16,
    paddingTop: driverTheme.spacing.md,
    paddingHorizontal: driverTheme.spacing.md,
    paddingBottom: driverTheme.spacing.lg,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: driverTheme.spacing.lg,
  },
  sigError: {
    color: driverTheme.colors.error.main,
    fontSize: 12,
    fontWeight: "600",
    marginTop: -driverTheme.spacing.sm,
    marginBottom: driverTheme.spacing.sm,
  },
});

export default ESignScreen;
