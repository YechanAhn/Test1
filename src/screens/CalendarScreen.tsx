// ============================================
// 메인 캘린더 화면
// 월간 캘린더 + 일정 목록
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useCalendarStore } from '../hooks/useCalendarStore';
import { CalendarEvent, EventCategory } from '../types';

const CATEGORY_COLORS: Record<EventCategory, string> = {
  hospital: '#FF6B6B',
  delivery: '#4ECDC4',
  appointment: '#45B7D1',
  payment: '#96CEB4',
  travel: '#FFEAA7',
  other: '#DFE6E9',
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  hospital: '🏥 병원',
  delivery: '📦 택배',
  appointment: '📋 예약',
  payment: '💳 결제',
  travel: '✈️ 여행',
  other: '📌 기타',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 메인 캘린더 화면 */
const CalendarScreen: React.FC = () => {
  const { events, selectedDate, setSelectedDate, currentUser, partner } = useCalendarStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  /** 해당 월의 날짜 배열 생성 */
  const getDaysInMonth = useCallback(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    // 앞쪽 빈칸
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [year, month]);

  /** 특정 날짜의 일정 조회 */
  const getEventsForDate = useCallback(
    (dateStr: string): CalendarEvent[] => {
      return events.filter((e) => e.startDate.startsWith(dateStr));
    },
    [events],
  );

  /** 날짜 선택 */
  const handleDateSelect = (day: number) => {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  /** 이전 월 */
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  /** 다음 월 */
  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  /** 선택된 날짜의 일정 목록 */
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const days = getDaysInMonth();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더: 파트너 연결 상태 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>우리 캘린더</Text>
        {partner ? (
          <Text style={styles.partnerStatus}>
            {partner.displayName}님과 공유 중
          </Text>
        ) : (
          <TouchableOpacity style={styles.inviteButton}>
            <Text style={styles.inviteButtonText}>파트너 초대</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 월 네비게이션 */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {year}년 {month + 1}월
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day, idx) => (
          <Text
            key={day}
            style={[
              styles.weekdayText,
              idx === 0 && styles.sundayText,
              idx === 6 && styles.saturdayText,
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* 캘린더 그리드 */}
      <View style={styles.calendarGrid}>
        {days.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const dayEvents = getEventsForDate(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === new Date().toISOString().slice(0, 10);
          const dayOfWeek = new Date(year, month, day).getDay();

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                isSelected && styles.selectedDay,
                isToday && styles.todayCell,
              ]}
              onPress={() => handleDateSelect(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  dayOfWeek === 0 && styles.sundayText,
                  dayOfWeek === 6 && styles.saturdayText,
                  isSelected && styles.selectedDayText,
                ]}
              >
                {day}
              </Text>
              {/* 일정 도트 표시 */}
              <View style={styles.dotContainer}>
                {dayEvents.slice(0, 3).map((event) => (
                  <View
                    key={event.id}
                    style={[styles.dot, { backgroundColor: CATEGORY_COLORS[event.category] }]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 선택된 날짜의 일정 목록 */}
      {selectedDate && (
        <View style={styles.eventListContainer}>
          <Text style={styles.eventListTitle}>
            {selectedDate.replace(/-/g, '.')} 일정
          </Text>
          {selectedDateEvents.length === 0 ? (
            <Text style={styles.noEventsText}>등록된 일정이 없습니다</Text>
          ) : (
            <FlatList
              data={selectedDateEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <EventCard event={item} />}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

/** 일정 카드 컴포넌트 */
const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const startTime = event.startDate.includes('T')
    ? event.startDate.split('T')[1]?.slice(0, 5)
    : null;

  return (
    <View style={[styles.eventCard, { borderLeftColor: CATEGORY_COLORS[event.category] }]}>
      <View style={styles.eventCardHeader}>
        <Text style={styles.eventCategory}>{CATEGORY_LABELS[event.category]}</Text>
        {event.sourceType !== 'manual' && (
          <Text style={styles.autoTag}>자동감지</Text>
        )}
      </View>
      <Text style={styles.eventTitle}>{event.title}</Text>
      {startTime && <Text style={styles.eventTime}>{startTime}</Text>}
      {event.location && <Text style={styles.eventLocation}>{event.location}</Text>}
      <Text style={styles.eventCreator}>
        {event.createdBy === 'me' ? '내가 추가' : '파트너가 추가'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
  },
  partnerStatus: {
    fontSize: 13,
    color: '#4A90D9',
    fontWeight: '500',
  },
  inviteButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 20,
    color: '#636E72',
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  sundayText: {
    color: '#FF6B6B',
  },
  saturdayText: {
    color: '#45B7D1',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  selectedDay: {
    backgroundColor: '#4A90D9',
    borderRadius: 20,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#4A90D9',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  dotContainer: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  eventListContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  eventListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 10,
  },
  noEventsText: {
    fontSize: 14,
    color: '#B2BEC3',
    textAlign: 'center',
    marginTop: 20,
  },
  eventCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: 12,
    color: '#636E72',
  },
  autoTag: {
    fontSize: 10,
    color: '#4A90D9',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 13,
    color: '#636E72',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 13,
    color: '#636E72',
    marginBottom: 2,
  },
  eventCreator: {
    fontSize: 11,
    color: '#B2BEC3',
    marginTop: 4,
  },
});

export default CalendarScreen;
