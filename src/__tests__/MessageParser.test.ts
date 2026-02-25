// ============================================
// MessageParser 단위 테스트 (강화 버전)
// 스팸 필터링, 가중치 카테고리, 구어체, 구조적 신뢰도 검증
// ============================================

import { MessageParser } from '../services/MessageParser';

describe('MessageParser', () => {
  let parser: MessageParser;

  beforeEach(() => {
    parser = new MessageParser();
  });

  // =========================================================
  // 스팸/비일정 필터링
  // =========================================================
  describe('스팸 필터링', () => {
    it('광고 문자를 걸러낸다 ([Web발신])', () => {
      const message = '[Web발신] 특가! 치킨 50% 할인 쿠폰 지금 바로 받아가세요!';
      expect(parser.parse(message)).toBeNull();
    });

    it('인증번호 문자를 걸러낸다', () => {
      expect(parser.parse('[카카오] 인증번호 [123456]을 입력해주세요.')).toBeNull();
    });

    it('인증코드 문자를 걸러낸다', () => {
      expect(parser.parse('본인확인 인증코드: 837291 (3분 이내 입력)')).toBeNull();
    });

    it('카드 승인 알림을 걸러낸다', () => {
      expect(parser.parse('[KB국민카드] 승인금액 32,000원 스타벅스')).toBeNull();
    });

    it('로그인 알림을 걸러낸다', () => {
      expect(parser.parse('새 기기에서 로그인 알림이 감지되었습니다.')).toBeNull();
    });

    it('잔액 알림을 걸러낸다', () => {
      expect(parser.parse('[신한은행] 출금 50,000원 잔액 1,234,567원')).toBeNull();
    });

    it('10자 미만 짧은 메시지를 걸러낸다', () => {
      expect(parser.parse('안녕!')).toBeNull();
    });

    it('수신거부 포함 광고를 걸러낸다', () => {
      expect(parser.parse('병원 할인 이벤트! 수신거부 080-xxx-xxxx 3월 15일까지')).toBeNull();
    });
  });

  // =========================================================
  // 가중치 기반 카테고리 감지
  // =========================================================
  describe('카테고리 감지 (가중치 기반)', () => {
    it('"진료"만 있어도 hospital로 감지한다 (강력 지표, weight=2)', () => {
      const result = parser.detectCategory('[강남의원] 진료 안내 3월 15일');
      expect(result).toBe('hospital');
    });

    it('"택배"만 있어도 delivery로 감지한다 (강력 지표)', () => {
      const result = parser.detectCategory('택배가 출발했습니다. 배송 예정일: 3월 12일');
      expect(result).toBe('delivery');
    });

    it('약한 키워드만으로는 카테고리를 잡지 않는다', () => {
      // "방문" (weight=0.3) + "카페" (weight=0.5) = 0.8 < 1.5 기준
      const result = parser.detectCategory('카페에서 방문해주세요');
      expect(result).toBeNull();
    });

    it('복합 키워드: "병원" + "예약" = hospital이 appointment보다 높다', () => {
      const result = parser.detectCategory('서울대병원 진료 예약 확인');
      expect(result).toBe('hospital');
    });

    it('항공사 이름만으로 travel을 감지한다', () => {
      const result = parser.detectCategory('대한항공 예약 확인번호 ABC123');
      expect(result).toBe('travel');
    });
  });

  // =========================================================
  // 병원 예약 메시지
  // =========================================================
  describe('병원 예약 메시지 파싱', () => {
    it('공식 예약 문자를 높은 신뢰도로 파싱한다', () => {
      const message = '[서울대병원] 진료 예약 안내\n예약일시: 2024년 3월 15일 오후 2시 30분\n진료과: 내과\n장소: 서울대병원';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('hospital');
      expect(result!.date).toBe('2024-03-15');
      expect(result!.time).toBe('14:30');
      expect(result!.location).toContain('서울대병원');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('치과 예약을 파싱한다', () => {
      const message = '연세치과 예약 확인\n3월 20일 오전 10시\n정기검진';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('hospital');
      expect(result!.time).toBe('10:00');
    });

    it('건강검진 예약을 파싱한다', () => {
      const message = '건강검진 예약이 확정되었습니다.\n일시: 2024.04.10 09:00\n장소: 강남세브란스병원';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('hospital');
      expect(result!.date).toBe('2024-04-10');
      expect(result!.time).toBe('09:00');
    });

    it('진료과가 포함된 제목을 생성한다', () => {
      const message = '[서울대병원] 내과 진료 예약\n2024년 5월 10일 오전 11시';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.title).toContain('내과');
    });
  });

  // =========================================================
  // 택배/배송
  // =========================================================
  describe('택배/배송 메시지 파싱', () => {
    it('택배 배송 예정 메시지를 파싱한다', () => {
      const message = '[CJ대한통운] 택배 배송 예정\n배송예정일: 3월 12일\n상품: [쿠팡] 무선 이어폰';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('delivery');
      expect(result!.title).toContain('쿠팡');
    });

    it('운송장 번호가 포함된 메시지를 파싱한다', () => {
      const message = '[한진택배] 발송 완료\n운송장 번호: 123456789\n배송예정: 3월 15일';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('delivery');
    });
  });

  // =========================================================
  // 일반 예약
  // =========================================================
  describe('일반 예약 메시지 파싱', () => {
    it('미용실 예약을 파싱한다', () => {
      const message = '준오헤어 예약 확인\n2024년 3월 18일 오후 3시\n커트+염색';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.date).toBe('2024-03-18');
      expect(result!.time).toBe('15:00');
    });

    it('식당 예약을 파싱한다', () => {
      const message = '예약이 확정되었습니다.\n레스토랑: 오스테리아\n일시: 2024-03-22 18:30\n인원: 2명';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.date).toBe('2024-03-22');
      expect(result!.time).toBe('18:30');
    });

    it('네일 예약을 파싱한다', () => {
      const message = '네일아트 예약 완료\n일시: 3월 25일 오후 1시\n담당: 김유진';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('appointment');
    });

    it('웨딩 관련 예약을 파싱한다', () => {
      const message = '웨딩 상담 예약 확인\n2024년 4월 2일 오후 2시\n스튜디오 방문 상담';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
    });
  });

  // =========================================================
  // 결제/납부
  // =========================================================
  describe('결제/납부 메시지 파싱', () => {
    it('카드 결제일을 파싱한다', () => {
      const message = '[KB국민카드] 3월 결제 안내\n결제일: 3월 25일\n결제금액: 520,000원\n자동이체 예정';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('payment');
    });

    it('관리비 납부를 파싱한다', () => {
      const message = '관리비 납부 안내\n납부기한: 3월 30일\n금액: 180,000원\n자동이체';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('payment');
      expect(result!.title).toContain('관리비');
    });
  });

  // =========================================================
  // 여행/교통
  // =========================================================
  describe('여행/교통 메시지 파싱', () => {
    it('KTX 예약을 파싱한다', () => {
      const message = '[코레일] KTX 예약확인\n2024년 4월 5일 오전 8시\n서울역 → 부산역\n좌석: 5호차 12B';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('travel');
      expect(result!.date).toBe('2024-04-05');
      expect(result!.time).toBe('08:00');
      expect(result!.title).toContain('서울');
      expect(result!.title).toContain('부산');
    });

    it('항공권 예약을 파싱한다', () => {
      const message = '항공권 예약 확인\n탑승일: 2024.05.01\n출발: 인천공항 14:00\n도착: 제주공항 15:10';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('travel');
      expect(result!.date).toBe('2024-05-01');
    });

    it('호텔 체크인을 파싱한다', () => {
      const message = '[그랜드호텔] 예약 확인\n체크인: 2024년 5월 3일 오후 3시\n체크아웃: 2024년 5월 5일';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('travel');
    });
  });

  // =========================================================
  // 날짜 파싱 (확장)
  // =========================================================
  describe('날짜 파싱', () => {
    it('YYYY년 MM월 DD일 형식', () => {
      expect(parser.extractDate('2024년 12월 25일에 방문해주세요')).toBe('2024-12-25');
    });

    it('YYYY.MM.DD 형식', () => {
      expect(parser.extractDate('날짜: 2024.03.15')).toBe('2024-03-15');
    });

    it('YYYY-MM-DD 형식', () => {
      expect(parser.extractDate('일시: 2024-07-20')).toBe('2024-07-20');
    });

    it('M월 D일 형식 (연도 없음)', () => {
      const result = parser.extractDate('3월 15일 방문 예정');
      expect(result).toMatch(/^\d{4}-03-15$/);
    });

    it('"내일"을 파싱한다', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
      expect(parser.extractDate('내일 병원 진료 예정')).toBe(expected);
    });

    it('"모레"를 파싱한다', () => {
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const expected = `${dayAfter.getFullYear()}-${String(dayAfter.getMonth()+1).padStart(2,'0')}-${String(dayAfter.getDate()).padStart(2,'0')}`;
      expect(parser.extractDate('모레 미용실 예약')).toBe(expected);
    });

    it('"내일모레"를 2일 후로 파싱한다', () => {
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const expected = `${dayAfter.getFullYear()}-${String(dayAfter.getMonth()+1).padStart(2,'0')}-${String(dayAfter.getDate()).padStart(2,'0')}`;
      expect(parser.extractDate('내일모레 만나요')).toBe(expected);
    });

    it('"3일 후"를 파싱한다', () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);
      const expected = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
      expect(parser.extractDate('3일 후에 봐요')).toBe(expected);
    });

    it('"다음달 15일"을 파싱한다', () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(15);
      const expected = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth()+1).padStart(2,'0')}-15`;
      expect(parser.extractDate('다음달 15일에 만나요')).toBe(expected);
    });

    it('"2주 후"를 파싱한다', () => {
      const future = new Date();
      future.setDate(future.getDate() + 14);
      const expected = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
      expect(parser.extractDate('2주 후에 검진')).toBe(expected);
    });
  });

  // =========================================================
  // 시간 파싱 (확장)
  // =========================================================
  describe('시간 파싱', () => {
    it('오후 N시 M분', () => {
      expect(parser.extractTime('오후 3시 30분에 방문')).toBe('15:30');
    });

    it('오전 N시', () => {
      expect(parser.extractTime('오전 9시 예약')).toBe('09:00');
    });

    it('HH:MM 형식', () => {
      expect(parser.extractTime('시간: 14:00')).toBe('14:00');
    });

    it('오후 12시 → 12:00', () => {
      expect(parser.extractTime('오후 12시 미팅')).toBe('12:00');
    });

    it('오전 12시 → 00:00', () => {
      expect(parser.extractTime('오전 12시 야간 당직')).toBe('00:00');
    });

    it('"저녁 7시 반"을 19:30으로 파싱한다', () => {
      expect(parser.extractTime('저녁 7시 반에 식사')).toBe('19:30');
    });

    it('"아침 8시"를 08:00으로 파싱한다', () => {
      expect(parser.extractTime('아침 8시 출발')).toBe('08:00');
    });

    it('"밤 10시"를 22:00으로 파싱한다', () => {
      expect(parser.extractTime('밤 10시 도착 예정')).toBe('22:00');
    });

    it('"3시간" 같은 표현은 시간으로 파싱하지 않는다', () => {
      // "3시간 후"의 "3시"가 잘못 매칭되지 않아야 함
      expect(parser.extractTime('약 3시간 소요됩니다')).toBeNull();
    });
  });

  // =========================================================
  // 장소 추출 (확장)
  // =========================================================
  describe('장소 추출', () => {
    it('병원명을 추출한다', () => {
      expect(parser.extractLocation('서울대병원에서 진료')).toBe('서울대병원');
    });

    it('학원명을 추출한다', () => {
      expect(parser.extractLocation('영어학원 상담 예약')).toBe('영어학원');
    });

    it('"장소:" 라벨에서 추출한다', () => {
      const result = parser.extractLocation('장소: 강남역 3번 출구');
      expect(result).toContain('강남역');
    });

    it('주민센터 등 관공서를 추출한다', () => {
      expect(parser.extractLocation('역삼주민센터 방문 예약')).toBe('역삼주민센터');
    });
  });

  // =========================================================
  // 구조적 신뢰도
  // =========================================================
  describe('신뢰도 계산', () => {
    it('공식 예약 확인 문자는 높은 신뢰도', () => {
      const message = '[서울대병원] 진료 예약 확인\n일시: 2024년 3월 15일 오후 2시 30분\n장소: 서울대병원 내과';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('간단한 메시지는 낮은 신뢰도', () => {
      const message = '병원 예약 3월 15일';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeLessThan(0.7);
    });

    it('[발신자] 헤더가 있으면 신뢰도 보너스', () => {
      const withHeader = '[강남의원] 진료 예약\n3월 20일 오전 10시';
      const withoutHeader = '강남의원 진료 예약\n3월 20일 오전 10시';

      const resultWith = parser.parse(withHeader);
      const resultWithout = parser.parse(withoutHeader);

      expect(resultWith).not.toBeNull();
      expect(resultWithout).not.toBeNull();
      expect(resultWith!.confidence).toBeGreaterThan(resultWithout!.confidence);
    });

    it('"예약 확인" 문구가 있으면 신뢰도 보너스', () => {
      const confirmed = '예약 확인 - 강남의원 진료\n일시: 3월 20일 오전 10시';
      const simple = '강남의원 진료\n3월 20일 오전 10시';

      const resultConfirmed = parser.parse(confirmed);
      const resultSimple = parser.parse(simple);

      expect(resultConfirmed).not.toBeNull();
      expect(resultSimple).not.toBeNull();
      expect(resultConfirmed!.confidence).toBeGreaterThan(resultSimple!.confidence);
    });
  });
});
