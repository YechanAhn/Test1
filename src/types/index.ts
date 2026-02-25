// ============================================
// 부부 공유 캘린더 앱 - 타입 정의
// ============================================

/** 일정 카테고리 */
export type EventCategory =
  | 'hospital'    // 병원 예약
  | 'delivery'    // 택배/배송
  | 'appointment' // 일반 예약 (미용실, 식당 등)
  | 'payment'     // 결제/납부
  | 'travel'      // 여행/교통
  | 'other';      // 기타

/** 캘린더 일정 */
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;       // ISO 8601
  endDate?: string;        // ISO 8601
  category: EventCategory;
  location?: string;
  isAllDay: boolean;
  createdBy: string;       // userId
  calendarId: string;
  sourceType: 'sms' | 'kakao' | 'manual';
  sourceMessage?: string;  // 원본 메시지
  isConfirmed: boolean;    // 사용자 확인 여부
  createdAt: string;
  updatedAt: string;
}

/** 사용자 정보 */
export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  partnerId?: string;      // 연결된 파트너 userId
  calendarIds: string[];
  createdAt: string;
}

/** 공유 캘린더 */
export interface SharedCalendar {
  id: string;
  name: string;
  ownerIds: string[];      // 부부 두 명의 userId
  inviteCode: string;      // 파트너 초대 코드
  color: string;
  createdAt: string;
}

/** 메시지 파싱 결과 */
export interface ParsedSchedule {
  title: string;
  date: string;            // ISO 8601
  time?: string;           // HH:mm
  location?: string;
  category: EventCategory;
  confidence: number;      // 0~1 파싱 정확도
  originalMessage: string;
}

/** 알림 설정 */
export interface NotificationSettings {
  beforeMinutes: number[];  // [10, 30, 60] 등
  partnerNotify: boolean;   // 파트너에게도 알림
  autoConfirm: boolean;     // 자동 확인 (confidence 높을 때)
}

/** 메시지 파싱에 사용되는 패턴 */
export interface MessagePattern {
  category: EventCategory;
  keywords: string[];
  datePatterns: RegExp[];
  timePatterns: RegExp[];
  locationPatterns: RegExp[];
}
