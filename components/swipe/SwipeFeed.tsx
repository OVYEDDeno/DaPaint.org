// components/swipe/SwipeFeed.tsx — cinematic swipe with bottom actions and info modal
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  Platform,
  Modal,
  ScrollView,
  Share,
} from 'react-native';

import { theme } from '../../constants/theme';
import type { DaPaint } from '../../lib/api/dapaints';

import SwipeCard from './SwipeCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.38;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type SwipeFeedProps = {
  dapaints: DaPaint[];
  onSwipeLeft: (dapaint: DaPaint) => void;
  onSwipeRight: (dapaint: DaPaint) => void;
  onExhausted?: () => void;
  topOffset?: number;
};

function SwipeFeedComponent({
  dapaints,
  onSwipeLeft,
  onSwipeRight,
  onExhausted,
  topOffset = 0,
}: SwipeFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedCards, setSkippedCards] = useState<DaPaint[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  const currentCard = useMemo(
    () => dapaints[currentIndex],
    [dapaints, currentIndex]
  );
  const nextCard = useMemo(
    () => dapaints[currentIndex + 1],
    [dapaints, currentIndex]
  );

  const resetCard = useCallback(() => {
    position.setValue({ x: 0, y: 0 });
    scale.setValue(1);
  }, [position, scale]);

  useEffect(() => {
    setCurrentIndex(0);
    setSkippedCards([]);
    setShowInfoModal(false);
    resetCard();
  }, [dapaints, resetCard]);

  const rotateInterpolate = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: ['-12deg', '0deg', '12deg'],
        extrapolate: 'clamp',
      }),
    [position.x]
  );

  const skipOpacity = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [position.x]
  );

  const joinOpacity = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [0, SCREEN_WIDTH / 2],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [position.x]
  );

  const animateCardExit = useCallback(
    (direction: 'left' | 'right') => {
      if (!currentCard) return;

      const toX =
        direction === 'right' ? SCREEN_WIDTH * 1.35 : -SCREEN_WIDTH * 1.35;

      Animated.parallel([
        Animated.spring(position, {
          toValue: { x: toX, y: 0 },
          useNativeDriver: USE_NATIVE_DRIVER,
          speed: 14,
          bounciness: 4,
        }),
        Animated.timing(scale, {
          toValue: 0.94,
          duration: 220,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(() => {
        if (direction === 'left') {
          onSwipeLeft(currentCard);
          setSkippedCards(prev => [...prev, currentCard]);
        } else {
          onSwipeRight(currentCard);
        }

        setCurrentIndex(prev => prev + 1);
        resetCard();
      });
    },
    [currentCard, onSwipeLeft, onSwipeRight, position, resetCard, scale]
  );

  const handleBack = useCallback(() => {
    if (skippedCards.length === 0) return;

    const lastSkipped = skippedCards[skippedCards.length - 1];
    if (!lastSkipped) return;

    const lastIndex = dapaints.findIndex(d => d.id === lastSkipped.id);
    if (lastIndex === -1) return;

    position.setValue({ x: -SCREEN_WIDTH, y: 0 });

    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: USE_NATIVE_DRIVER,
      speed: 12,
      bounciness: 4,
    }).start();

    setSkippedCards(prev => prev.slice(0, -1));
    setCurrentIndex(lastIndex);
  }, [dapaints, position, skippedCards]);

  const handleSkip = useCallback(
    () => animateCardExit('left'),
    [animateCardExit]
  );
  const handleJoin = useCallback(
    () => animateCardExit('right'),
    [animateCardExit]
  );
  const handleInfo = useCallback(() => setShowInfoModal(true), []);
  const handleShare = useCallback(async () => {
    if (!currentCard) return;
    try {
      await Share.share({
        message: `Check out this DaPaint: ${currentCard.dapaint} in ${currentCard.city}.`,
      });
    } catch (e) {
      console.warn('Share failed', e);
    }
  }, [currentCard]);

  useEffect(() => {
    if (currentIndex >= dapaints.length && onExhausted) {
      onExhausted();
    }
  }, [currentIndex, dapaints.length, onExhausted]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft') handleSkip();
      if (k === 's' || e.key === 'ArrowDown') handleBack();
      if (k === 'd' || e.key === 'ArrowRight') handleJoin();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBack, handleJoin, handleSkip]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          handleJoin();
          return;
        }
        if (gesture.dx < -SWIPE_THRESHOLD) {
          handleSkip();
          return;
        }
        if (gesture.dy > SWIPE_THRESHOLD) {
          handleBack();
          return;
        }

        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: USE_NATIVE_DRIVER,
          friction: 6,
        }).start();
      },
    })
  ).current;

  if (!currentCard) return null;

  return (
    <View style={[styles.container, { paddingTop: topOffset + 8 }]}>
      {/* next preview */}
      {!!nextCard && (
        <View style={[styles.cardContainer, styles.nextPreview]}>
          <SwipeCard dapaint={nextCard} />
        </View>
      )}

      {/* current */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.cardContainer,
          { zIndex: 1 },
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate: rotateInterpolate },
              { scale },
            ],
          },
        ]}
      >
        <SwipeCard dapaint={currentCard} />
      </Animated.View>

      {/* indicators */}
      <Animated.View
        style={[
          styles.indicator,
          styles.skipIndicator,
          { opacity: skipOpacity },
        ]}
      >
        <Text style={styles.indicatorText}>SKIP</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.indicator,
          styles.joinIndicator,
          { opacity: joinOpacity },
        ]}
      >
        <Text style={styles.indicatorText}>JOIN</Text>
      </Animated.View>

      {/* bottom action bar */}
      <View
        style={[
          styles.bottomBarWrap,
          Platform.OS === 'web' ? ({ pointerEvents: 'box-none' } as any) : null,
        ]}
        {...(Platform.OS === 'web'
          ? {}
          : ({ pointerEvents: 'box-none' } as const))}
      >
        <View style={styles.bottomBar}>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnSmall,
                skippedCards.length === 0 && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handleBack}
              disabled={skippedCards.length === 0}
            >
              <Text style={styles.icon}>↺</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnBig,
                styles.btnSkip,
                pressed && styles.pressed,
              ]}
              onPress={handleSkip}
            >
              <Text style={styles.iconBig}>✕</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnSmall,
                styles.btnInfo,
                pressed && styles.pressed,
              ]}
              onPress={handleInfo}
            >
              <Text style={styles.icon}>❓</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnBig,
                styles.btnJoin,
                pressed && styles.pressed,
              ]}
              onPress={handleJoin}
            >
              <Text style={styles.iconBig}>⚔️</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnSmall,
                styles.btnShare,
                pressed && styles.pressed,
              ]}
              onPress={handleShare}
            >
              <Text style={styles.icon}>🔗</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* info modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{currentCard.dapaint}</Text>

              <InfoRow
                label="📍 Location"
                value={`${currentCard.location}, ${currentCard.city}, ${currentCard.zipcode}`}
              />
              <InfoRow
                label="⏰ Date & Time"
                value={new Date(currentCard.starts_at).toLocaleString()}
              />
              <InfoRow
                label="🏅 Win by"
                value={currentCard.how_winner_is_determined}
              />

              {!!currentCard.description && (
                <InfoRow
                  label="📝 Description"
                  value={currentCard.description}
                />
              )}
              {!!currentCard.rules_of_dapaint && (
                <InfoRow
                  label="📜 Rules"
                  value={currentCard.rules_of_dapaint}
                />
              )}

              <InfoRow label="👤 Host" value={currentCard.host_display_name} />
              <InfoRow
                label="🎯 Type"
                value={currentCard.dapaint_type === '1v1' ? '1v1' : 'Team'}
              />

              <TicketPriceInfo price={currentCard.ticket_price} />
            </ScrollView>

            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.modalSection}>
      <Text style={styles.modalLabel}>{label}</Text>
      <Text style={styles.modalText}>{value}</Text>
    </View>
  );
}

