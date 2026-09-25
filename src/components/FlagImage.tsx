import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getCountryFlagUrl } from '../data/countries';
import { IOSColors } from '../utils/colors';

interface FlagImageProps {
  countryCode: string;
  fallbackEmoji?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  showShadow?: boolean;
}

export const FlagImage: React.FC<FlagImageProps> = ({
  countryCode,
  fallbackEmoji,
  width = 160,
  height = 105,
  borderRadius = 16,
  showShadow = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  const flagUrl = getCountryFlagUrl(countryCode);

  return (
    <View
      style={[
        styles.container,
        { width, height, borderRadius },
        showShadow && IOSColors.cardShadow,
      ]}
    >
      {!hasError ? (
        <>
          <Image
            source={{ uri: flagUrl }}
            style={[styles.image, { borderRadius }]}
            resizeMode="cover"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setHasError(true);
              setLoading(false);
            }}
          />
          {loading && (
            <View style={[styles.loaderContainer, { borderRadius }]}>
              <ActivityIndicator size="small" color={IOSColors.systemBlue} />
            </View>
          )}
        </>
      ) : (
        <View style={[styles.fallbackContainer, { borderRadius }]}>
          <Text style={{ fontSize: width * 0.4 }}>{fallbackEmoji || '🏳️'}</Text>
        </View>
      )}
      <View style={[styles.borderOverlay, { borderRadius }]} pointerEvents="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderOverlay: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
});
