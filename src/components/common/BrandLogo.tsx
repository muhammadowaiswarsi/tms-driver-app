import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { driverTheme } from '../../theme/driverTheme';

const logoSource = require('../../../assets/images/icon.png');

interface BrandLogoProps {
  compact?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false }) => {
  return (
    <View style={styles.container}>
      <View style={styles.wordmarkRow}>
        <Image source={logoSource} style={compact ? styles.logoCompact : styles.logo} resizeMode="contain" />
        <Text style={[styles.brandName, compact && styles.brandNameCompact]}>FreightOperator</Text>
      </View>
      {!compact && (
        <Text style={styles.tagline}>
          <Text style={styles.taglineBlue}>POWERING MOVEMENT. </Text>
          <Text style={styles.taglineOrange}>DELIVERING SUCCESS.</Text>
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  logoCompact: {
    width: 24,
    height: 24,
    marginRight: 6,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: driverTheme.colors.text.primary,
    letterSpacing: 0.2,
  },
  brandNameCompact: {
    fontSize: 16,
  },
  tagline: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  taglineBlue: {
    color: driverTheme.colors.primary.main,
  },
  taglineOrange: {
    color: driverTheme.colors.secondary.main,
  },
});

export default BrandLogo;