function TicketPriceInfo({ price }: { price?: string | null }) {
  const parsedPrice = Number.parseFloat(String(price ?? '0')) || 0;
  if (parsedPrice <= 0) return null;

  return <InfoRow label="💵 Entry" value={`$${parsedPrice.toFixed(2)}`} />;
}

const SwipeFeed = memo(SwipeFeedComponent);
export default SwipeFeed;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 90,
  },
  cardContainer: {
    position: 'absolute',
    zIndex: 0,
  },
  nextPreview: {
    opacity: 0.55,
    transform: [{ scale: 0.965 }],
    zIndex: -1,
  },

  indicator: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    position: 'absolute',
    top: 110,
    zIndex: 5,
  },
  skipIndicator: {
    borderColor: theme.colors.nope,
    left: 28,
    transform: [{ rotate: '-18deg' }],
    zIndex: 5,
  },
  joinIndicator: {
    borderColor: theme.colors.like,
    right: 28,
    transform: [{ rotate: '18deg' }],
    zIndex: 5,
  },
  indicatorText: {
    ...theme.type.labelLarge,
    color: theme.colors.textPrimary,
    letterSpacing: 1.6,
  },

  bottomBarWrap: {
    bottom: 60,
    left: theme.space.md,
    position: 'absolute',
    right: theme.space.md,
    zIndex: 6,
  },
  bottomBar: {
    borderRadius: theme.radius.xl,
    borderWidth: 0,
    overflow: 'hidden',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.space.sm,
    justifyContent: 'center',
    paddingHorizontal: theme.space.xxs,
    paddingVertical: theme.space.xxs,
  },

  btnSmall: {
    backgroundColor: 'rgba(0,92,130,0.08)',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 0,
    height: 44,
    width: 44,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 9px rgba(0,92,130,0.12)',
      },
      default: {
        shadowColor: theme.colors.primaryDeep,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 9,
        elevation: 2,
      },
    }),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBig: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,92,130,0.08)',
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 0,
    height: 56,
    justifyContent: 'center',
    width: 56,
    ...theme.shadow.small,
  },
  btnSkip: { backgroundColor: 'rgba(255, 69, 58, 0.3)' }, // Pale red
  btnJoin: { backgroundColor: 'rgba(52, 199, 89, 0.3)' }, // Pale green
  btnInfo: { backgroundColor: 'rgba(0, 92, 130, 0.3)' }, // Pale blue
  btnShare: {
    backgroundColor: 'rgba(0,92,130,0.08)',
    borderColor: 'transparent',
  },

  btnDisabled: { opacity: 0.35 },

  icon: { fontSize: 28 },
  iconBig: { fontSize: 36 },

  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

  modalOverlay: {
    backgroundColor: theme.colors.scrimStrong,
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.bg1,
    borderColor: theme.colors.border,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    maxHeight: '82%',
    padding: theme.space.lg,
  },
  modalTitle: {
    ...theme.type.displayMedium,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.lg,
  },
  modalSection: { marginBottom: theme.space.md },
  modalLabel: {
    ...theme.type.labelSmall,
    color: theme.colors.textTertiary,
    marginBottom: theme.space.xxs,
  },
  modalText: {
    ...theme.type.bodyLarge,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    marginTop: theme.space.sm,
    paddingVertical: theme.space.sm,
    ...theme.shadow.glowPrimary,
  },
  closeText: {
    ...theme.type.labelLarge,
    color: '#FFFFFF',
  },
});
