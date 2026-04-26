import React, { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "react-native-elements";
import SignatureCanvas, {
  SignatureViewRef,
} from "react-native-signature-canvas";
import { driverTheme } from "../../theme/driverTheme";

const WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
  .m-signature-pad--body { border: 1px solid #e0e0e0; border-radius: 8px; background: #f5f5f5; }
  .m-signature-pad--footer { display: none; }
  body, html { margin: 0; padding: 0; }
`;

type Props = {
  onOK: (signature: string) => void;
  onEmpty: () => void;
  dataURL?: string;
  descriptionText?: string;
};

const SignaturePadField = forwardRef<SignatureViewRef, Props>(
  function SignaturePadField(
    { onOK, onEmpty, dataURL, descriptionText = "Sign anywhere" },
    ref,
  ) {
    return (
      <View style={styles.wrap}>
        <View style={styles.toolbar}>
          <Text
            style={styles.clearText}
            onPress={() => {
              if (ref && typeof ref === "object" && ref.current) {
                ref.current.clearSignature();
              }
            }}
          >
            Clear
          </Text>
          <Icon
            name="insert-drive-file"
            type="material"
            color={driverTheme.colors.primary.main}
            size={20}
          />
        </View>
        <View style={styles.canvasOuter}>
          <SignatureCanvas
            ref={ref}
            dataURL={dataURL}
            onOK={onOK}
            onEmpty={onEmpty}
            onClear={onEmpty}
            descriptionText={descriptionText}
            clearText="Clear"
            confirmText="Save"
            webStyle={WEB_STYLE}
            style={styles.canvas}
            webviewContainerStyle={styles.webview}
            backgroundColor="transparent"
            penColor="#000"
            minWidth={1}
            maxWidth={3}
            imageType="image/png"
            trimWhitespace
            nestedScrollEnabled
          />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: driverTheme.spacing.md,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: driverTheme.spacing.xs,
  },
  clearText: {
    color: "#c62828",
    fontSize: 15,
    fontWeight: "600",
  },
  canvasOuter: {
    height: 220,
    borderRadius: 8,
    overflow: "hidden",
  },
  canvas: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default SignaturePadField;
