import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "react-native-elements";
import { driverTheme } from "../../theme/driverTheme";

type Props = {
  title: string;
  onBack: () => void;
  onApply: () => void;
  applyDisabled?: boolean;
  applyLoading?: boolean;
};

const ESignHeader: React.FC<Props> = ({
  title,
  onBack,
  onApply,
  applyDisabled = false,
  applyLoading = false,
}) => (
  <View style={styles.row}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.side}
      hitSlop={12}
      accessibilityLabel="Back"
    >
      <Icon
        name="arrow-back"
        type="material"
        color={driverTheme.colors.text.primary}
        size={22}
      />
    </TouchableOpacity>
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
    <View style={[styles.side, styles.sideRight]}>
      {applyLoading ? (
        <ActivityIndicator
          size="small"
          color={driverTheme.colors.primary.main}
        />
      ) : (
        <TouchableOpacity
          onPress={onApply}
          disabled={applyDisabled}
          hitSlop={12}
          accessibilityLabel="Apply signature"
        >
          <Text
            style={[
              styles.apply,
              (applyDisabled || applyLoading) && styles.applyDisabled,
            ]}
          >
            Apply
          </Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: driverTheme.spacing.sm,
  },
  side: {
    minWidth: 44,
    justifyContent: "center",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: driverTheme.colors.text.primary,
  },
  apply: {
    fontSize: 18,
    fontWeight: "700",
    color: driverTheme.colors.primary.main,
  },
  applyDisabled: {
    color: driverTheme.colors.text.disabled,
  },
});

export default ESignHeader;
