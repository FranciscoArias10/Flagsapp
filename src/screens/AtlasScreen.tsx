import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  Platform,
  StatusBar as RNStatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Country, Continent } from '../types';
import { COUNTRIES, CONTINENTS } from '../data/countries';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { FlagImage } from '../components/FlagImage';
import { AppleHeader } from '../components/AppleHeader';
import { AppleButton } from '../components/AppleButton';
import { useTheme } from '../context/ThemeContext';

export const AtlasScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const { isDark, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<string>('Todos');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const continentFilters = ['Todos', ...CONTINENTS.map((c) => c.name)];

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter((country) => {
      const matchesSearch =
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.capital.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesContinent =
        selectedContinent === 'Todos' || country.continent === selectedContinent;
      return matchesSearch && matchesContinent;
    });
  }, [searchQuery, selectedContinent]);

  const handleSelectCountry = (country: Country) => {
    soundService.triggerLightTap();
    setSelectedCountry(country);
  };

  const handleSelectFilter = (filter: string) => {
    soundService.triggerSelection();
    setSelectedContinent(filter);
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <Pressable
      onPress={() => handleSelectCountry(item)}
      style={({ pressed }) => [
        styles.countryCard,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          borderWidth: 1,
        },
        colors.cardShadow,
        pressed && styles.countryCardPressed,
      ]}
    >
      <View style={styles.flagWrap}>
        <FlagImage
          countryCode={item.code}
          fallbackEmoji={item.flagEmoji}
          width={80}
          height={52}
          borderRadius={10}
        />
      </View>

      <View style={styles.countryInfo}>
        <Text style={[styles.countryName, { color: colors.label }]}>{item.name}</Text>
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={13} color={colors.secondaryLabel} />
          <Text style={[styles.capitalText, { color: colors.secondaryLabel }]}>{item.capital}</Text>
        </View>
        <Text style={[styles.continentText, { color: colors.systemBlue }]}>{item.continent}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.tertiaryLabel} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: topInset }]}>
      <AppleHeader
        title="Atlas"
        category="BIBLIOTECA"
        rightAccessory={
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredCountries.length} países</Text>
          </View>
        }
      />

      {/* iOS Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.tertiaryLabel} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar país o capital..."
            placeholderTextColor={colors.tertiaryLabel}
            style={[styles.searchInput, { color: colors.label }]}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.tertiaryLabel} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Continent Filter Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {continentFilters.map((filter) => {
            const isActive = selectedContinent === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => handleSelectFilter(filter)}
                style={[
                  styles.chip,
                  { backgroundColor: isActive ? colors.systemBlue : colors.surface },
                  isActive && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? '#FFFFFF' : colors.secondaryLabel },
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Countries List */}
      <FlatList
        data={filteredCountries}
        keyExtractor={(item) => item.code}
        renderItem={renderCountryItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="earth" size={48} color={colors.tertiaryLabel} />
            <Text style={[styles.emptyTitle, { color: colors.label }]}>No se encontraron países</Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>Prueba con otro término de búsqueda</Text>
          </View>
        }
      />

      {/* Country Detail iOS Modal */}
      <Modal
        visible={!!selectedCountry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCountry(null)}
      >
        {selectedCountry && (
          <View style={[styles.modalSafeArea, { backgroundColor: colors.systemBackground, paddingTop: Platform.OS === 'android' ? topInset : 10 }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalGrabber, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(60, 60, 67, 0.3)' }]} />
              <Pressable
                onPress={() => setSelectedCountry(null)}
                style={styles.modalCloseBtn}
                hitSlop={12}
              >
                <Ionicons name="close-circle" size={28} color={colors.tertiaryLabel} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalFlagWrap}>
                <FlagImage
                  countryCode={selectedCountry.code}
                  fallbackEmoji={selectedCountry.flagEmoji}
                  width={260}
                  height={170}
                  borderRadius={22}
                />
              </View>

              <Text style={[styles.modalCountryName, { color: colors.label }]}>{selectedCountry.name}</Text>
              <Text style={[styles.modalContinent, { color: colors.systemBlue }]}>{selectedCountry.continent.toUpperCase()}</Text>

              <View style={styles.infoCardsRow}>
                <View style={[styles.infoBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                  <Ionicons name="business" size={20} color={colors.systemPurple} />
                  <Text style={[styles.infoBoxVal, { color: colors.label }]}>{selectedCountry.capital}</Text>
                  <Text style={[styles.infoBoxLbl, { color: colors.secondaryLabel }]}>Capital</Text>
                </View>
                <View style={[styles.infoBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                  <Ionicons name="people" size={20} color={colors.systemBlue} />
                  <Text style={[styles.infoBoxVal, { color: colors.label }]}>{selectedCountry.population}</Text>
                  <Text style={[styles.infoBoxLbl, { color: colors.secondaryLabel }]}>Población</Text>
                </View>
              </View>

              <View style={[styles.modalFactBox, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.16)' : 'rgba(255, 149, 0, 0.08)', borderColor: isDark ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.2)' }]}>
                <View style={styles.factHead}>
                  <Ionicons name="bulb" size={20} color={colors.systemOrange} />
                  <Text style={[styles.factHeadText, { color: colors.systemOrange }]}>Dato Curioso</Text>
                </View>
                <Text style={[styles.factBodyText, { color: colors.label }]}>{selectedCountry.fact}</Text>
              </View>

              <AppleButton
                title="Listo"
                onPress={() => setSelectedCountry(null)}
                variant="secondary"
                style={{ marginTop: 24, width: '100%' }}
              />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IOSColors.systemBackground,
  },
  safeArea: {
    flex: 1,
    backgroundColor: IOSColors.systemBackground,
  },
  countBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: IOSColors.systemBlue,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: IOSColors.label,
    paddingVertical: 0,
  },
  chipsContainer: {
    marginBottom: 12,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...IOSColors.cardShadow,
  },
  chipActive: {
    backgroundColor: IOSColors.systemBlue,
    borderColor: IOSColors.systemBlue,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  separator: {
    height: 10,
  },
  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    ...IOSColors.cardShadow,
  },
  countryCardPressed: {
    opacity: 0.8,
  },
  flagWrap: {
    marginRight: 14,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 17,
    fontWeight: '700',
    color: IOSColors.label,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  capitalText: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    marginLeft: 4,
    fontWeight: '500',
  },
  continentText: {
    fontSize: 11,
    fontWeight: '600',
    color: IOSColors.systemBlue,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: IOSColors.label,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: IOSColors.tertiaryLabel,
    marginTop: 4,
  },
  // Modal styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    position: 'relative',
  },
  modalGrabber: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(60, 60, 67, 0.3)',
    borderRadius: 2.5,
    marginBottom: 8,
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 20,
    top: 10,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalFlagWrap: {
    marginBottom: 18,
    marginTop: 8,
  },
  modalCountryName: {
    fontSize: 28,
    fontWeight: '800',
    color: IOSColors.label,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  modalContinent: {
    fontSize: 12,
    fontWeight: '700',
    color: IOSColors.systemBlue,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  infoCardsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  infoBox: {
    flex: 1,
    backgroundColor: IOSColors.systemBackground,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  infoBoxVal: {
    fontSize: 16,
    fontWeight: '700',
    color: IOSColors.label,
    marginTop: 6,
    textAlign: 'center',
  },
  infoBoxLbl: {
    fontSize: 12,
    color: IOSColors.secondaryLabel,
    marginTop: 2,
  },
  modalFactBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.2)',
  },
  factHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  factHeadText: {
    fontSize: 14,
    fontWeight: '700',
    color: IOSColors.systemOrange,
    marginLeft: 6,
  },
  factBodyText: {
    fontSize: 14,
    color: IOSColors.label,
    lineHeight: 20,
  },
});
