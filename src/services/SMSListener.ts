// ============================================
// SMS 수신 리스너
// Android SMS 수신을 감지하고 메시지를 파싱합니다.
// ============================================

import { ParsedSchedule } from '../types';
import { MessageParser } from './MessageParser';

export type OnScheduleDetected = (schedule: ParsedSchedule) => void;

/**
 * SMS 메시지를 실시간으로 수신하고,
 * 일정 관련 메시지를 감지하여 콜백을 호출합니다.
 *
 * Android: SmsRetriever API 사용
 * iOS: 직접 SMS 접근 불가 → 알림(Notification) 기반 접근 필요
 */
export class SMSListener {
  private parser: MessageParser;
  private callback: OnScheduleDetected | null = null;
  private isListening = false;

  constructor() {
    this.parser = new MessageParser();
  }

  /** SMS 수신 리스닝 시작 */
  async startListening(onScheduleDetected: OnScheduleDetected): Promise<void> {
    if (this.isListening) return;

    this.callback = onScheduleDetected;
    this.isListening = true;

    try {
      // React Native에서는 네이티브 모듈을 통해 SMS를 수신합니다.
      // Android: react-native-sms-retriever 또는 react-native-get-sms-android 사용
      // 여기서는 인터페이스만 정의합니다.
      await this.registerNativeSMSListener();
    } catch (error) {
      this.isListening = false;
      throw error;
    }
  }

  /** SMS 수신 리스닝 중지 */
  stopListening(): void {
    this.isListening = false;
    this.callback = null;
    this.unregisterNativeSMSListener();
  }

  /** 수신된 SMS 메시지를 처리 (네이티브 모듈에서 호출) */
  handleIncomingSMS(sender: string, body: string): void {
    if (!this.isListening || !this.callback) return;

    const result = this.parser.parse(body);
    if (result && result.confidence >= 0.3) {
      this.callback(result);
    }
  }

  /** 기존 SMS 목록에서 일정을 일괄 스캔 */
  async scanExistingSMS(messages: Array<{ sender: string; body: string; date: string }>): Promise<ParsedSchedule[]> {
    const schedules: ParsedSchedule[] = [];

    for (const msg of messages) {
      const result = this.parser.parse(msg.body);
      if (result && result.confidence >= 0.3) {
        schedules.push(result);
      }
    }

    // 날짜순 정렬
    schedules.sort((a, b) => a.date.localeCompare(b.date));
    return schedules;
  }

  /** 리스닝 상태 확인 */
  getIsListening(): boolean {
    return this.isListening;
  }

  // --- 네이티브 모듈 연동 (플랫폼별 구현 필요) ---

  private async registerNativeSMSListener(): Promise<void> {
    // Android: SmsRetriever API를 통한 SMS 수신 등록
    // 실제 구현에서는 react-native-sms-retriever의 startSmsRetriever() 호출
    // 또는 BroadcastReceiver를 통한 SMS_RECEIVED 인텐트 처리
    console.log('[SMSListener] Native SMS listener registered');
  }

  private unregisterNativeSMSListener(): void {
    // 네이티브 SMS 리스너 해제
    console.log('[SMSListener] Native SMS listener unregistered');
  }
}

export default SMSListener;
