// ============================================
// 메시지 파싱 엔진
// SMS/카카오톡 메시지에서 일정 정보를 자동 추출
// ============================================

import { ParsedSchedule, EventCategory, MessagePattern } from '../types';

/** 한국어 날짜/시간 파싱을 위한 메시지 파서 */
export class MessageParser {
  private patterns: MessagePattern[];

  constructor() {
    this.patterns = this.initializePatterns();
  }

  /**
   * 메시지를 분석하여 일정 정보를 추출합니다.
   * @param message - SMS 또는 카카오톡 메시지 원문
   * @returns 파싱된 일정 정보 또는 null (일정이 아닌 경우)
   */
  parse(message: string): ParsedSchedule | null {
    const category = this.detectCategory(message);
    if (!category) return null;

    const date = this.extractDate(message);
    if (!date) return null;

    const time = this.extractTime(message);
    const location = this.extractLocation(message);
    const title = this.generateTitle(message, category);
    const confidence = this.calculateConfidence(message, category, date, time);

    return {
      title,
      date,
      time: time || undefined,
      location: location || undefined,
      category,
      confidence,
      originalMessage: message,
    };
  }

  /** 메시지 카테고리를 감지 */
  private detectCategory(message: string): EventCategory | null {
    const categoryScores: Record<EventCategory, number> = {
      hospital: 0,
      delivery: 0,
      appointment: 0,
      payment: 0,
      travel: 0,
      other: 0,
    };

    for (const pattern of this.patterns) {
      const score = pattern.keywords.reduce((acc, keyword) => {
        return acc + (message.includes(keyword) ? 1 : 0);
      }, 0);
      categoryScores[pattern.category] += score;
    }

    let maxCategory: EventCategory | null = null;
    let maxScore = 0;

    for (const [category, score] of Object.entries(categoryScores)) {
      if (score > maxScore) {
        maxScore = score;
        maxCategory = category as EventCategory;
      }
    }

    return maxScore > 0 ? maxCategory : null;
  }

  /** 날짜 추출 (한국어 다양한 형식 지원) */
  extractDate(message: string): string | null {
    const now = new Date();
    const currentYear = now.getFullYear();

    // "2024년 3월 15일" 또는 "2024.03.15" 또는 "2024-03-15"
    const fullDatePatterns = [
      /(\d{4})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?/,
      /(\d{4})(\d{2})(\d{2})/,  // 20240315
    ];

    for (const pattern of fullDatePatterns) {
      const match = message.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        if (this.isValidDate(year, month, day)) {
          return this.formatDate(year, month, day);
        }
      }
    }

    // "3월 15일" 또는 "03/15" (연도 없음 → 올해)
    const shortDatePatterns = [
      /(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?/,
    ];

    for (const pattern of shortDatePatterns) {
      const match = message.match(pattern);
      if (match) {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        if (this.isValidDate(currentYear, month, day)) {
          return this.formatDate(currentYear, month, day);
        }
      }
    }

    // "내일", "모레", "다음주" 등 상대 날짜
    const relativeDateResult = this.parseRelativeDate(message, now);
    if (relativeDateResult) return relativeDateResult;

    // "이번 주 금요일", "다음 주 월요일" 등
    const weekdayResult = this.parseWeekdayReference(message, now);
    if (weekdayResult) return weekdayResult;

    return null;
  }

