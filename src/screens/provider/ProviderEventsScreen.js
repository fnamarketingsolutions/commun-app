// screens/ProviderEventsScreen.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  FlatList,
  Dimensions,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  useCommunityEventsQuery,
  useCreateCommunityEventMutation,
  useDeleteCommunityEventMutation,
} from '../../redux/service/api';
import { buildEventInterestMessage, buildWhatsAppUrl } from '../../utils/whatsapp';
import CreateEventModal from '../../components/CreateEventModal';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { moderateScale, scaleFont, scaleWidth, scaleHeight } from '../../utils/responsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkAwareView } from '../../components/NetworkAwareView';
import { getEventTypeLabel } from '../../utils/eventTypes';

const MAX_FONT_SIZE_MULTIPLIER = 1.3;
const { width: screenWidth } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatEventDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return '—';
  }
};

const formatEventDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (e) {
    return '—';
  }
};

const getAuthorLabel = (author) => {
  if (!author) return 'A neighbour';
  return [author.firstName, author.lastName].filter(Boolean).join(' ') || 'A neighbour';
};

const getFullName = (user) => {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
};

// ─── Normalise attachments (same as EventsScreen) ────────────────────────────
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

// ─── Main Screen ─────────────────────────────────────────────────────────────
const ProviderEventsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentUser = useSelector((s) => s.auth?.user);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ── Image modal state ──
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageModalData, setImageModalData] = useState({ images: [], initialIndex: 0 });

  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus();

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCommunityEventsQuery();

  const [createCommunityEvent, { isLoading: isCreating }] = useCreateCommunityEventMutation();
  const [deleteCommunityEvent] = useDeleteCommunityEventMutation();

  const lastFetchTime = useRef(Date.now());
  const STALE_TIME = 30000;

  useEffect(() => {
    if (!isOnline) return;
    if (wasOffline) {
      const timer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime.current > STALE_TIME) {
          refetch();
          lastFetchTime.current = now;
        }
        resetOfflineFlag();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetOfflineFlag, refetch]);

  const onRefresh = useCallback(() => {
    if (!isOnline) return;
    refetch();
    lastFetchTime.current = Date.now();
  }, [refetch, isOnline]);

  const events = data?.data?.events || [];
  const meta = data?.data || {};
  const canCreate = meta.hasCommunity && meta.eventsEnabled;

  const handleCreateEvent = useCallback(
    async ({ title, description, expiresAt, files, attachmentLinks, eventType }) => {
      if (!isOnline) {
        Alert.alert('No Internet', 'Please connect to the internet to create an event.');
        return false;
      }
      try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('expiresAt', expiresAt);
        formData.append('eventType', eventType || 'communityMeetup');
        (files || []).forEach((file) => {
          formData.append('attachments', {
            uri: file.uri,
            name: file.name || 'attachment',
            type: file.type || 'application/octet-stream',
          });
        });
        if (attachmentLinks && attachmentLinks.length > 0) {
          formData.append('attachmentLinks', JSON.stringify(attachmentLinks));
        }
        await createCommunityEvent(formData).unwrap();
        return true;
      } catch (e) {
        Alert.alert('Could not create event', e?.data?.message || 'Please try again.');
        return false;
      }
    },
    [createCommunityEvent, isOnline],
  );

  const handleDelete = (eventId) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to delete the event.');
      return;
    }
    Alert.alert('Delete event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(eventId);
          try {
            await deleteCommunityEvent(eventId).unwrap();
          } catch (e) {
            Alert.alert('Could not delete event', e?.data?.message || 'Please try again.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleInterested = (item) => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please connect to the internet to contact the event creator.');
      return;
    }
    const authorPhone = item.author?.phoneNumber;
    const whatsappUrl = buildWhatsAppUrl(
      authorPhone,
      buildEventInterestMessage({
        eventTitle: item.title,
        authorName: getAuthorLabel(item.author),
        interestedUserName: getFullName(currentUser),
        communityName: meta.communityCommunName,
      }),
    );

    if (!whatsappUrl) {
      Alert.alert('Unavailable', 'Event creator has no WhatsApp number on their profile.');
      return;
    }

    Linking.openURL(whatsappUrl).catch(() => {});
  };

  // ── Image modal handlers ──
  const openImageModal = (images, index) => {
    setImageModalData({ images, initialIndex: index });
    setImageModalVisible(true);
  };

  const hasData = !!data;
  const showOfflineBanner = !isOnline && hasData;

  // ── Full‑screen loader ──
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.gradientStart} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Loading events...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !hasData) {
    const message = error?.data?.message || 'Unable to load events.';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
        <View style={styles.centeredState}>
          <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {message}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
        {canCreate ? (
          <TouchableOpacity
            onPress={() => isOnline && setIsCreateModalOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={!isOnline}
            style={!isOnline && { opacity: 0.4 }}
          >
            <Icon name="add-circle-outline" size={scaleFont(26)} color={isOnline ? COLORS.gradientStart : COLORS.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <View style={styles.headerDivider} />

      <NetworkAwareView
        isOnline={isOnline}
        showOfflineBanner={showOfflineBanner}
        message="You are offline. Events are still available."
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + moderateScale(24, 0.3) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && isOnline}
              onRefresh={onRefresh}
              enabled={isOnline}
              tintColor={COLORS.gradientStart}
            />
          }
        >
          <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            Community events for your neighbourhood
            {meta.communityCommunName ? ` (${meta.communityCommunName})` : ''}.
          </Text>

          {!meta.hasCommunity && (
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                You are not linked to a Commun community yet.
              </Text>
            </View>
          )}

          {meta.hasCommunity && !meta.eventsEnabled && (
            <View style={styles.emptyState}>
              <Icon name="calendar-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                Events are not enabled for your community right now.
              </Text>
            </View>
          )}

          {canCreate && events.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="calendar-outline" size={scaleFont(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                No active events yet. Tap + to post one.
              </Text>
            </View>
          )}

          {events.map((item) => {
            const isOwner = currentUser && item.author?._id === currentUser._id;
            const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
            const eventTypeLabel = getEventTypeLabel(item.eventType);
            const attachments = getEventAttachments(item);

            return (
              <View key={item._id} style={styles.card}>
                {/* ── Card Header: Title + Badge ── */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                    {item.title}
                  </Text>
                  <View style={styles.badgeRow}>
                    {!isExpired && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          Active
                        </Text>
                      </View>
                    )}
                    {isExpired && (
                      <View style={styles.expiredBadge}>
                        <Text style={styles.expiredBadgeText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          Expired
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* ── Event Type Label ── */}
                <Text style={styles.eventTypeLabel} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {eventTypeLabel}
                </Text>

                {/* ── Description ── */}
                <Text style={styles.cardDescription} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                  {item.description}
                </Text>

                {/* ── Attachments (Images + Links) ── */}
                <EventAttachments
                  attachments={attachments}
                  onImagePress={openImageModal}
                  isOnline={isOnline}
                />

                {/* ── Meta Info ── */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Icon name="person-outline" size={scaleFont(14)} color={COLORS.textMuted} />
                    <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {getAuthorLabel(item.author)}
                      {item.author?.role ? ` (${item.author.role})` : ''}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Icon name="calendar-outline" size={scaleFont(14)} color={COLORS.textMuted} />
                    <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {formatEventDate(item.expiresAt)}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Icon name="time-outline" size={scaleFont(14)} color={COLORS.textMuted} />
                    <Text style={styles.metaText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                      {formatEventDateTime(item.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* ── Actions ── */}
                <View style={styles.cardActionsRow}>
                  {!isOwner ? (
                    <TouchableOpacity
                      style={[styles.interestedBtn, !isOnline && { opacity: 0.5 }]}
                      activeOpacity={0.85}
                      onPress={() => handleInterested(item)}
                      disabled={!isOnline}
                    >
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.interestedBtnGradient}
                      >
                        <Icon name="logo-whatsapp" size={scaleFont(18)} color={COLORS.white} />
                        <Text style={styles.interestedBtnText} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                          I'm interested
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.deleteBtn, (!isOnline || deletingId === item._id) && { opacity: 0.5 }]}
                      activeOpacity={0.85}
                      onPress={() => handleDelete(item._id)}
                      disabled={deletingId === item._id || !isOnline}
                    >
                      {deletingId === item._id ? (
                        <ActivityIndicator size="small" color="#B91C1C" />
                      ) : (
                        <>
                          <Icon name="trash-outline" size={scaleFont(18)} color={isOnline ? '#B91C1C' : COLORS.textMuted} />
                          <Text style={[styles.deleteBtnText, !isOnline && { color: COLORS.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
                            Delete
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </NetworkAwareView>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
        isSubmitting={isCreating}
        heading="Create event"
        subheading="Share a meetup, market, workshop, or any local gathering with your Commun."
        submitLabel="Post event"
        eventTypeOptions={meta.enabledEventTypes || []}
        requireEventType={true}
        isOnline={isOnline}
        disabled={!isOnline}
        disabledMessage={!isOnline ? 'You are offline. Please connect to create an event.' : ''}
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    backgroundColor: COLORS.white,
  },
  backButton: { width: scaleWidth(24) },
  headerSpacer: { width: scaleWidth(26) },
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
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(12, 0.3),
  },
  loadingText: {
    fontSize: scaleFont(FONTS.body),
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
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
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
  },
  subtitle: {
    fontSize: scaleFont(14),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(20, 0.3),
    marginBottom: scaleHeight(16),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scaleHeight(48),
    gap: scaleHeight(10),
  },
  emptyText: {
    fontSize: scaleFont(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: scaleWidth(20),
  },

  // ─── Card ────────────────────────────────────────────────────────────────
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(4),
  },
  cardTitle: {
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
  activeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: moderateScale(8, 0.3),
    paddingVertical: moderateScale(4, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightSemiBold,
    color: '#065F46',
  },
  expiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: moderateScale(8, 0.3),
    paddingVertical: moderateScale(4, 0.3),
    borderRadius: moderateScale(RADIUS.md, 0.3),
    alignSelf: 'flex-start',
  },
  expiredBadgeText: {
    fontSize: scaleFont(10),
    fontWeight: FONTS.weightSemiBold,
    color: '#B91C1C',
  },
  eventTypeLabel: {
    fontSize: scaleFont(13),
    fontWeight: FONTS.weightMedium,
    color: COLORS.gradientStart,
    marginBottom: scaleHeight(6),
  },
  cardDescription: {
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

  // ─── Actions ─────────────────────────────────────────────────────────────
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  interestedBtn: {
    borderRadius: moderateScale(RADIUS.md, 0.3),
    overflow: 'hidden',
  },
  interestedBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(16),
  },
  interestedBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.white,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
    backgroundColor: '#FEE2E2',
    borderRadius: moderateScale(RADIUS.md, 0.3),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(16),
    minWidth: moderateScale(80, 0.3),
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: scaleFont(14),
    fontWeight: FONTS.weightSemiBold,
    color: '#B91C1C',
  },
});

export default ProviderEventsScreen;