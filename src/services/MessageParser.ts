// ============================================
// 메시지 파싱 엔진 (강화 버전)
// SMS/카카오톡 메시지에서 일정 정보를 자동 추출
//
// 개선 사항:
// - 광고/스팸 사전 필터링
// - 가중치 기반 카테고리 감지 (단순 카운트 → 키워드 중요도 반영)
// - 날짜 패턴 확장 (비격식 표현, 구어체 대응)
// - 장소 패턴 확장 (주소 형태, 층/호 표현)
// - 메시지 구조 분석 기반 신뢰도 (예약확인 문구 존재 여부 등)
// ============================================

import { ParsedSchedule, EventCategory, MessagePattern } from '../types';

/** 키워드와 가중치를 함께 정의 */
interface WeightedKeyword {
  word: string;
  weight: number; // 1 = 일반, 2 = 강력 지표, 0.5 = 약한 지표
}

export class MessageParser {
  private patterns: MessagePattern[];
  private weightedPatterns: Map<EventCategory, WeightedKeyword[]>;
  private spamPatterns: RegExp[];

  constructor() {
    this.patterns = this.initializePatterns();
    this.weightedPatterns = this.initializeWeightedPatterns();
    this.spamPatterns = this.initializeSpamPatterns();
  }

  /**
   * 메시지를 분석하여 일정 정보를 추출합니다.
   * 1. 스팸/광고 필터링
   * 2. 카테고리 감지 (가중치 기반)
   * 3. 날짜/시간/장소 추출
   * 4. 구조적 신뢰도 계산
   */
  parse(message: string): ParsedSchedule | null {
    if (this.isSpamOrNonSchedule(message)) return null;

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

  // =========================================================
  // 1단계: 스팸/광고 필터링
  // =========================================================

  /** 광고, 인증번호, 스팸 등 비일정 메시지를 걸러냅니다 */
  isSpamOrNonSchedule(message: string): boolean {
    if (message.length < 10) return true;
    for (const pattern of this.spamPatterns) {
      if (pattern.test(message)) return true;
    }
    return false;
  }

  private initializeSpamPatterns(): RegExp[] {
    return [
      // 인증번호/OTP
      /인증\s*번호/,
      /인증\s*코드/,
      /본인\s*확인/,
      /verification/i,
      /\bOTP\b/,

      // 광고/마케팅
      /\[Web\s*발신\]/,
      /수신\s*거부/,
      /광고\s*문자/,
      /할인\s*쿠폰/,
      /특가\s*세일/,
      /포인트\s*적립/,
      /무료\s*체험/,
      /이벤트\s*당첨/,
      /경품/,

      // 금융 알림 (일정이 아닌 것)
      /승인\s*금액/,
      /출금\s*\d/,
      /입금\s*\d/,
      /잔액/,

      // 로그인/보안
      /로그인\s*알림/,
      /비밀번호\s*변경/,
      /새\s*기기/,
    ];
  }

  // =========================================================
  // 2단계: 가중치 기반 카테고리 감지
  // =========================================================

  /** 메시지 카테고리를 감지 (가중치 기반 점수제) */
  detectCategory(message: string): EventCategory | null {
    const scores: Record<EventCategory, number> = {
      hospital: 0,
      delivery: 0,
      appointment: 0,
      payment: 0,
      travel: 0,
      other: 0,
    };

    for (const [category, keywords] of this.weightedPatterns.entries()) {
      for (const { word, weight } of keywords) {
        if (message.includes(word)) {
          scores[category] += weight;
        }
      }
    }

    let best: EventCategory | null = null;
    let bestScore = 0;

    for (const [category, score] of Object.entries(scores) as [EventCategory, number][]) {
      if (score > bestScore) {
        bestScore = score;
        best = category;
      }
    }

    // 최소 가중치 합계 1.5 이상이어야 카테고리로 인정
    return bestScore >= 1.5 ? best : null;
  }

  private initializeWeightedPatterns(): Map<EventCategory, WeightedKeyword[]> {
    const map = new Map<EventCategory, WeightedKeyword[]>();

    map.set('hospital', [
      { word: '진료', weight: 2 },
      { word: '검진', weight: 2 },
      { word: '건강검진', weight: 2 },
      { word: '수술', weight: 2 },
      { word: '처방', weight: 2 },
      { word: '접수', weight: 1.5 },
      { word: '병원', weight: 1.5 },
      { word: '의원', weight: 1.5 },
      { word: '클리닉', weight: 1.5 },
      { word: '치과', weight: 1.5 },
      { word: '한의원', weight: 1.5 },
      { word: '약국', weight: 1 },
      { word: '내과', weight: 1 },
      { word: '외과', weight: 1 },
      { word: '피부과', weight: 1 },
      { word: '안과', weight: 1 },
      { word: '이비인후과', weight: 1 },
      { word: '정형외과', weight: 1 },
      { word: '산부인과', weight: 1 },
      { word: '소아과', weight: 1 },
      { word: '비뇨기과', weight: 1 },
      { word: '신경과', weight: 1 },
      { word: '정신건강의학과', weight: 1 },
      { word: '재활의학과', weight: 1 },
      { word: '예약', weight: 0.5 },
      { word: '내원', weight: 1 },
      { word: '방문', weight: 0.3 },
    ]);

    map.set('delivery', [
      { word: '택배', weight: 2 },
      { word: '배송', weight: 1.5 },
      { word: '운송장', weight: 2 },
      { word: '송장', weight: 2 },
      { word: '출고', weight: 1.5 },
      { word: '발송', weight: 1.5 },
      { word: '수령', weight: 1 },
      { word: '배달', weight: 1 },
      { word: 'CJ대한통운', weight: 2 },
      { word: '한진택배', weight: 2 },
      { word: '롯데택배', weight: 2 },
      { word: '우체국택배', weight: 2 },
      { word: '로젠택배', weight: 2 },
      { word: '쿠팡', weight: 1 },
      { word: '마켓컬리', weight: 1 },
      { word: '도착', weight: 0.5 },
      { word: '배송완료', weight: 1.5 },
      { word: '배송중', weight: 1.5 },
    ]);

    map.set('appointment', [
      { word: '예약', weight: 1 },
      { word: '예약 확인', weight: 1.5 },
      { word: '예약확인', weight: 1.5 },
      { word: '예약이 확정', weight: 2 },
      { word: '예약 완료', weight: 2 },
      { word: '미용실', weight: 1.5 },
      { word: '헤어', weight: 1 },
      { word: '네일', weight: 1.5 },
      { word: '뷰티', weight: 1 },
      { word: '스파', weight: 1 },
      { word: '마사지', weight: 1 },
      { word: '필라테스', weight: 1 },
      { word: '요가', weight: 1 },
      { word: '식당', weight: 1 },
      { word: '레스토랑', weight: 1.5 },
      { word: '카페', weight: 0.5 },
      { word: '상담', weight: 1 },
      { word: '미팅', weight: 1 },
      { word: '면접', weight: 1.5 },
      { word: '웨딩', weight: 1.5 },
      { word: '스튜디오', weight: 1 },
      { word: '방문', weight: 0.5 },
      { word: '담당', weight: 0.5 },
      { word: '인원', weight: 0.5 },
    ]);

    map.set('payment', [
      { word: '납부', weight: 2 },
      { word: '결제일', weight: 2 },
      { word: '결제 안내', weight: 2 },
      { word: '자동이체', weight: 2 },
      { word: '청구', weight: 1.5 },
      { word: '요금', weight: 1 },
      { word: '공과금', weight: 2 },
      { word: '월세', weight: 2 },
      { word: '관리비', weight: 2 },
      { word: '전기세', weight: 2 },
      { word: '수도세', weight: 2 },
      { word: '가스비', weight: 2 },
      { word: '보험료', weight: 2 },
      { word: '대출', weight: 1 },
      { word: '세금', weight: 1.5 },
      { word: '국민연금', weight: 2 },
      { word: '건강보험', weight: 1.5 },
      { word: '카드', weight: 0.5 },
      { word: '결제', weight: 0.5 },
    ]);

    map.set('travel', [
      { word: '항공', weight: 2 },
      { word: '비행기', weight: 2 },
      { word: 'KTX', weight: 2 },
      { word: 'SRT', weight: 2 },
      { word: '기차', weight: 1.5 },
      { word: '고속버스', weight: 2 },
      { word: '여행', weight: 1 },
      { word: '탑승', weight: 1.5 },
      { word: '체크인', weight: 1.5 },
      { word: '체크아웃', weight: 1.5 },
      { word: '호텔', weight: 1.5 },
      { word: '펜션', weight: 1.5 },
      { word: '리조트', weight: 1.5 },
      { word: '에어비앤비', weight: 1.5 },
      { word: '숙소', weight: 1 },
      { word: '공항', weight: 1.5 },
      { word: '터미널', weight: 1 },
      { word: '대한항공', weight: 2 },
      { word: '아시아나', weight: 2 },
      { word: '제주항공', weight: 2 },
      { word: '진에어', weight: 2 },
      { word: '티웨이', weight: 2 },
      { word: '에어부산', weight: 2 },
      { word: '출발', weight: 0.5 },
      { word: '좌석', weight: 0.5 },
    ]);

    return map;
  }

  // =========================================================
  // 3단계: 날짜 추출 (확장 버전)
  // =========================================================

  /** 날짜 추출 (한국어 다양한 형식 + 구어체 지원) */
  extractDate(message: string): string | null {
    const now = new Date();
    const currentYear = now.getFullYear();

    // 우선순위 1: 절대 날짜 (연도 포함)
    const fullDatePatterns = [
      /(\d{4})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?/,
      /(\d{4})(\d{2})(\d{2})/,
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

    // 우선순위 2: 절대 날짜 (연도 없음 → 올해, 지났으면 내년)
    const shortDatePatterns = [
      /(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?/,
    ];

    for (const pattern of shortDatePatterns) {
      const match = message.match(pattern);
      if (match) {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        let year = currentYear;
        const candidate = new Date(year, month - 1, day);
        // 1주일 이상 지난 날짜면 내년으로 추정
        if (candidate.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
          year = currentYear + 1;
        }
        if (this.isValidDate(year, month, day)) {
          return this.formatDate(year, month, day);
        }
      }
    }

    // 우선순위 3: 상대 날짜 ("내일", "모레", "N일 후", "담달 N일")
    const relativeDateResult = this.parseRelativeDate(message, now);
    if (relativeDateResult) return relativeDateResult;

    // 우선순위 4: 요일 참조 ("이번 주 금요일", "담주 수요일")
    const weekdayResult = this.parseWeekdayReference(message, now);
    if (weekdayResult) return weekdayResult;

    return null;
  }

  /** 상대 날짜 파싱 (구어체 확장) */
  private parseRelativeDate(message: string, now: Date): string | null {
    const today = new Date(now);

    if (message.includes('오늘')) {
      return this.dateToString(today);
    }

    // "내일모레" / "모레" 를 "내일" 보다 먼저 체크
    if (/내일\s*모레/.test(message) || message.includes('모레')) {
      today.setDate(today.getDate() + 2);
      return this.dateToString(today);
    }
    if (message.includes('내일')) {
      today.setDate(today.getDate() + 1);
      return this.dateToString(today);
    }
    if (message.includes('글피')) {
      today.setDate(today.getDate() + 3);
      return this.dateToString(today);
    }

    // "N일 후/뒤/있다가"
    const daysLaterMatch = message.match(/(\d+)\s*일\s*(후|뒤|있다가|뒤에|후에)/);
    if (daysLaterMatch) {
      today.setDate(today.getDate() + parseInt(daysLaterMatch[1]));
      return this.dateToString(today);
    }

    // "다음달 N일" / "이번달 N일" / "담달 N일"
    const monthDayMatch = message.match(/(이번\s*달?|다음\s*달?|담\s*달)\s*(\d{1,2})\s*일/);
    if (monthDayMatch) {
      const isNextMonth = /다음|담/.test(monthDayMatch[1]);
      const day = parseInt(monthDayMatch[2]);
      const target = new Date(now);
      if (isNextMonth) target.setMonth(target.getMonth() + 1);
      target.setDate(day);
      return this.dateToString(target);
    }

    // "N주 후/뒤"
    const weeksLaterMatch = message.match(/(\d+)\s*주\s*(후|뒤)/);
    if (weeksLaterMatch) {
      today.setDate(today.getDate() + parseInt(weeksLaterMatch[1]) * 7);
      return this.dateToString(today);
    }

    // 구어체: "담주" (다음 주 월요일로 추정)
    if (/담\s*주/.test(message) && !/담\s*주?\s*(월|화|수|목|금|토|일)/.test(message)) {
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      today.setDate(today.getDate() + daysUntilMonday);
      return this.dateToString(today);
    }

    return null;
  }

  /** 요일 기반 날짜 파싱 (확장: "담주 수요일" 등 구어체) */
  private parseWeekdayReference(message: string, now: Date): string | null {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    const weekdayMatch = message.match(/(이번|다음|담)\s*주?\s*(월|화|수|목|금|토|일)\s*요?일?/);
    if (!weekdayMatch) return null;

    const isNextWeek = weekdayMatch[1] === '다음' || weekdayMatch[1] === '담';
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

  // =========================================================
  // 시간 추출 (확장)
  // =========================================================

  /** 시간 추출 (확장: 낮/저녁/아침, "반" 표현) */
  extractTime(message: string): string | null {
    // "오후 3시 30분", "오전 10시", "저녁 7시 반"
    const koreanTimePattern = /(오전|오후|아침|저녁|낮|밤)\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분|반)?/;
    const match1 = message.match(koreanTimePattern);
    if (match1) {
      let hour = parseInt(match1[2]);
      let minute = 0;
      if (match1[3]) {
        minute = parseInt(match1[3]);
      } else if (match1[0].includes('반')) {
        minute = 30;
      }

      const period = match1[1];
      if ((period === '오후' || period === '저녁' || period === '밤') && hour !== 12) hour += 12;
      if ((period === '오전' || period === '아침') && hour === 12) hour = 0;
      if (period === '낮' && hour !== 12 && hour < 6) hour += 12;

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }

    // "15:30"
    const timePattern = /(\d{1,2}):(\d{2})/;
    const match2 = message.match(timePattern);
    if (match2) {
      const hour = parseInt(match2[1]);
      const minute = parseInt(match2[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }

    // "3시", "15시" (단, "시간"은 제외)
    const hourOnlyPattern = /(?<![0-9])(\d{1,2})\s*시(?!\s*간)/;
    const match3 = message.match(hourOnlyPattern);
    if (match3) {
      const hour = parseInt(match3[1]);
      if (hour >= 0 && hour <= 23) {
        return `${hour.toString().padStart(2, '0')}:00`;
      }
    }

    return null;
  }

  // =========================================================
  // 장소 추출 (확장)
  // =========================================================

  /** 장소 추출 (확장: 주소, 지점명, 층/호, 관공서 등) */
  extractLocation(message: string): string | null {
    const locationPatterns = [
      // 의료기관
      /([가-힣A-Za-z0-9]+(?:대학)?(?:병원|의원|클리닉|센터|치과|한의원|약국))/,
      // 뷰티/건강
      /([가-힣A-Za-z0-9]+(?:미용실|헤어|네일|뷰티|스파|필라테스|요가|피부관리))/,
      // 식음료
      /([가-힣A-Za-z0-9]+(?:식당|레스토랑|카페|맛집|베이커리))/,
      // 숙박
      /([가-힣A-Za-z0-9]+(?:호텔|펜션|리조트|숙소|게스트하우스))/,
      // 교통
      /([가-힣A-Za-z0-9]+(?:공항|터미널|역|정류장))/,
      // 교육
      /([가-힣A-Za-z0-9]+(?:학원|교실|스쿨|아카데미))/,
      // 관공서
      /([가-힣A-Za-z0-9]+(?:주민센터|구청|시청|세무서|법원|등기소|출입국))/,
      // "장소:", "위치:", "주소:" 라벨 형태
      /(?:장소|위치|주소)\s*[:\-=]\s*([가-힣A-Za-z0-9\s]+?)(?:\n|$)/,
      // 체인점 지점명: "OO 강남점"
      /([가-힣A-Za-z0-9]+\s*(?:강남|홍대|신촌|이태원|잠실|판교|분당|해운대|서면)\s*점)/,
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  // =========================================================
  // 제목 생성
  // =========================================================

  private generateTitle(message: string, category: EventCategory): string {
    const categoryLabels: Record<EventCategory, string> = {
      hospital: '병원 예약',
      delivery: '택배 도착',
      appointment: '예약',
      payment: '납부/결제',
      travel: '여행/이동',
      other: '일정',
    };

    const specificTitle = this.extractTitleKeywords(message, category);
    if (specificTitle) return specificTitle;

    const location = this.extractLocation(message);
    const baseLabel = categoryLabels[category];
    if (location) return `${location} ${baseLabel}`;

    return baseLabel;
  }

  private extractTitleKeywords(message: string, category: EventCategory): string | null {
    const location = this.extractLocation(message);

    switch (category) {
      case 'hospital': {
        const deptMatch = message.match(/(내과|외과|피부과|안과|이비인후과|정형외과|산부인과|소아과|치과|한의원|정신건강의학과|비뇨기과|신경과|재활의학과)/);
        if (deptMatch && location) return `${location} ${deptMatch[1]} 예약`;
        if (location) return `${location} 예약`;
        if (deptMatch) return `${deptMatch[1]} 예약`;
        return null;
      }
      case 'delivery': {
        const bracketMatch = message.match(/\[([^\]]+)\]/);
        const productMatch = message.match(/(?:상품|품목)\s*[:\-]\s*(.+?)(?:\n|$)/);
        const item = bracketMatch?.[1] || productMatch?.[1];
        if (item) return `택배: ${item.trim()}`;
        return null;
      }
      case 'payment': {
        const amountMatch = message.match(/([\d,]+)\s*원/);
        const typeMatch = message.match(/(월세|관리비|전기세|수도세|가스비|보험료|국민연금|건강보험|카드.*결제|대출.*상환)/);
        if (typeMatch && amountMatch) return `${typeMatch[1]} ${amountMatch[1]}원`;
        if (typeMatch) return `${typeMatch[1]} 납부`;
        if (amountMatch) return `납부 ${amountMatch[1]}원`;
        return null;
      }
      case 'travel': {
        const routeMatch = message.match(/([가-힣]+(?:역|공항)?)\s*[→\->\u2192]+\s*([가-힣]+(?:역|공항)?)/);
        const vehicleMatch = message.match(/(KTX|SRT|비행기|항공|고속버스)/);
        if (vehicleMatch && routeMatch) return `${vehicleMatch[1]} ${routeMatch[1]}→${routeMatch[2]}`;
        if (routeMatch) return `${routeMatch[1]}→${routeMatch[2]}`;
        if (vehicleMatch && location) return `${vehicleMatch[1]} ${location}`;
        return null;
      }
      case 'appointment': {
        if (location) return `${location} 예약`;
        return null;
      }
      default:
        return null;
    }
  }

  // =========================================================
  // 신뢰도 계산 (구조 분석 기반)
  // =========================================================

  /** 구조적 신뢰도 계산 */
  private calculateConfidence(
    message: string,
    category: EventCategory,
    date: string,
    time: string | null,
  ): number {
    let confidence = 0;

    // (1) 카테고리 키워드 가중치 점수 (최대 0.35)
    const keywords = this.weightedPatterns.get(category);
    if (keywords) {
      const weightSum = keywords.reduce(
        (acc, { word, weight }) => acc + (message.includes(word) ? weight : 0),
        0,
      );
      confidence += Math.min(weightSum * 0.05, 0.35);
    }

    // (2) 날짜 존재 (0.20)
    if (date) confidence += 0.20;

    // (3) 시간 존재 (0.10)
    if (time) confidence += 0.10;

    // (4) 장소 존재 (0.10)
    if (this.extractLocation(message)) confidence += 0.10;

    // (5) 메시지 구조 보너스 (최대 0.25)
    confidence += this.calculateStructureBonus(message);

    return Math.min(confidence, 1.0);
  }

  /** 메시지의 구조적 특징에 따른 보너스 점수 */
  private calculateStructureBonus(message: string): number {
    let bonus = 0;

    // 예약 확인/안내 문구 → 공식 알림일 가능성 높음
    const confirmPhrases = [
      '예약 확인', '예약확인', '예약이 확정', '예약 완료', '예약완료',
      '예약 안내', '예약안내', '접수 완료', '접수완료',
      '안내 드립니다', '안내드립니다', '알려드립니다',
    ];
    if (confirmPhrases.some(p => message.includes(p))) bonus += 0.10;

    // [발신자] 형태의 헤더 → 공식 SMS
    if (/^\s*[\[【(]/.test(message)) bonus += 0.05;

    // 줄바꿈 3개 이상 → 구조화된 메시지
    const lineCount = message.split('\n').filter(l => l.trim()).length;
    if (lineCount >= 3) bonus += 0.05;

    // "일시:", "날짜:" 등 라벨 형태
    if (/(?:일시|날짜|시간|장소|위치)\s*[:\-=]/.test(message)) bonus += 0.05;

    return bonus;
  }

  // =========================================================
  // 유틸리티
  // =========================================================

  private isValidDate(year: number, month: number, day: number): boolean {
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
  }

  private formatDate(year: number, month: number, day: number): string {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private dateToString(date: Date): string {
    return this.formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  /** 하위 호환용 */
  private initializePatterns(): MessagePattern[] {
    return [
      { category: 'hospital', keywords: ['병원', '의원', '진료', '검진', '치과', '한의원'], datePatterns: [], timePatterns: [], locationPatterns: [] },
      { category: 'delivery', keywords: ['택배', '배송', '배달', '출고', '운송장'], datePatterns: [], timePatterns: [], locationPatterns: [] },
      { category: 'appointment', keywords: ['예약', '미용실', '헤어', '식당', '레스토랑', '상담'], datePatterns: [], timePatterns: [], locationPatterns: [] },
      { category: 'payment', keywords: ['납부', '결제', '청구', '자동이체', '공과금', '월세'], datePatterns: [], timePatterns: [], locationPatterns: [] },
      { category: 'travel', keywords: ['항공', 'KTX', 'SRT', '호텔', '공항', '탑승'], datePatterns: [], timePatterns: [], locationPatterns: [] },
    ];
  }
}

export default MessageParser;