  /** 시간 추출 */
  extractTime(message: string): string | null {
    // "오후 3시 30분" 또는 "오전 10시"
    const koreanTimePattern = /(오전|오후)\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/;
    const match1 = message.match(koreanTimePattern);
    if (match1) {
      let hour = parseInt(match1[2]);
      const minute = match1[3] ? parseInt(match1[3]) : 0;
      if (match1[1] === '오후' && hour !== 12) hour += 12;
      if (match1[1] === '오전' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    // "15:30" 또는 "3:30"
    const timePattern = /(\d{1,2}):(\d{2})/;
    const match2 = message.match(timePattern);
    if (match2) {
      const hour = parseInt(match2[1]);
      const minute = parseInt(match2[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }

    // "3시", "15시" (분 없음)
    const hourOnlyPattern = /(\d{1,2})\s*시/;
    const match3 = message.match(hourOnlyPattern);
    if (match3) {
      const hour = parseInt(match3[1]);
      if (hour >= 0 && hour <= 23) {
        return `${hour.toString().padStart(2, '0')}:00`;
      }
    }

    return null;
  }

  /** 장소 추출 */
  private extractLocation(message: string): string | null {
    // "OO병원", "OO의원", "OO센터" 등
    const locationPatterns = [
      /([가-힣A-Za-z0-9]+(?:병원|의원|클리닉|센터|치과|한의원|약국))/,
      /([가-힣A-Za-z0-9]+(?:미용실|헤어|네일|뷰티))/,
      /([가-힣A-Za-z0-9]+(?:식당|레스토랑|카페|맛집))/,
      /([가-힣A-Za-z0-9]+(?:호텔|펜션|리조트|숙소))/,
      /([가-힣A-Za-z0-9]+(?:공항|터미널|역))/,
      // "장소: OOO" 형태
      /장소\s*[:\-]\s*([가-힣A-Za-z0-9\s]+)/,
      // "위치: OOO" 형태
      /위치\s*[:\-]\s*([가-힣A-Za-z0-9\s]+)/,
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /** 메시지에서 일정 제목 생성 */
  private generateTitle(message: string, category: EventCategory): string {
    const categoryLabels: Record<EventCategory, string> = {
      hospital: '병원 예약',
      delivery: '택배 도착',
      appointment: '예약',
      payment: '납부/결제',
      travel: '여행/이동',
      other: '일정',
    };

    const location = this.extractLocation(message);
    const baseLabel = categoryLabels[category];

    if (location) {
      return `${location} ${baseLabel}`;
    }

    // 메시지에서 핵심 키워드를 추출하여 제목 생성
    const titleKeywords = this.extractTitleKeywords(message, category);
    if (titleKeywords) {
      return titleKeywords;
    }

    return baseLabel;
  }

  /** 제목용 키워드 추출 */
  private extractTitleKeywords(message: string, category: EventCategory): string | null {
    switch (category) {
      case 'hospital': {
        const deptMatch = message.match(/(내과|외과|피부과|안과|이비인후과|정형외과|산부인과|소아과|치과|한의원|정신건강의학과)/);
        const location = this.extractLocation(message);
        if (deptMatch && location) return `${location} ${deptMatch[1]} 예약`;
        if (location) return `${location} 예약`;
        if (deptMatch) return `${deptMatch[1]} 예약`;
        return null;
      }
      case 'delivery': {
        const itemMatch = message.match(/\[([^\]]+)\]/);
        if (itemMatch) return `택배: ${itemMatch[1]}`;
        return null;
      }
      case 'payment': {
        const amountMatch = message.match(/([\d,]+)\s*원/);
        if (amountMatch) return `납부 ${amountMatch[1]}원`;
        return null;
      }
      default:
        return null;
    }
  }

  /** 상대 날짜 파싱 */
  private parseRelativeDate(message: string, now: Date): string | null {
    const today = new Date(now);

    if (message.includes('오늘')) {
      return this.dateToString(today);
    }
    if (message.includes('내일')) {
      today.setDate(today.getDate() + 1);
      return this.dateToString(today);
    }
    if (message.includes('모레') || message.includes('내일모레')) {
      today.setDate(today.getDate() + 2);
      return this.dateToString(today);
    }
    if (message.includes('글피')) {
      today.setDate(today.getDate() + 3);
      return this.dateToString(today);
    }

    // "N일 후" 또는 "N일 뒤"
    const daysLaterMatch = message.match(/(\d+)\s*일\s*(후|뒤)/);
    if (daysLaterMatch) {
      today.setDate(today.getDate() + parseInt(daysLaterMatch[1]));
      return this.dateToString(today);
    }

    return null;
  }

  /** 요일 기반 날짜 파싱 */
  private parseWeekdayReference(message: string, now: Date): string | null {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    const weekdayMatch = message.match(/(이번|다음|이번\s*주|다음\s*주)\s*(월|화|수|목|금|토|일)\s*요일/);
    if (!weekdayMatch) return null;

    const isNextWeek = weekdayMatch[1].includes('다음');
    const targetDay = weekdays.indexOf(weekdayMatch[2]);
    if (targetDay === -1) return null;

    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;

    if (isNextWeek) {
      daysToAdd += 7;
    } else if (daysToAdd <= 0) {
      daysToAdd += 7;
    }

    const target = new Date(now);
    target.setDate(target.getDate() + daysToAdd);
    return this.dateToString(target);
  }

  /** 날짜 유효성 검사 */
  private isValidDate(year: number, month: number, day: number): boolean {
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
  }

  /** 날짜를 ISO 문자열로 포맷 */
  private formatDate(year: number, month: number, day: number): string {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  /** Date 객체를 ISO 날짜 문자열로 변환 */
  private dateToString(date: Date): string {
    return this.formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  /** 파싱 신뢰도 계산 */
  private calculateConfidence(
    message: string,
    category: EventCategory,
    date: string,
    time: string | null,
  ): number {
    let confidence = 0;

    // 카테고리 키워드 매칭 점수
    const pattern = this.patterns.find(p => p.category === category);
    if (pattern) {
      const matchCount = pattern.keywords.filter(kw => message.includes(kw)).length;
      confidence += Math.min(matchCount * 0.15, 0.45);
    }

    // 날짜가 있으면 기본 점수
    if (date) confidence += 0.25;

    // 시간이 있으면 추가 점수
    if (time) confidence += 0.15;

    // 장소가 있으면 추가 점수
    if (this.extractLocation(message)) confidence += 0.15;

    return Math.min(confidence, 1.0);
  }

  /** 카테고리별 키워드 패턴 초기화 */
  private initializePatterns(): MessagePattern[] {
    return [
      {
        category: 'hospital',
        keywords: [
          '병원', '의원', '클리닉', '진료', '예약', '접수',
          '검진', '수술', '치과', '한의원', '약국', '처방',
          '내과', '외과', '피부과', '안과', '이비인후과',
          '정형외과', '산부인과', '소아과', '건강검진',
        ],
        datePatterns: [],
        timePatterns: [],
        locationPatterns: [],
      },
      {
        category: 'delivery',
        keywords: [
          '택배', '배송', '배달', '도착', '수령', '출고',
          '발송', '운송장', '송장', '쿠팡', 'CJ대한통운',
          '한진택배', '롯데택배', '우체국택배', '로젠택배',
        ],
        datePatterns: [],
        timePatterns: [],
        locationPatterns: [],
      },
      {
        category: 'appointment',
        keywords: [
          '예약', '미용실', '헤어', '네일', '뷰티', '식당',
          '레스토랑', '카페', '상담', '미팅', '면접', '방문',
        ],
        datePatterns: [],
        timePatterns: [],
        locationPatterns: [],
      },
      {
        category: 'payment',
        keywords: [
          '납부', '결제', '이체', '입금', '청구', '요금',
          '카드', '대출', '보험', '세금', '공과금', '월세',
          '관리비', '전기세', '수도세', '가스비',
        ],
        datePatterns: [],
        timePatterns: [],
        locationPatterns: [],
      },
      {
        category: 'travel',
        keywords: [
          '항공', '비행기', '기차', 'KTX', 'SRT', '버스',
          '호텔', '펜션', '리조트', '여행', '출발', '도착',
          '탑승', '체크인', '체크아웃', '공항', '터미널',
        ],
        datePatterns: [],
        timePatterns: [],
        locationPatterns: [],
      },
    ];
  }
}

export default MessageParser;
