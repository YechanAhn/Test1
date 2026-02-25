// ============================================
// 앱 루트 컴포넌트
// 초기화 및 메시지 리스너 설정
// ============================================

import React, { useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { SMSListener } from './services/SMSListener';
import { KakaoMessageReader } from './services/KakaoMessageReader';
import { NotificationService } from './services/NotificationService';
import { CalendarService } from './services/CalendarService';
import { useCalendarStore } from './hooks/useCalendarStore';
import { CalendarEvent, ParsedSchedule } from './types';

const smsListener = new SMSListener();
const kakaoReader = new KakaoMessageReader();
const notificationService = new NotificationService();
const calendarService = new CalendarService();

const App: React.FC = () => {
  const {
    currentUser,
    sharedCalendar,
    addPendingEvent,
    notificationSettings,
    setEvents,
  } = useCalendarStore();

  // 앱 초기화
  useEffect(() => {
    const init = async () => {
      await notificationService.initializeChannels();
      await notificationService.requestPermission();
    };
    init();
  }, []);

  // SMS 및 카카오톡 리스너 설정
  useEffect(() => {
    const handleScheduleDetected = async (parsed: ParsedSchedule) => {
      const event: CalendarEvent = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        title: parsed.title,
        description: parsed.originalMessage,
        startDate: parsed.time
          ? `${parsed.date}T${parsed.time}:00`
          : parsed.date,
        category: parsed.category,
        location: parsed.location,
        isAllDay: !parsed.time,
        createdBy: currentUser?.id || '',
        calendarId: sharedCalendar?.id || '',
        sourceType: 'sms',
        sourceMessage: parsed.originalMessage,
        isConfirmed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 높은 신뢰도 + 자동확인 설정이면 바로 캘린더에 추가
      if (parsed.confidence >= 0.7 && notificationSettings.autoConfirm) {
        await calendarService.addEvent(event);
      } else {
        // 확인 대기 목록에 추가
        addPendingEvent(event);
        await notificationService.notifyPendingEvent(event);
      }
    };

    smsListener.startListening(handleScheduleDetected);
    kakaoReader.startMonitoring((parsed) => {
      handleScheduleDetected(parsed);
    });

    return () => {
      smsListener.stopListening();
      kakaoReader.stopMonitoring();
    };
  }, [currentUser, sharedCalendar, notificationSettings.autoConfirm]);

  // Firestore 실시간 이벤트 구독
  useEffect(() => {
    if (!sharedCalendar) return;

    const unsubscribe = calendarService.subscribeToEvents(
      sharedCalendar.id,
      (events) => {
        setEvents(events);
      },
    );

    return unsubscribe;
  }, [sharedCalendar]);

  return <AppNavigator />;
};

export default App;
