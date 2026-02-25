// ============================================
// 알림 서비스
// 로컬 알림 + FCM 푸시 알림
// ============================================

import { CalendarEvent, NotificationSettings } from '../types';

/**
 * 일정 알림을 관리합니다.
 * - 로컬 알림: 본인 일정 리마인더
 * - FCM 푸시 알림: 파트너에게 새 일정 알림
 */
export class NotificationService {
  private settings: NotificationSettings = {
    beforeMinutes: [10, 30],
    partnerNotify: true,
    autoConfirm: false,
  };

  /** 알림 권한 요청 */
  async requestPermission(): Promise<boolean> {
    // Android: 자동 허용 (Android 13+ 에서는 POST_NOTIFICATIONS 권한 필요)
    // iOS: UNUserNotificationCenter.requestAuthorization
    console.log('[NotificationService] Requesting permission');
    return true;
  }

  /** 일정에 대한 로컬 알림을 예약합니다. */
  async scheduleEventReminder(event: CalendarEvent): Promise<void> {
    const eventDate = new Date(event.startDate);

    for (const minutesBefore of this.settings.beforeMinutes) {
      const notifyDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);

      // 이미 지난 시간이면 스킵
      if (notifyDate.getTime() < Date.now()) continue;

      const minuteLabel = minutesBefore >= 60
        ? `${Math.floor(minutesBefore / 60)}시간`
        : `${minutesBefore}분`;

      // PushNotification.localNotificationSchedule({
      //   id: `${event.id}-${minutesBefore}`,
      //   title: `📅 ${event.title}`,
      //   message: `${minuteLabel} 후 일정이 있습니다.${event.location ? ` 장소: ${event.location}` : ''}`,
      //   date: notifyDate,
      //   channelId: 'calendar-reminders',
      //   smallIcon: 'ic_notification',
      // });

      console.log(`[NotificationService] Scheduled reminder: ${event.title} at ${notifyDate.toISOString()}`);
    }
  }

  /** 파트너에게 새 일정 추가 알림 (FCM) */
  async notifyPartnerNewEvent(event: CalendarEvent, partnerFCMToken: string): Promise<void> {
    if (!this.settings.partnerNotify) return;

    // Firebase Cloud Messaging을 통한 푸시 알림
    // 실제로는 Cloud Functions에서 처리하는 것이 보안상 좋습니다.
    // const message = {
    //   to: partnerFCMToken,
    //   notification: {
    //     title: '새 일정이 추가되었어요 💑',
    //     body: `${event.title} - ${event.startDate}`,
    //   },
    //   data: {
    //     eventId: event.id,
    //     type: 'new_event',
    //   },
    // };

    console.log(`[NotificationService] Partner notified about: ${event.title}`);
  }

  /** 자동 감지된 일정 확인 요청 알림 */
  async notifyPendingEvent(event: CalendarEvent): Promise<void> {
    // PushNotification.localNotification({
    //   id: `pending-${event.id}`,
    //   title: '📋 새 일정이 감지되었어요',
    //   message: `"${event.title}" 일정을 캘린더에 추가할까요?`,
    //   channelId: 'schedule-detection',
    //   actions: ['추가', '무시'],
    //   smallIcon: 'ic_notification',
    // });

    console.log(`[NotificationService] Pending event notification: ${event.title}`);
  }

  /** 알림 채널 초기화 (Android) */
  async initializeChannels(): Promise<void> {
    // PushNotification.createChannel({
    //   channelId: 'calendar-reminders',
    //   channelName: '일정 리마인더',
    //   channelDescription: '캘린더 일정 알림',
    //   importance: 4, // HIGH
    // });
    //
    // PushNotification.createChannel({
    //   channelId: 'schedule-detection',
    //   channelName: '일정 자동 감지',
    //   channelDescription: '메시지에서 감지된 일정 알림',
    //   importance: 3, // DEFAULT
    // });

    console.log('[NotificationService] Notification channels initialized');
  }

  /** 일정 알림 취소 */
  async cancelEventReminder(eventId: string): Promise<void> {
    for (const minutes of this.settings.beforeMinutes) {
      // PushNotification.cancelLocalNotification(`${eventId}-${minutes}`);
    }
    console.log(`[NotificationService] Cancelled reminders for event: ${eventId}`);
  }

  /** 설정 업데이트 */
  updateSettings(settings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }
}

export default NotificationService;
