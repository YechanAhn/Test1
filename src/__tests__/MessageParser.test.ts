// ============================================
// MessageParser 단위 테스트
// 다양한 한국어 메시지 형식에서 일정을 정확히 추출하는지 검증
// ============================================

import { MessageParser } from '../services/MessageParser';

describe('MessageParser', () => {
  let parser: MessageParser;

  beforeEach(() => {
    parser = new MessageParser();
  });

  describe('병원 예약 메시지 파싱', () => {
    it('날짜와 시간이 포함된 병원 예약 문자를 파싱한다', () => {
      const message = '[서울대병원] 진료 예약 안내\n예약일시: 2024년 3월 15일 오후 2시 30분\n진료과: 내과\n장소: 서울대병원';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('hospital');
      expect(result!.date).toBe('2024-03-15');
      expect(result!.time).toBe('14:30');
      expect(result!.location).toContain('서울대병원');
    });

    it('치과 예약 메시지를 파싱한다', () => {
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
  });

  describe('택배/배송 메시지 파싱', () => {
    it('택배 배송 예정 메시지를 파싱한다', () => {
      const message = '[CJ대한통운] 택배 배송 예정\n배송예정일: 3월 12일\n상품: [쿠팡] 무선 이어폰';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('delivery');
    });
  });

  describe('일반 예약 메시지 파싱', () => {
    it('미용실 예약 메시지를 파싱한다', () => {
      const message = '준오헤어 예약 확인\n2024년 3월 18일 오후 3시\n커트+염색';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.date).toBe('2024-03-18');
      expect(result!.time).toBe('15:00');
    });

    it('식당 예약 메시지를 파싱한다', () => {
      const message = '예약이 확정되었습니다.\n레스토랑: 오스테리아\n일시: 2024-03-22 18:30\n인원: 2명';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.date).toBe('2024-03-22');
      expect(result!.time).toBe('18:30');
    });
  });

  describe('결제/납부 메시지 파싱', () => {
    it('카드 결제일 알림을 파싱한다', () => {
      const message = '[KB국민카드] 3월 결제 안내\n결제일: 3월 25일\n결제금액: 520,000원\n자동이체 예정';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('payment');
    });
  });

  describe('여행/교통 메시지 파싱', () => {
    it('KTX 예약 메시지를 파싱한다', () => {
      const message = '[코레일] KTX 예약확인\n2024년 4월 5일 오전 8시\n서울역 → 부산역\n좌석: 5호차 12B';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('travel');
      expect(result!.date).toBe('2024-04-05');
      expect(result!.time).toBe('08:00');
    });

    it('항공권 예약을 파싱한다', () => {
      const message = '항공권 예약 확인\n탑승일: 2024.05.01\n출발: 인천공항 14:00\n도착: 제주공항 15:10';
      const result = parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('travel');
      expect(result!.date).toBe('2024-05-01');
    });
  });

  describe('날짜 파싱', () => {
    it('YYYY년 MM월 DD일 형식을 파싱한다', () => {
      const result = parser.extractDate('2024년 12월 25일에 방문해주세요');
      expect(result).toBe('2024-12-25');
    });

    it('YYYY.MM.DD 형식을 파싱한다', () => {
      const result = parser.extractDate('날짜: 2024.03.15');
      expect(result).toBe('2024-03-15');
    });

    it('YYYY-MM-DD 형식을 파싱한다', () => {
      const result = parser.extractDate('일시: 2024-07-20');
      expect(result).toBe('2024-07-20');
    });

    it('M월 D일 형식(연도 없음)을 올해로 파싱한다', () => {
      const result = parser.extractDate('3월 15일 방문 예정');
      const currentYear = new Date().getFullYear();
      expect(result).toBe(`${currentYear}-03-15`);
    });
  });

  describe('시간 파싱', () => {
    it('오후 N시 M분 형식을 파싱한다', () => {
      const result = parser.extractTime('오후 3시 30분에 방문');
      expect(result).toBe('15:30');
    });

    it('오전 N시 형식을 파싱한다', () => {
      const result = parser.extractTime('오전 9시 예약');
      expect(result).toBe('09:00');
    });

    it('HH:MM 형식을 파싱한다', () => {
      const result = parser.extractTime('시간: 14:00');
      expect(result).toBe('14:00');
    });

    it('오후 12시를 12:00으로 파싱한다', () => {
      const result = parser.extractTime('오후 12시 미팅');
      expect(result).toBe('12:00');
    });

    it('오전 12시를 00:00으로 파싱한다', () => {
      const result = parser.extractTime('오전 12시 야간 당직');
      expect(result).toBe('00:00');
    });
  });

  describe('일정이 아닌 메시지 필터링', () => {
    it('광고 문자는 null을 반환한다', () => {
      const message = '[Web발신] 특가! 치킨 50% 할인 쿠폰 지금 바로 받아가세요!';
      const result = parser.parse(message);
      expect(result).toBeNull();
    });

    it('인증번호 문자는 null을 반환한다', () => {
      const message = '[카카오] 인증번호 [123456]을 입력해주세요.';
      const result = parser.parse(message);
      expect(result).toBeNull();
    });
  });

  describe('신뢰도 계산', () => {
    it('상세한 정보가 많을수록 높은 신뢰도를 반환한다', () => {
      const detailedMessage = '[서울대병원] 진료 예약\n2024년 3월 15일 오후 2시 30분\n장소: 서울대병원 내과';
      const vagueMessage = '병원 예약 3월 15일';

      const detailed = parser.parse(detailedMessage);
      const vague = parser.parse(vagueMessage);

      expect(detailed).not.toBeNull();
      expect(vague).not.toBeNull();
      expect(detailed!.confidence).toBeGreaterThan(vague!.confidence);
    });
  });
});
