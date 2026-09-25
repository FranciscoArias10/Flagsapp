import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: any;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  values,
  selectedIndex,
  onChange,
  style,
}) => {
  const [segmentWidth, setSegmentWidth] = React.useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width - 4; // subtracting padding
    const width = totalWidth / values.length;
    setSegmentWidth(width);
    slideAnim.setValue(selectedIndex * width);
  };

  useEffect(() => {
    if (segmentWidth > 0) {
      Animated.spring(slideAnim, {
        toValue: selectedIndex * segmentWidth,
        useNativeDriver: true,
        speed: 24,
        bounciness: 4,
      }).start();
    }
  }, [selectedIndex, segmentWidth]);

  const handleSelect = (index: number) => {
    if (index !== selectedIndex) {
      soundService.triggerSelection();
      onChange(index);
    }
  };

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              width: segmentWidth,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}
      <View style={styles.segmentsRow}>
        {values.map((val, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Pressable
              key={val}
              onPress={() => handleSelect(idx)}
              style={styles.segmentButton}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected ? styles.segmentTextActive : styles.segmentTextInactive,
                ]}
                numberOfLines={1}
              >
                {val}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 38,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 12,
    padding: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    left: 2,
    top: 2,
    bottom: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: IOSColors.label,
  },
  segmentTextInactive: {
    fontWeight: '500',
    color: IOSColors.secondaryLabel,
  },
});
