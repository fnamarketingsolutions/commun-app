import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Image,
  FlatList,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import {
  useFetchCommunityEventsQuery,
  useDeleteCommunityEventMutation,
  useFetchFeatureTogglesQuery,
  useUpdateFeatureToggleMutation,
  useFetchEventTogglesQuery,
  useUpdateEventToggleMutation,
} from '../../redux/service/secretaryApi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { EVENT_TYPE_OPTIONS } from '../../utils/eventTypes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const { width: screenWidth } = Dimensions.get('window');

// ── Helpers ──────────────────────────────────────────────────────────────────

const isEventActive = (event) => {
  if (!event?.expiresAt) return false;
  return new Date(event.expiresAt).getTime() >= Date.now();
};

const formatEventDate = (isoDate) => {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return '';
  }
};

const formatEventDateTime = (isoDate) => {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (e) {
    return '';
  }
};

const getAuthorLabel = (author) => {
  if (!author) return 'A neighbour';
  return [author.firstName, author.lastName].filter(Boolean).join(' ') || 'A neighbour';
};

// ── Normalise attachments ──────────────────────────────────────────────────
const getEventAttachments = (event) => {
  // 1. Direct 'attachments' array with { url, mimeType }
  if (event.attachments && Array.isArray(event.attachments) && event.attachments.length > 0) {
    return event.attachments;
  }

  // 2. Build from attachmentLinks (strings or { url, label })
  const linkAttachments = (event.attachmentLinks || []).map((link) => {
    const url = typeof link === 'string' ? link : link.url || link;
    return {
      url: url,
      mimeType: 'text/plain',
      name: typeof link === 'string' ? link : link.label || url,
    };
  });

  // 3. Build from files (array of { uri, name, type })
  const fileAttachments = (event.files || []).map((file) => ({
    url: file.uri || file.url,
    mimeType: file.type || 'application/octet-stream',
    name: file.name || file.filename || 'File',
  }));

  // 4. Combine, remove duplicates by url
  const combined = [...linkAttachments, ...fileAttachments];
  const seen = new Set();
  return combined.filter((att) => {
    if (!att.url) return false;
    if (seen.has(att.url)) return false;
    seen.add(att.url);
    return true;
  });
};

// ─── Image Carousel Modal ──────────────────────────────────────────────────────
const ImageCarouselModal = ({ visible, images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex || 0);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex || 0,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const goToIndex = (idx) => {
    setCurrentIndex(idx);
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  };

  const renderItem = ({ item }) => (
    <View style={carouselStyles.imageWrap}>
      <Image source={{ uri: item.url }} style={carouselStyles.fullImage} resizeMode="contain" />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={carouselStyles.modalSafe} edges={['top', 'bottom']}>
        <View style={carouselStyles.modalContainer}>
          <TouchableOpacity
            style={carouselStyles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Icon name="close" size={scaleFont(28)} color={COLORS.white} />
          </TouchableOpacity>

          <View style={carouselStyles.counter}>
            <Text style={carouselStyles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, idx) => `carousel-${idx}`}
            renderItem={renderItem}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentIndex(index);
            }}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const carouselStyles = StyleSheet.create({
  modalSafe: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  closeBtn: {
    position: 'absolute',
    top: moderateScale(40, 0.3),
    right: scaleWidth(20),
    zIndex: 20,
    padding: moderateScale(6, 0.3),
  },
  counter: {
    position: 'absolute',
    top: moderateScale(48, 0.3),
    left: 0,
    right: 0,
    zIndex: 15,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  counterText: {
    fontSize: scaleFont(14),
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(14, 0.3),
  },
  imageWrap: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: screenWidth,
    height: '100%',
  },
});

