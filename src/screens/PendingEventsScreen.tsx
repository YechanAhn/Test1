// ============================================
// 감지된 일정 확인 화면
// 자동으로 감지된 일정을 확인/거부할 수 있습니다.
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useCalendarStore } from '../hooks/useCalendarStore';
import { CalendarEvent } from '../types';

const PendingEventsScreen: React.FC = () => {
  const { pendingEvents, confirmPendingEvent, dismissPendingEvent } = useCalendarStore();

  const handleConfirm = (eventId: string) => {
    confirmPendingEvent(eventId);
  };

  const handleDismiss = (eventId: string) => {
    dismissPendingEvent(eventId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>감지된 일정</Text>
        <Text style={styles.headerSubtitle}>
          메시지에서 자동으로 감지된 일정입니다
        </Text>
      </View>

      {pendingEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>감지된 일정이 없습니다</Text>
          <Text style={styles.emptySubtext}>
            SMS나 카카오톡에서 일정이 감지되면{'\n'}여기에 표시됩니다
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <PendingEventCard
              event={item}
              onConfirm={() => handleConfirm(item.id)}
              onDismiss={() => handleDismiss(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

/** 대기 중인 일정 카드 */
const PendingEventCard: React.FC<{
  event: CalendarEvent;
  onConfirm: () => void;
  onDismiss: () => void;
}> = ({ event, onConfirm, onDismiss }) => {
  const sourceLabel = event.sourceType === 'sms' ? 'SMS' : '카카오톡';

  return (
    <View style={styles.card}>
      <View style={styles.cardSource}>
        <Text style={styles.sourceTag}>{sourceLabel}에서 감지</Text>
      </View>

      <Text style={styles.cardTitle}>{event.title}</Text>
      <Text style={styles.cardDate}>{event.startDate}</Text>
      {event.location && (
        <Text style={styles.cardLocation}>{event.location}</Text>
      )}

      {/* 원본 메시지 미리보기 */}
      {event.sourceMessage && (
        <View style={styles.originalMessage}>
          <Text style={styles.originalLabel}>원본 메시지:</Text>
          <Text style={styles.originalText} numberOfLines={3}>
            {event.sourceMessage}
          </Text>
        </View>
      )}

      {/* 확인/거부 버튼 */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>무시</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmButtonText}>캘린더에 추가</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B2BEC3',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#B2BEC3',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSource: {
    marginBottom: 8,
  },
  sourceTag: {
    fontSize: 11,
    color: '#4A90D9',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 14,
    color: '#636E72',
  },
  originalMessage: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  originalLabel: {
    fontSize: 11,
    color: '#B2BEC3',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 10,
  },
  dismissButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  dismissButtonText: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#4A90D9',
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default PendingEventsScreen;
