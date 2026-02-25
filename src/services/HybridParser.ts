// ============================================
// 하이브리드 파싱 오케스트레이터
// 규칙 기반 파서 → LLM 파서 폴백 전략
//
// 전략:
//  1) 규칙 기반 파서로 먼저 시도 (빠르고, 비용 0)
//  2) 신뢰도 낮거나 파싱 실패 → LLM 파서로 재시도
//  3) 두 파서 결과를 비교하여 최선의 결과 선택
// ============================================

import { ParsedSchedule } from '../types';
import { MessageParser } from './MessageParser';
import { LLMMessageParser } from './LLMMessageParser';

interface HybridParserConfig {
  /** LLM API 키 (없으면 규칙 기반만 사용) */
  llmApiKey?: string;
  /** LLM 모델 (기본: claude-haiku-4-5-20251001) */
  llmModel?: string;
  /** 이 신뢰도 이상이면 LLM 호출 생략 */
  confidenceThreshold?: number;
  /** LLM 사용 여부 */
  enableLLM?: boolean;
}

export class HybridParser {
  private ruleParser: MessageParser;
  private llmParser: LLMMessageParser | null;
  private confidenceThreshold: number;
  private enableLLM: boolean;

  // 성능 통계
  private stats = {
    ruleOnly: 0,
    llmFallback: 0,
    llmUpgraded: 0,
    totalParsed: 0,
    totalSkipped: 0,
  };

  constructor(config: HybridParserConfig = {}) {
    this.ruleParser = new MessageParser();
    this.confidenceThreshold = config.confidenceThreshold ?? 0.6;
    this.enableLLM = config.enableLLM ?? true;

    if (config.llmApiKey && this.enableLLM) {
      this.llmParser = new LLMMessageParser({
        apiKey: config.llmApiKey,
        model: config.llmModel,
      });
    } else {
      this.llmParser = null;
    }
  }

  /**
   * 메시지를 파싱합니다.
   *
   * 흐름:
   * 1. 규칙 기반 파서 시도
   * 2. 성공 + 신뢰도 높음 → 바로 반환
   * 3. 실패 or 신뢰도 낮음 → LLM 파서로 재시도
   * 4. 두 결과 중 더 나은 것 반환
   */
  async parse(message: string): Promise<ParsedSchedule | null> {
    // 스팸 체크는 규칙 기반이 정확하므로 먼저 수행
    if (this.ruleParser.isSpamOrNonSchedule(message)) {
      this.stats.totalSkipped++;
      return null;
    }

    // Step 1: 규칙 기반 파서
    const ruleResult = this.ruleParser.parse(message);

    // Step 2: 신뢰도가 충분히 높으면 그대로 반환
    if (ruleResult && ruleResult.confidence >= this.confidenceThreshold) {
      this.stats.ruleOnly++;
      this.stats.totalParsed++;
      return ruleResult;
    }

    // Step 3: LLM 파서로 폴백
    if (this.llmParser) {
      const llmResults = await this.llmParser.parse(message);

      if (llmResults.length > 0) {
        const llmBest = llmResults[0]; // 첫 번째 일정 사용

        // 규칙 기반 결과가 없으면 LLM 결과 사용
        if (!ruleResult) {
          this.stats.llmFallback++;
          this.stats.totalParsed++;
          return llmBest;
        }

        // 두 결과를 비교하여 더 나은 것 선택
        const chosen = this.chooseBetterResult(ruleResult, llmBest);
        if (chosen === llmBest) {
          this.stats.llmUpgraded++;
        } else {
          this.stats.ruleOnly++;
        }
        this.stats.totalParsed++;
        return chosen;
      }
    }

    // LLM 없거나 실패 시, 규칙 기반 결과 (있으면) 반환
    if (ruleResult) {
      this.stats.ruleOnly++;
      this.stats.totalParsed++;
    } else {
      this.stats.totalSkipped++;
    }
    return ruleResult;
  }

  /**
   * 메시지 배치 파싱 (복수 메시지 한번에 처리).
   * 규칙 기반은 즉시, LLM이 필요한 것만 모아서 처리합니다.
   */
  async parseBatch(messages: string[]): Promise<(ParsedSchedule | null)[]> {
    const results: (ParsedSchedule | null)[] = [];
    const needsLLM: { index: number; message: string; ruleResult: ParsedSchedule | null }[] = [];

    // 1차: 규칙 기반으로 전부 시도
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (this.ruleParser.isSpamOrNonSchedule(msg)) {
        results[i] = null;
        continue;
      }

      const ruleResult = this.ruleParser.parse(msg);
      if (ruleResult && ruleResult.confidence >= this.confidenceThreshold) {
        results[i] = ruleResult;
      } else {
        results[i] = ruleResult; // 임시 저장
        needsLLM.push({ index: i, message: msg, ruleResult });
      }
    }

    // 2차: LLM이 필요한 것만 처리
    if (this.llmParser && needsLLM.length > 0) {
      const llmPromises = needsLLM.map(async ({ index, message, ruleResult }) => {
        const llmResults = await this.llmParser!.parse(message);
        if (llmResults.length > 0) {
          results[index] = ruleResult
            ? this.chooseBetterResult(ruleResult, llmResults[0])
            : llmResults[0];
        }
      });

      await Promise.all(llmPromises);
    }

    return results;
  }

  /** 두 파싱 결과를 비교하여 더 나은 것을 선택 */
  private chooseBetterResult(rule: ParsedSchedule, llm: ParsedSchedule): ParsedSchedule {
    let ruleScore = rule.confidence;
    let llmScore = llm.confidence;

    // 규칙 기반은 날짜/시간 정확도가 높으므로 보너스
    if (rule.date) ruleScore += 0.05;
    if (rule.time) ruleScore += 0.05;

    // LLM은 제목 품질이 좋으므로, 제목이 더 구체적이면 보너스
    if (llm.title.length > rule.title.length + 5) llmScore += 0.05;

    // LLM이 장소를 찾았는데 규칙 기반은 못 찾은 경우
    if (llm.location && !rule.location) llmScore += 0.1;

    if (llmScore > ruleScore) {
      // LLM 결과를 사용하되, 규칙 기반의 정확한 날짜/시간을 덮어쓸 수 있음
      return {
        ...llm,
        // 규칙 기반의 날짜가 더 정확한 형식이면 그것을 사용
        date: rule.date && /^\d{4}-\d{2}-\d{2}$/.test(rule.date) ? rule.date : llm.date,
        time: rule.time || llm.time,
        confidence: Math.max(ruleScore, llmScore),
      };
    }

    return rule;
  }

  /** 파싱 통계 반환 */
  getStats() {
    return { ...this.stats };
  }

  /** 통계 초기화 */
  resetStats() {
    this.stats = {
      ruleOnly: 0,
      llmFallback: 0,
      llmUpgraded: 0,
      totalParsed: 0,
      totalSkipped: 0,
    };
  }
}

export default HybridParser;