// ─── Event Attachments Component ──────────────────────────────────────────────
const EventAttachments = ({ attachments, onImagePress, isOnline }) => {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((att) =>
    att.mimeType?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|png|gif|webp)$/i)
  );
  const links = attachments.filter((att) =>
    att.mimeType === 'text/plain' || (!att.mimeType && !att.url?.match(/\.(jpeg|jpg|png|gif|webp)$/i))
  );

  const handleLinkPress = (url) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to open this link.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to open link', 'Please check the URL and try again.');
    });
  };

  return (
    <View style={styles.attachmentsContainer}>
      {/* ── Images ── */}
      {images.length > 0 && (
        <FlatList
          data={images}
          horizontal
          keyExtractor={(item, index) => item.url || `img-${index}`}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onImagePress?.(images, index)}
              style={styles.attachmentItem}
            >
              <Image source={{ uri: item.url }} style={styles.attachmentImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attachmentsList}
        />
      )}

      {/* ── Links ── */}
      {links.length > 0 && (
        <View style={styles.linksContainer}>
          {links.map((link, idx) => (
            <TouchableOpacity
              key={link.url || idx}
              style={styles.linkItem}
              onPress={() => handleLinkPress(link.url)}
              activeOpacity={0.7}
              disabled={!isOnline}
            >
              <Icon name="link-outline" size={scaleFont(16)} color={COLORS.gradientStart} />
              <Text style={styles.linkText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {link.name || link.url}
              </Text>
              <Icon name="open-outline" size={scaleFont(14)} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

const DeleteConfirmModal = ({ visible, event, onConfirm, onCancel, isDeleting, isOnline }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalIconWrap}>
          <Icon name="trash-outline" size={scaleFont(28)} color={COLORS.error || '#E53935'} />
        </View>

        <Text style={styles.modalTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Delete Event?
        </Text>
        <Text style={styles.modalBody} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          {event ? `"${event.title}" will be permanently removed.` : ''}
        </Text>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.cancelBtn, !isOnline && { opacity: 0.5 }]}
            onPress={onCancel}
            disabled={isDeleting || !isOnline}
            activeOpacity={0.75}
          >
            <Text style={[styles.cancelBtnText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {isOnline ? 'Cancel' : 'Offline'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, !isOnline && { opacity: 0.5 }]}
            onPress={onConfirm}
            disabled={isDeleting || !isOnline}
            activeOpacity={0.85}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.deleteBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isOnline ? 'Delete' : 'Offline'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const EventsScreen = () => {
  const navigation = useNavigation();

  // ── Network status ──
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  // ─── API ───
  const {
    data: eventsData,
    isLoading: eventsLoading,
    isFetching: isFetchingEvents,
    isError: isErrorEvents,
    error: errorEvents,
    refetch: refetchEvents,
  } = useFetchCommunityEventsQuery();

  const [deleteCommunityEvent, { isLoading: isDeleting }] = useDeleteCommunityEventMutation();

  const {
    data: featureTogglesData,
    isLoading: togglesLoading,
    isFetching: isFetchingToggles,
    isError: isErrorToggles,
    error: errorToggles,
    refetch: refetchToggles,
  } = useFetchFeatureTogglesQuery();

  const [updateFeatureToggle] = useUpdateFeatureToggleMutation();

  const {
    data: eventToggles,
    isLoading: eventTogglesLoading,
    isFetching: isFetchingEventToggles,
    isError: isErrorEventToggles,
    error: errorEventToggles,
    refetch: refetchEventToggles,
  } = useFetchEventTogglesQuery();

  const [updateEventToggle, { isLoading: isUpdatingEventToggle }] = useUpdateEventToggleMutation();

  // ── Combined refetch ──
  const refetchAll = useCallback(() => {
    refetchEvents();
    refetchToggles();
    refetchEventToggles();
  }, [refetchEvents, refetchToggles, refetchEventToggles]);

  // ── Stale‑time guard for auto‑refetch ──
  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  // ── Auto‑refetch when coming online ──
  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetchAll();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetchAll]);

  // ── Pull‑to‑refresh handler ──
  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetchAll();
    lastFetchTime.current = Date.now();
  }, [refetchAll, isOnline]);

  // ─── Derived data ───
  const serverEvents = eventsData?.events || [];

  const events = useMemo(() => {
    return serverEvents;
  }, [serverEvents]);

  const communityCommunName = featureTogglesData?.communityCommunName || null;
  const showToMembers = Boolean(featureTogglesData?.toggles?.events);

  const activeCount = events.filter(isEventActive).length;
  const totalCount = events.length;

  // ─── Delete modal state ───
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Image modal state ──
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageModalData, setImageModalData] = useState({ images: [], initialIndex: 0 });

  // ── Determine if we have cached data ──
  const hasData = !!eventsData || !!featureTogglesData || !!eventToggles;
  const showOfflineBanner = !isOnline && hasData;

  // ── Loading and error states ──
  const isLoading = eventsLoading || togglesLoading || eventTogglesLoading;
  const hasError = isErrorEvents || isErrorToggles || isErrorEventToggles;
  const errorMessage =
    errorEvents?.data?.message ||
    errorToggles?.data?.message ||
    errorEventToggles?.data?.message ||
    'Unable to load events.';

  // ── Full‑screen loader on initial load without cached data ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Events
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state (if no cached data) ──
  if (hasError && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Events
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {errorMessage}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Handlers ───
  const handleToggleChange = async (value) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to change this setting.');
      return;
    }
    try {
      await updateFeatureToggle({ key: 'events', enabled: value }).unwrap();
    } catch (e) {}
  };

  const handleEventTypeToggle = async (key, currentValue) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to change this setting.');
      return;
    }
    try {
      await updateEventToggle({ key, enabled: !currentValue }).unwrap();
    } catch (e) {
      Alert.alert('Error', 'Could not update event type. Please try again.');
    }
  };

  const handleCreateEvent = () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to create an event.');
      return;
    }
    navigation.navigate('CreateEventScreen');
  };

  const handleDeletePress = (event) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to delete an event.');
      return;
    }
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return;
    setModalVisible(false);
    setSelectedEvent(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;
    try {
      await deleteCommunityEvent(selectedEvent._id).unwrap();
      setModalVisible(false);
      setSelectedEvent(null);
    } catch (e) {
      setModalVisible(false);
      setSelectedEvent(null);
      Alert.alert('Error', 'Could not delete event. Please try again.');
    }
  };

  // ── Image modal handler ──
  const openImageModal = (images, index) => {
    setImageModalData({ images, initialIndex: index });
    setImageModalVisible(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={scaleFont(24)} color={COLORS.gradientStart} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
          Events
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerDivider} />

      {/* ── Wrap ScrollView with NetworkAwareView ── */}
      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Events are still available."
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={
                (isFetchingEvents || isFetchingToggles || isFetchingEventToggles) && isOnline
              }
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >
          <Text style={styles.description} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Create community events for your Commun{' '}
            {communityCommunName ? (
              <Text
                style={styles.linkText}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              >
                (@{communityCommunName})
              </Text>
            ) : null}
            . Members can also post events when this is enabled.
          </Text>

          {/* ── Primary Action Button ── */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCreateEvent}
            disabled={!isOnline}
            style={!isOnline && { opacity: 0.5 }}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Icon name="add" size={scaleFont(20)} color={isOnline ? COLORS.white : COLORS.border} />
              <Text style={styles.primaryButtonText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {isOnline ? 'Create New Event' : 'Offline'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Toggle Card: Show events to members ── */}
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextColumn}>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  Show events to members
                </Text>
                <Text style={styles.cardSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  When enabled, customers and providers can view and create
                  events in your Commun.
                </Text>
              </View>
              <Switch
                value={showToMembers}
                onValueChange={handleToggleChange}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
                ios_backgroundColor={COLORS.border}
                disabled={!isOnline}
              />
            </View>
          </View>

          {/* ── Event Type Toggles Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Event types members can post
            </Text>
            <Text style={styles.cardSubtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Choose which kinds of events customers and providers can create.
              You can still create any type as secretary.
            </Text>

            {eventTogglesLoading ? (
              <View style={styles.eventTypesLoadingRow}>
                <ActivityIndicator size="small" color={COLORS.gradientStart} />
              </View>
            ) : (
              <View style={styles.eventTypesList}>
                {EVENT_TYPE_OPTIONS.map(({ key, label }, index) => {
                  const enabled = Boolean(eventToggles?.[key]);
                  const isLast = index === EVENT_TYPE_OPTIONS.length - 1;
                  return (
                    <View
                      key={key}
                      style={[
                        styles.eventTypeRow,
                        !isLast && styles.eventTypeRowBorder,
                      ]}
                    >
                      <View style={styles.eventTypeTextCol}>
                        <Text
                          style={styles.eventTypeLabel}
                          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                        >
                          {label}
                        </Text>
                        <Text
                          style={styles.eventTypeStatus}
                          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                        >
                          {enabled ? 'Visible to members' : 'Hidden from member create & list'}
                        </Text>
                      </View>
                      <Switch
                        value={enabled}
                        onValueChange={() => handleEventTypeToggle(key, enabled)}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor={COLORS.white}
                        ios_backgroundColor={COLORS.border}
                        disabled={!isOnline || isUpdatingEventToggle}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {isErrorEventToggles && (
              <Text style={styles.inlineError} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                {errorEventToggles?.data?.message || 'Could not load event type settings.'}
              </Text>
            )}
          </View>

          {/* ── Community Events Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              Community events
            </Text>
            <Text style={styles.statsText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {eventsLoading
                ? 'Loading…'
                : `${activeCount} active · ${totalCount} total`}
            </Text>

            {eventsLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={COLORS.gradientStart} />
              </View>
            ) : events.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  No events yet.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleCreateEvent}
                  disabled={!isOnline}
                  style={!isOnline && { opacity: 0.5 }}
                >
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyButton}
                  >
                    <Icon name="add" size={scaleFont(16)} color={isOnline ? COLORS.white : COLORS.border} />
                    <Text style={[styles.emptyButtonText, !isOnline && { color: COLORS.border }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {isOnline ? 'Create New Event' : 'Offline'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              events.map((event) => {
                const active = isEventActive(event);
                const attachments = getEventAttachments(event);
                const eventTypeLabel = EVENT_TYPE_OPTIONS.find((t) => t.key === (event.eventType || 'communityMeetup'))?.label || 'Community meetup';

                return (
                  <View key={event._id} style={styles.eventRow}>
                    {/* Title + badge row */}
                    <View style={styles.eventTopRow}>
                      <Text
                        style={styles.eventTitle}
                        numberOfLines={1}
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      >
                        {event.title}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badge, active ? styles.badgeActive : styles.badgeExpired]}>
                          <Text
                            style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextExpired]}
                            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                          >
                            {active ? 'Active' : 'Expired'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Event type label */}
                    <Text style={styles.eventTypeLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {eventTypeLabel}
                    </Text>

                    {/* Description */}
                    <Text
                      style={styles.eventDescription}
                      numberOfLines={2}
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    >
                      {event.description}
                    </Text>

                    {/* ── Attachments (Images + Links) ── */}
                    <EventAttachments
                      attachments={attachments}
                      onImagePress={openImageModal}
                      isOnline={isOnline}
                    />

                    {/* Meta row: author, expiry, created */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Icon name="person-outline" size={scaleFont(13)} color={COLORS.textMuted} />
                        <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          {getAuthorLabel(event.author)}
                          {event.author?.role ? ` (${event.author.role})` : ''}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Icon name="calendar-outline" size={scaleFont(13)} color={COLORS.textMuted} />
                        <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          {formatEventDate(event.expiresAt)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Icon name="time-outline" size={scaleFont(13)} color={COLORS.textMuted} />
                        <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          {formatEventDateTime(event.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Delete button (secretary action) */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.deleteIconBtn, !isOnline && { opacity: 0.4 }]}
                        onPress={() => handleDeletePress(event)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        disabled={!isOnline}
                      >
                        <Icon
                          name="trash-outline"
                          size={scaleFont(17)}
                          color={isOnline ? (COLORS.white || '#0e0000') : COLORS.textMuted}
                        />
                        <Text style={[styles.deleteBtnText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </NetworkAwareView>

      {/* ── Delete Confirm Modal ── */}
      <DeleteConfirmModal
        visible={modalVisible}
        event={selectedEvent}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
        isOnline={isOnline}
      />

      {/* ── Image Carousel Modal ── */}
      <ImageCarouselModal
        visible={imageModalVisible}
        images={imageModalData.images}
        initialIndex={imageModalData.initialIndex}
        onClose={() => setImageModalVisible(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(32),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: scaleWidth(24),
  },
  headerSpacer: {
    width: scaleWidth(24),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(19),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  headerDivider: {
    height: moderateScale(1, 0.3),
    backgroundColor: COLORS.border,
  },
  description: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(20),
  },
  linkText: {
    color: COLORS.link,
    fontWeight: FONTS.weightSemiBold,
  },

  // ── Primary Button ──
  primaryButton: {
    height: moderateScale(52, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(20),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(10, 0.2),
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    marginLeft: scaleWidth(8),
  },

  // ── Cards ──
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextColumn: {
    flex: 1,
    paddingRight: scaleWidth(16),
  },
  cardTitle: {
    fontSize: scaleFont(16),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(4),
  },
  cardSubtitle: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    lineHeight: moderateScale(18, 0.3),
  },
  statsText: {
    fontSize: scaleFont(13),
    color: COLORS.textMuted,
    marginTop: scaleHeight(4),
    marginBottom: scaleHeight(16),
  },

  // ── Event Type Toggles ──
  eventTypesLoadingRow: {
    alignItems: 'center',
    paddingVertical: scaleHeight(20),
  },
  eventTypesList: {
    marginTop: scaleHeight(16),
  },
  eventTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(12),
  },
  eventTypeRowBorder: {
    borderBottomWidth: moderateScale(1, 0.3),
    borderBottomColor: COLORS.border,
  },
  eventTypeTextCol: {
    flex: 1,
    paddingRight: scaleWidth(16),
  },
  eventTypeLabel: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(2),
  },
  eventTypeStatus: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },
  inlineError: {
    marginTop: scaleHeight(12),
    fontSize: scaleFont(13),
    color: COLORS.error || '#DC2626',
  },

  // ── Loading ──
  loadingState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(32),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: scaleWidth(24),
  },
  retryBtn: {
    marginTop: scaleHeight(12),
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.gradientStart,
  },
  retryBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },

  // ── Empty State ──
  emptyBox: {
    borderWidth: moderateScale(1.5, 0.3),
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.inputBg,
    paddingVertical: scaleHeight(32),
    paddingHorizontal: scaleWidth(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: scaleHeight(16),
  },
  emptyButton: {
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(20),
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: moderateScale(2, 0.2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(6, 0.2),
    elevation: 2,
  },
  emptyButtonText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
    marginLeft: scaleWidth(6),
  },

  // ── Event List (updated to match provider card) ──
  eventRow: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(16, 0.3),
    marginBottom: scaleHeight(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
    shadowOpacity: 0.04,
    shadowRadius: moderateScale(8, 0.3),
    elevation: 1,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(4),
  },
  eventTitle: {
    flex: 1,
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginRight: scaleWidth(8),
  },
  badgeRow: {
    flexDirection: 'row',
    gap: scaleWidth(6),
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
  },
  badgeActive: {
    backgroundColor: '#D1FAE5',
  },
  badgeExpired: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightSemiBold,
  },
  badgeTextActive: {
    color: '#065F46',
  },
  badgeTextExpired: {
    color: '#B91C1C',
  },
  eventTypeLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.gradientStart,
    marginBottom: scaleHeight(6),
  },
  eventDescription: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
    marginBottom: scaleHeight(10),
  },

  // ─── Attachments ─────────────────────────────────────────────────────────
  attachmentsContainer: {
    marginBottom: scaleHeight(10),
  },
  attachmentsList: {
    paddingVertical: scaleHeight(4),
    gap: scaleWidth(8),
  },
  attachmentItem: {
    width: screenWidth * 0.3,
    height: scaleHeight(100),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  linksContainer: {
    marginTop: scaleHeight(6),
    gap: scaleHeight(4),
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(4),
    backgroundColor: COLORS.inputBg,
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: COLORS.link,
    marginLeft: scaleWidth(8),
    marginRight: scaleWidth(4),
  },

  // ─── Meta ────────────────────────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(12),
    marginBottom: scaleHeight(12),
    paddingTop: scaleHeight(6),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(4),
  },
  metaText: {
    fontSize: scaleFont(12),
    color: COLORS.textMuted,
  },

  // ─── Action ─────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    backgroundColor: '#e50d0d',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(14),
  },
  deleteBtnText: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightSemiBold,
    color: '#fefbfb',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(28),
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(RADIUS.lg, 0.3),
    padding: moderateScale(24, 0.3),
    alignItems: 'center',
    ...SHADOW.card,
    elevation: 8,
  },
  modalIconWrap: {
    width: moderateScale(56, 0.3),
    height: moderateScale(56, 0.3),
    borderRadius: moderateScale(28, 0.3),
    backgroundColor: '#da1431',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(16),
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: scaleHeight(10),
    textAlign: 'center',
  },
  modalBody: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(21, 0.3),
    marginBottom: scaleHeight(24),
  },
  modalActions: {
    flexDirection: 'row',
    gap: scaleWidth(12),
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    borderWidth: moderateScale(1, 0.3),
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  deleteBtn: {
    flex: 1,
    height: moderateScale(48, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    backgroundColor: COLORS.error || '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: scaleFont(15),
    fontWeight: FONTS.weightBold,
    color: COLORS.white,
  },
});

export default EventsScreen;