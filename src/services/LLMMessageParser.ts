// ============================================
// LLM 기반 메시지 파서
// Claude API를 사용하여 비정형 메시지에서도
// 일정 정보를 정확하게 추출합니다.
// ============================================

import { ParsedSchedule, EventCategory } from '../types';

interface LLMParserConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Claude API를 활용한 LLM 메시지 파서.
 *
 * 규칙 기반 파서가 처리하지 못하는 비정형 메시지를 처리합니다.
 * - 자연어 대화체: "담주 수요일쯤 병원 갈게~"
 * - 복합 일정: 하나의 메시지에 여러 일정이 포함된 경우
 * - 맥락 의존적 메시지: 대화 흐름에서 일정을 추론해야 하는 경우
 */
export class LLMMessageParser {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor(config: LLMParserConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-haiku-4-5-20251001';
    this.maxTokens = config.maxTokens || 1024;
  }

  /**
   * LLM을 사용하여 메시지에서 일정 정보를 추출합니다.
   * @param message 원본 메시지
   * @returns 파싱된 일정 배열 (복수 일정 지원)
   */
  async parse(message: string): Promise<ParsedSchedule[]> {
    const today = new Date().toISOString().slice(0, 10);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];

    const systemPrompt = `당신은 한국어 메시지에서 캘린더 일정 정보를 추출하는 전문 파서입니다.
반드시 JSON 배열만 반환하세요. 설명이나 마크다운 없이 순수 JSON만 출력합니다.

오늘 날짜: ${today} (${dayOfWeek}요일)

추출 규칙:
1. 일정이 아닌 메시지(광고, 인증번호, 단순 안부)는 빈 배열 []을 반환
2. 하나의 메시지에 여러 일정이 있으면 각각 분리하여 추출
3. "담주" = 다음 주, "담달" = 다음 달로 해석
4. 시간이 명시되지 않은 경우 time은 null
5. 확실하지 않은 정보는 포함하지 않음
6. category: "hospital" | "delivery" | "appointment" | "payment" | "travel" | "other"
7. confidence: 0~1 사이 (정보가 명확할수록 높게)`;

    const userPrompt = `다음 메시지에서 일정 정보를 추출하세요:

"""
${message}
"""

JSON 형식:
[{"title": string, "date": "YYYY-MM-DD", "time": "HH:MM" | null, "location": string | null, "category": string, "confidence": number}]`;

    try {
      const response = await this.callAPI(systemPrompt, userPrompt);
      return this.parseResponse(response, message);
    } catch (error) {
      console.error('[LLMParser] API call failed:', error);
      return [];
    }
  }

  /** Claude API 호출 */
  private async callAPI(system: string, user: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '[]';
  }

  /** API 응답을 ParsedSchedule 배열로 변환 */
  private parseResponse(responseText: string, originalMessage: string): ParsedSchedule[] {
    try {
      // JSON 블록 추출 (마크다운 코드블록으로 감싸져 있을 수 있음)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed: Array<{
        title: string;
        date: string;
        time: string | null;
        location: string | null;
        category: string;
        confidence: number;
      }> = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(item => item.title && item.date)
        .map(item => ({
          title: item.title,
          date: item.date,
          time: item.time || undefined,
          location: item.location || undefined,
          category: this.validateCategory(item.category),
          confidence: Math.min(Math.max(item.confidence || 0.5, 0), 1),
          originalMessage,
        }));
    } catch {
      console.error('[LLMParser] Failed to parse response:', responseText);
      return [];
    }
  }

  /** 유효한 카테고리인지 확인 */
  private validateCategory(category: string): EventCategory {
    const valid: EventCategory[] = ['hospital', 'delivery', 'appointment', 'payment', 'travel', 'other'];
    return valid.includes(category as EventCategory) ? (category as EventCategory) : 'other';
  }
}

export default LLMMessageParser;
