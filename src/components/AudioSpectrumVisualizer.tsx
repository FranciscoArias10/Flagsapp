import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface AudioSpectrumVisualizerProps {
  spectrum: number[]; // 5 bandas de frecuencias (0 a 1)
  volume: number; // 0 a 100
  hasAudioSignal: boolean;
  isListening: boolean;
  micStatus?: 'idle' | 'requesting' | 'active' | 'silent' | 'permission_denied' | 'unsupported' | 'error';
  errorMessage?: string | null;
  onRequestMicAccess?: () => void;
}

export const AudioSpectrumVisualizer: React.FC<AudioSpectrumVisualizerProps> = ({
  spectrum,
  volume,
  hasAudioSignal,
  isListening,
  micStatus = 'idle',
  errorMessage,
  onRequestMicAccess,
}) => {
  const { isDark, colors } = useTheme();

  // Color de las barras según la actividad real del micrófono
  const isDenied = micStatus === 'permission_denied';
  const isSilent = isListening && !hasAudioSignal && volume === 0;

  const barColor = isDenied
    ? colors.systemRed
    : hasAudioSignal
    ? '#34C759' // Verde cuando detecta sonido real
    : isListening
    ? '#30B0C7' // Cyan/Azul cuando está activo a la espera
    : colors.tertiaryLabel;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
          borderColor: isDenied
            ? 'rgba(255, 59, 48, 0.3)'
            : hasAudioSignal
            ? 'rgba(52, 199, 89, 0.3)'
            : isDark
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Espectro de 5 barras de frecuencias */}
        <View style={styles.barsContainer}>
          {spectrum.map((level, idx) => {
            const barHeight = Math.max(4, Math.min(26, Math.round(level * 24) + 4));
            return (
              <View
                key={idx}
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: barColor,
                    opacity: hasAudioSignal ? 0.9 + level * 0.1 : 0.6,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Indicador de volumen / dB */}
        <View
          style={[
            styles.volumeBadge,
            {
              backgroundColor: hasAudioSignal
                ? isDark
                  ? 'rgba(52, 199, 89, 0.2)'
                  : 'rgba(52, 199, 89, 0.12)'
                : isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.05)',
            },
          ]}
        >
          <Ionicons
            name={hasAudioSignal ? 'volume-high' : volume > 0 ? 'volume-medium' : 'volume-mute'}
            size={11}
            color={hasAudioSignal ? '#34C759' : colors.secondaryLabel}
            style={{ marginRight: 3 }}
          />
          <Text
            style={[
              styles.volumeText,
              { color: hasAudioSignal ? (isDark ? '#34C759' : '#248A3D') : colors.secondaryLabel },
            ]}
          >
            {volume}%
          </Text>
        </View>

        {/* Diagnóstico en tiempo real para resolver problemas de micrófono */}
        <View style={styles.diagnosticContainer}>
          {isDenied ? (
            <View style={styles.statusRow}>
              <Text style={[styles.diagnosticText, { color: colors.systemRed }]} numberOfLines={1}>
                Micrófono bloqueado por el navegador
              </Text>
              {onRequestMicAccess && (
                <Pressable
                  onPress={onRequestMicAccess}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.systemRed, opacity: pressed ? 0.75 : 1 },
                  ]}
                  hitSlop={6}
                >
                  <Text style={styles.actionBtnText}>Conceder</Text>
                </Pressable>
              )}
            </View>
          ) : isSilent ? (
            <Text style={[styles.diagnosticText, { color: colors.systemOrange }]} numberOfLines={1}>
              ⚠️ Micrófono en silencio (0%) • Revisa PipeWire/pavucontrol
            </Text>
          ) : hasAudioSignal ? (
            <Text style={[styles.diagnosticText, { color: colors.label }]} numberOfLines={1}>
              🎙️ Captando voz ({volume}%) • Di la respuesta
            </Text>
          ) : (
            <Text style={[styles.diagnosticText, { color: colors.secondaryLabel }]} numberOfLines={1}>
              🎙️ Micrófono en escucha • Esperando voz
            </Text>
          )}

          {Boolean(errorMessage) && !isDenied && (
            <Text style={[styles.errorSubtext, { color: colors.systemOrange }]} numberOfLines={2}>
              {errorMessage}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 26,
    marginRight: 8,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
    marginHorizontal: 1.5,
  },
  volumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  volumeText: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  diagnosticContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diagnosticText: {
    fontSize: 11,
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 6,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
