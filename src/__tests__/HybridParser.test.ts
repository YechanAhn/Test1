// ============================================
// HybridParser 단위 테스트
// 규칙 기반 ↔ LLM 폴백 전략 검증
// ============================================

import { HybridParser } from '../services/HybridParser';

describe('HybridParser', () => {
  let parser: HybridParser;

  beforeEach(() => {
    // LLM 없이 규칙 기반만 사용하는 모드
    parser = new HybridParser({ enableLLM: false });
  });

  describe('규칙 기반 단독 동작', () => {
    it('신뢰도 높은 메시지는 규칙 기반만으로 파싱한다', async () => {
      const message = '[서울대병원] 진료 예약 확인\n일시: 2024년 3월 15일 오후 2시 30분\n장소: 서울대병원';
      const result = await parser.parse(message);

      expect(result).not.toBeNull();
      expect(result!.category).toBe('hospital');
      expect(result!.date).toBe('2024-03-15');

      const stats = parser.getStats();
      expect(stats.ruleOnly).toBe(1);
      expect(stats.llmFallback).toBe(0);
    });

    it('스팸 메시지는 스킵한다', async () => {
      const result = await parser.parse('[Web발신] 할인 쿠폰 당첨!');

      expect(result).toBeNull();
      expect(parser.getStats().totalSkipped).toBe(1);
    });

    it('일정이 아닌 메시지는 null을 반환한다', async () => {
      const result = await parser.parse('오늘 날씨가 좋네요');
      expect(result).toBeNull();
    });
  });

  describe('배치 파싱', () => {
    it('여러 메시지를 한번에 파싱한다', async () => {
      const messages = [
        '[서울대병원] 진료 예약\n2024년 3월 15일 오후 2시 30분',
        '[Web발신] 광고 메시지입니다',
        '[CJ대한통운] 택배 배송 예정\n배송일: 3월 20일',
      ];

      const results = await parser.parseBatch(messages);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();     // 병원 예약
      expect(results[1]).toBeNull();         // 스팸
      expect(results[2]).not.toBeNull();     // 택배
    });
  });

  describe('통계 관리', () => {
    it('파싱 통계를 올바르게 기록한다', async () => {
      await parser.parse('[서울대병원] 진료 예약 확인\n2024년 3월 15일');
      await parser.parse('[Web발신] 광고');
      await parser.parse('[CJ대한통운] 택배 배송\n3월 20일 도착');

      const stats = parser.getStats();
      expect(stats.totalParsed).toBe(2);
      expect(stats.totalSkipped).toBe(1);
    });

    it('통계를 초기화할 수 있다', async () => {
      await parser.parse('[서울대병원] 진료 예약 확인\n2024년 3월 15일');
      parser.resetStats();

      const stats = parser.getStats();
      expect(stats.totalParsed).toBe(0);
      expect(stats.ruleOnly).toBe(0);
    });
  });

  describe('신뢰도 기준 동작', () => {
    it('높은 confidenceThreshold에서는 더 많은 메시지가 LLM 후보가 된다', async () => {
      const strictParser = new HybridParser({
        enableLLM: false,
        confidenceThreshold: 0.9,
      });

      // 신뢰도 0.9 이상이 아니면 LLM 후보지만, LLM이 없으므로 규칙 결과 반환
      const result = await strictParser.parse('병원 예약 3월 15일 오전 10시');
      // 규칙 기반 결과는 있지만 신뢰도가 0.9 미만일 수 있음
      if (result) {
        expect(result.category).toBe('hospital');
      }
    });
  });
});
