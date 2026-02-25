// ============================================
// 카카오톡 메시지 리더
// Android Notification Listener를 활용하여
// 카카오톡 알림에서 일정 정보를 추출합니다.
// ============================================

import { ParsedSchedule } from '../types';
import { MessageParser } from './MessageParser';

export type OnKakaoScheduleDetected = (schedule: ParsedSchedule) => void;

/**
 * 카카오톡 메시지를 읽는 서비스.
 *
 * Android: NotificationListenerService를 사용하여
 *          카카오톡 알림의 내용을 캡처합니다.
 * iOS: 직접 접근 불가 → 사용자가 메시지를 공유해야 합니다.
 */
export class KakaoMessageReader {
  private parser: MessageParser;
  private callback: OnKakaoScheduleDetected | null = null;
  private isActive = false;
  private processedMessageIds: Set<string> = new Set();

  constructor() {
    this.parser = new MessageParser();
  }

  /** 카카오톡 알림 모니터링 시작 */
  async startMonitoring(onScheduleDetected: OnKakaoScheduleDetected): Promise<void> {
    if (this.isActive) return;

    this.callback = onScheduleDetected;
    this.isActive = true;

    // Android NotificationListenerService 등록
    await this.registerNotificationListener();
  }

  /** 모니터링 중지 */
  stopMonitoring(): void {
    this.isActive = false;
    this.callback = null;
  }

  /**
   * 카카오톡 알림 수신 시 호출
   * (네이티브 NotificationListenerService에서 브릿지를 통해 호출)
   */
  handleNotification(packageName: string, title: string, text: string, messageId: string): void {
    // 카카오톡 패키지 확인
    if (packageName !== 'com.kakao.talk') return;
    if (!this.isActive || !this.callback) return;

    // 중복 메시지 방지
    if (this.processedMessageIds.has(messageId)) return;
    this.processedMessageIds.add(messageId);

    // 오래된 메시지 ID 정리 (메모리 관리)
    if (this.processedMessageIds.size > 1000) {
      const ids = Array.from(this.processedMessageIds);
      this.processedMessageIds = new Set(ids.slice(-500));
    }

    const result = this.parser.parse(text);
    if (result && result.confidence >= 0.3) {
      this.callback(result);
    }
  }

  /**
   * 사용자가 직접 공유한 카카오톡 메시지를 처리
   * (iOS에서는 이 방식만 사용 가능)
   */
  parseSharedMessage(message: string): ParsedSchedule | null {
    return this.parser.parse(message);
  }

  /** NotificationListener 권한 확인 */
  async checkPermission(): Promise<boolean> {
    // 실제 구현에서는 NotificationListenerService 권한 확인
    // Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
    return false;
  }

  /** NotificationListener 권한 요청 (설정 화면으로 이동) */
  async requestPermission(): Promise<void> {
    // 실제 구현에서는 ACTION_NOTIFICATION_LISTENER_SETTINGS 인텐트 호출
    console.log('[KakaoReader] Requesting notification listener permission');
  }

  private async registerNotificationListener(): Promise<void> {
    // Android NotificationListenerService 등록
    console.log('[KakaoReader] Notification listener registered');
  }
}

export default KakaoMessageReader;
