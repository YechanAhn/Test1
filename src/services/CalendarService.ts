// ============================================
// Firebase Firestore 기반 캘린더 서비스
// 일정 CRUD 및 실시간 동기화
// ============================================

import { CalendarEvent, SharedCalendar, User } from '../types';
import { COLLECTIONS } from '../config/firebase';

/**
 * Firestore와 연동하여 캘린더 데이터를 관리합니다.
 * 부부 간 실시간 일정 공유가 핵심 기능입니다.
 */
export class CalendarService {
  /**
   * 공유 캘린더를 생성합니다.
   * 부부 중 한 명이 생성하고, 초대 코드를 통해 파트너를 연결합니다.
   */
  async createSharedCalendar(userId: string, calendarName: string): Promise<SharedCalendar> {
    const inviteCode = this.generateInviteCode();
    const calendar: SharedCalendar = {
      id: this.generateId(),
      name: calendarName,
      ownerIds: [userId],
      inviteCode,
      color: '#4A90D9',
      createdAt: new Date().toISOString(),
    };

    // Firestore에 캘린더 문서 생성
    // await firestore().collection(COLLECTIONS.CALENDARS).doc(calendar.id).set(calendar);

    // 사용자 문서에 캘린더 ID 추가
    // await firestore().collection(COLLECTIONS.USERS).doc(userId).update({
    //   calendarIds: firestore.FieldValue.arrayUnion(calendar.id)
    // });

    console.log(`[CalendarService] Created calendar: ${calendar.id}, invite code: ${inviteCode}`);
    return calendar;
  }

  /**
   * 초대 코드를 사용하여 파트너를 캘린더에 연결합니다.
   */
  async joinCalendarByInviteCode(userId: string, inviteCode: string): Promise<SharedCalendar | null> {
    // Firestore에서 초대 코드로 캘린더 조회
    // const snapshot = await firestore()
    //   .collection(COLLECTIONS.CALENDARS)
    //   .where('inviteCode', '==', inviteCode)
    //   .get();
    //
    // if (snapshot.empty) return null;
    //
    // const calendar = snapshot.docs[0].data() as SharedCalendar;
    // 파트너 추가
    // await firestore().collection(COLLECTIONS.CALENDARS).doc(calendar.id).update({
    //   ownerIds: firestore.FieldValue.arrayUnion(userId)
    // });

    console.log(`[CalendarService] User ${userId} joined calendar with code: ${inviteCode}`);
    return null; // 실제 구현에서는 calendar 객체 반환
  }

  /**
   * 일정을 캘린더에 추가합니다.
   * Firestore에 저장하면 실시간 리스너를 통해 파트너에게도 즉시 반영됩니다.
   */
  async addEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const newEvent: CalendarEvent = {
      ...event,
      id: event.id || this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // await firestore().collection(COLLECTIONS.EVENTS).doc(newEvent.id).set(newEvent);

    console.log(`[CalendarService] Added event: ${newEvent.title} on ${newEvent.startDate}`);
    return newEvent;
  }

  /** 일정 수정 */
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // await firestore().collection(COLLECTIONS.EVENTS).doc(eventId).update(updateData);
    console.log(`[CalendarService] Updated event: ${eventId}`);
  }

  /** 일정 삭제 */
  async deleteEvent(eventId: string): Promise<void> {
    // await firestore().collection(COLLECTIONS.EVENTS).doc(eventId).delete();
    console.log(`[CalendarService] Deleted event: ${eventId}`);
  }

  /**
   * 특정 캘린더의 일정을 실시간으로 구독합니다.
   * Firestore onSnapshot을 사용하여 변경사항을 실시간 수신합니다.
   */
  subscribeToEvents(
    calendarId: string,
    onEventsUpdate: (events: CalendarEvent[]) => void,
  ): () => void {
    // const unsubscribe = firestore()
    //   .collection(COLLECTIONS.EVENTS)
    //   .where('calendarId', '==', calendarId)
    //   .orderBy('startDate', 'asc')
    //   .onSnapshot((snapshot) => {
    //     const events = snapshot.docs.map(doc => doc.data() as CalendarEvent);
    //     onEventsUpdate(events);
    //   });

    console.log(`[CalendarService] Subscribed to events for calendar: ${calendarId}`);
    return () => {
      console.log(`[CalendarService] Unsubscribed from calendar: ${calendarId}`);
    };
  }

  /** 특정 월의 일정 조회 */
  async getEventsByMonth(calendarId: string, year: number, month: number): Promise<CalendarEvent[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${endMonth.toString().padStart(2, '0')}-01`;

    // const snapshot = await firestore()
    //   .collection(COLLECTIONS.EVENTS)
    //   .where('calendarId', '==', calendarId)
    //   .where('startDate', '>=', startDate)
    //   .where('startDate', '<', endDate)
    //   .orderBy('startDate', 'asc')
    //   .get();
    //
    // return snapshot.docs.map(doc => doc.data() as CalendarEvent);

    console.log(`[CalendarService] Fetching events for ${year}-${month}`);
    return [];
  }

  /** 6자리 초대 코드 생성 */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /** 고유 ID 생성 */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export default CalendarService;
