// ============================================
// 전역 상태 관리 (Zustand)
// 캘린더, 이벤트, 사용자 상태
// ============================================

import { create } from 'zustand';
import { CalendarEvent, SharedCalendar, User, NotificationSettings } from '../types';

interface CalendarState {
  // 사용자
  currentUser: User | null;
  partner: User | null;

  // 캘린더
  sharedCalendar: SharedCalendar | null;
  events: CalendarEvent[];
  selectedDate: string | null;

  // 일정 확인 대기 목록
  pendingEvents: CalendarEvent[];

  // 설정
  notificationSettings: NotificationSettings;

  // UI 상태
  isLoading: boolean;

  // 액션
  setCurrentUser: (user: User | null) => void;
  setPartner: (partner: User | null) => void;
  setSharedCalendar: (calendar: SharedCalendar | null) => void;
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  removeEvent: (eventId: string) => void;
  setSelectedDate: (date: string | null) => void;
  addPendingEvent: (event: CalendarEvent) => void;
  confirmPendingEvent: (eventId: string) => void;
  dismissPendingEvent: (eventId: string) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  // 초기값
  currentUser: null,
  partner: null,
  sharedCalendar: null,
  events: [],
  selectedDate: null,
  pendingEvents: [],
  notificationSettings: {
    beforeMinutes: [10, 30],
    partnerNotify: true,
    autoConfirm: false,
  },
  isLoading: false,

  // 액션
  setCurrentUser: (user) => set({ currentUser: user }),
  setPartner: (partner) => set({ partner }),
  setSharedCalendar: (calendar) => set({ sharedCalendar: calendar }),

  setEvents: (events) => set({ events }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  updateEvent: (eventId, updates) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      ),
    })),

  removeEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
    })),

  setSelectedDate: (date) => set({ selectedDate: date }),

  addPendingEvent: (event) =>
    set((state) => ({ pendingEvents: [...state.pendingEvents, event] })),

  confirmPendingEvent: (eventId) =>
    set((state) => {
      const event = state.pendingEvents.find((e) => e.id === eventId);
      if (!event) return state;
      return {
        pendingEvents: state.pendingEvents.filter((e) => e.id !== eventId),
        events: [...state.events, { ...event, isConfirmed: true }],
      };
    }),

  dismissPendingEvent: (eventId) =>
    set((state) => ({
      pendingEvents: state.pendingEvents.filter((e) => e.id !== eventId),
    })),

  setNotificationSettings: (settings) =>
    set((state) => ({
      notificationSettings: { ...state.notificationSettings, ...settings },
    })),

  setIsLoading: (loading) => set({ isLoading: loading }),
}));

export default useCalendarStore;
