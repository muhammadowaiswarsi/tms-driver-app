import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const logoSource = require('../../../assets/images/fo-icon.png');

interface BrandLogoProps {
  compact?: boolean;
  size?: 'default' | 'large';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, size = 'default' }) => {
  const isLarge = size === 'large' && !compact;

  return (
    <View style={styles.container}>
      <View style={styles.wordmarkRow}>
        <Image
          source={logoSource}
          style={compact ? styles.logoCompact : isLarge ? styles.logoLarge : styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.brandName, compact && styles.brandNameCompact, isLarge && styles.brandNameLarge]} numberOfLines={1}>
          <Text style={styles.brandFreight}>Freight</Text>
          <Text style={styles.brandOperator}>Operator</Text>
        </Text>
      </View>
      {!compact && (
        <Text style={[styles.tagline, isLarge && styles.taglineLarge]}>
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
    width: 48,
    height: 32,
    marginRight: 8,
  },
  logoCompact: {
    width: 36,
    height: 24,
    marginRight: 6,
  },
  logoLarge: {
    width: 72,
    height: 48,
    marginRight: 10,
  },
  brandName: {
    fontSize: 18,
    color: '#0d1e6e',
    letterSpacing: -0.4,
  },
  brandNameCompact: {
    fontSize: 16,
  },
  brandNameLarge: {
    fontSize: 24,
  },
  brandFreight: {
    fontWeight: '700',
  },
  brandOperator: {
    fontWeight: '400',
  },
  tagline: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  taglineLarge: {
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 1,
  },
  taglineBlue: {
    color: '#1da1f2',
  },
  taglineOrange: {
    color: '#f97316',
  },
});

export default BrandLogo;
