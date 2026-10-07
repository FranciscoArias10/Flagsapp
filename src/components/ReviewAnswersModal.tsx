import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AnswerReviewItem } from '../types';
import { IOSColors } from '../utils/colors';
import { soundService } from '../utils/soundHelper';
import { AppleButton } from './AppleButton';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ReviewAnswersModalProps {
  visible: boolean;
  onClose: () => void;
  items: AnswerReviewItem[];
  title?: string;
  onRetryFailures?: () => void;
}

type FilterType = 'all' | 'correct' | 'wrong';

export const ReviewAnswersModal: React.FC<ReviewAnswersModalProps> = ({
  visible,
  onClose,
  items,
  title,
  onRetryFailures,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0);
  const [filter, setFilter] = useState<FilterType>('all');
  const { isDark, colors } = useTheme();
  const { t, getCountryName, getCountryFact } = useLanguage();

  const correctCount = items.filter((i) => i.isCorrect).length;
  const wrongCount = items.length - correctCount;

  const displayTitle = title || t('review_modal_title');

  const filteredItems = items.filter((item) => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'wrong') return !item.isCorrect;
    return true;
  });

  const handleFilterChange = (newFilter: FilterType) => {
    soundService.triggerLightTap();
    setFilter(newFilter);
  };

  const handleClose = () => {
    soundService.triggerLightTap();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.systemBackground, paddingTop: Platform.OS === 'android' ? topInset : 12 }]}>
        {/* Modal Header */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.separator }]}>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.title, { color: colors.label }]}>{displayTitle}</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryLabel }]}>
              {t('review_modal_sub', { correct: correctCount, wrong: wrongCount })}
            </Text>
          </View>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close-circle" size={28} color={colors.secondaryLabel} />
          </Pressable>
        </View>

        {/* Quick Summary Pill Bar */}
        <View style={[styles.summaryBar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.separator }]}>
          <Pressable
            onPress={() => handleFilterChange('correct')}
            style={[
              styles.summaryPill,
              {
                backgroundColor:
                  filter === 'correct'
                    ? isDark
                      ? 'rgba(48, 209, 88, 0.26)'
                      : 'rgba(52, 199, 89, 0.18)'
                    : isDark
                    ? 'rgba(48, 209, 88, 0.12)'
                    : 'rgba(52, 199, 89, 0.1)',
                borderColor: filter === 'correct' ? colors.systemGreen : 'transparent',
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.systemGreen} />
            <Text style={[styles.summaryPillText, { color: colors.systemGreen }]}>
              {t('review_filter_hits', { count: correctCount })}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleFilterChange('wrong')}
            style={[
              styles.summaryPill,
              {
                backgroundColor:
                  filter === 'wrong'
                    ? isDark
                      ? 'rgba(255, 69, 58, 0.26)'
                      : 'rgba(255, 59, 48, 0.18)'
                    : isDark
                    ? 'rgba(255, 69, 58, 0.12)'
                    : 'rgba(255, 59, 48, 0.1)',
                borderColor: filter === 'wrong' ? colors.systemRed : 'transparent',
              },
            ]}
          >
            <Ionicons name="close-circle" size={16} color={colors.systemRed} />
            <Text style={[styles.summaryPillText, { color: colors.systemRed }]}>
              {t('review_filter_misses', { count: wrongCount })}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleFilterChange('all')}
            style={[
              styles.summaryPill,
              {
                backgroundColor:
                  filter === 'all'
                    ? isDark
                      ? 'rgba(10, 132, 255, 0.26)'
                      : 'rgba(0, 122, 255, 0.16)'
                    : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 122, 255, 0.08)',
                borderColor: filter === 'all' ? colors.systemBlue : 'transparent',
              },
            ]}
          >
            <Ionicons name="list" size={16} color={colors.systemBlue} />
            <Text style={[styles.summaryPillText, { color: colors.systemBlue }]}>
              {t('review_filter_all', { count: items.length })}
            </Text>
          </Pressable>
        </View>

        {/* Scrollable Questions List */}
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={true}
        >
          {filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name={filter === 'wrong' ? 'trophy' : 'checkmark-done-circle'}
                size={54}
                color={filter === 'wrong' ? colors.goldStar : colors.systemGreen}
              />
              <Text style={[styles.emptyTitle, { color: colors.label }]}>
                {filter === 'wrong' ? t('review_flawless_title') : t('review_empty_title')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>
                {filter === 'wrong'
                  ? t('review_flawless_sub')
                  : t('review_empty_sub')}
              </Text>
            </View>
          ) : (
            filteredItems.map((item, index) => {
              const countryDisplayName = item.countryCode
                ? getCountryName(item.countryCode, item.countryName)
                : item.countryName;
              const factText = item.countryCode
                ? getCountryFact(item.countryCode, item.fact)
                : item.fact;

              return (
                <View
                  key={item.id || `${item.countryName}-${index}`}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: item.isCorrect
                        ? isDark ? 'rgba(48, 209, 88, 0.4)' : 'rgba(52, 199, 89, 0.25)'
                        : isDark ? 'rgba(255, 69, 58, 0.4)' : 'rgba(255, 59, 48, 0.25)',
                    },
                    colors.cardShadow,
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemFlagEmoji}>{item.flagEmoji}</Text>
                      <View style={styles.itemTextWrap}>
                        <Text style={[styles.itemCountryName, { color: colors.label }]} numberOfLines={1}>
                          {countryDisplayName}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        item.isCorrect ? styles.statusBadgeCorrect : styles.statusBadgeWrong,
                      ]}
                    >
                      <Ionicons
                        name={item.isCorrect ? 'checkmark' : 'close'}
                        size={12}
                        color="#FFFFFF"
                      />
                      <Text style={styles.statusBadgeText}>
                        {item.isCorrect ? t('review_badge_correct') : t('review_badge_wrong')}
                      </Text>
                    </View>
                  </View>

                  {/* Answers Detail */}
                  <View style={[styles.answersBlock, { backgroundColor: colors.surface }]}>
                    {item.isCorrect ? (
                      <View style={styles.answerRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.systemGreen} />
                        <Text style={[styles.answerLabel, { color: colors.secondaryLabel }]}>
                          {t('review_label_your_answer')}
                        </Text>
                        <Text style={[styles.answerValue, { color: colors.systemGreen }]}>
                          {item.correctAnswer}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.answerRow}>
                          <Ionicons name="close-circle" size={16} color={colors.systemRed} />
                          <Text style={[styles.answerLabel, { color: colors.secondaryLabel }]}>
                            {t('review_label_you_chose')}
                          </Text>
                          <Text style={[styles.answerValue, { color: colors.systemRed, textDecorationLine: 'line-through' }]}>
                            {item.userAnswer}
                          </Text>
                        </View>
                        <View style={[styles.answerRow, { marginTop: 4 }]}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.systemGreen} />
                          <Text style={[styles.answerLabel, { color: colors.secondaryLabel }]}>
                            {t('review_label_correct_was')}
                          </Text>
                          <Text style={[styles.answerValue, { color: colors.systemGreen, fontWeight: '700' }]}>
                            {item.correctAnswer}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Curiosity Fact */}
                  {factText && (
                    <View style={[styles.factBox, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.16)' : 'rgba(255, 149, 0, 0.08)' }]}>
                      <Ionicons name="bulb-outline" size={14} color={colors.systemOrange} style={{ marginTop: 2, marginRight: 6 }} />
                      <Text style={[styles.factText, { color: colors.label }]} numberOfLines={2}>
                        {factText}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {wrongCount > 0 && onRetryFailures && (
            <View style={{ marginTop: 16 }}>
              <AppleButton
                title={t('review_btn_retry_wrong', { count: wrongCount })}
                onPress={() => {
                  soundService.triggerSelection();
                  onClose();
                  onRetryFailures();
                }}
                variant="gradient"
                style={{ width: '100%', marginBottom: 10 }}
              />
            </View>
          )}

          <View style={{ marginTop: wrongCount > 0 && onRetryFailures ? 0 : 16 }}>
            <AppleButton
              title={t('review_btn_back_results')}
              onPress={handleClose}
              variant={wrongCount > 0 && onRetryFailures ? 'secondary' : 'gradient'}
              style={{ width: '100%' }}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: IOSColors.label,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: IOSColors.secondaryLabel,
    marginTop: 2,
  },
  closeBtn: {
    marginLeft: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  summaryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 5,
  },
  summaryPillGreen: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  summaryPillActiveGreen: {
    borderColor: IOSColors.systemGreen,
    backgroundColor: 'rgba(52, 199, 89, 0.18)',
  },
  summaryPillRed: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  summaryPillActiveRed: {
    borderColor: IOSColors.systemRed,
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
  },
  summaryPillNeutral: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  summaryPillActiveNeutral: {
    borderColor: IOSColors.systemBlue,
    backgroundColor: 'rgba(0, 122, 255, 0.16)',
  },
  summaryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: IOSColors.label,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    ...IOSColors.cardShadow,
  },
  itemCardCorrect: {
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  itemCardWrong: {
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  itemFlagEmoji: {
    fontSize: 26,
    marginRight: 10,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemCountryName: {
    fontSize: 16,
    fontWeight: '700',
    color: IOSColors.label,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeCorrect: {
    backgroundColor: IOSColors.systemGreen,
  },
  statusBadgeWrong: {
    backgroundColor: IOSColors.systemRed,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  answersBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.025)',
    borderRadius: 10,
    padding: 10,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  answerLabel: {
    fontSize: 13,
    color: IOSColors.secondaryLabel,
    fontWeight: '500',
  },
  answerValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  factBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  factText: {
    fontSize: 12,
    color: IOSColors.label,
    lineHeight: 16,
    flex: 1,
  },
});
