import type { Topic, TopicPayloads } from "./topics.js";

export type Handler<T extends Topic> = (payload: TopicPayloads[T]) => void | Promise<void>;
export type Unsubscribe = () => void;

export interface IEventBus {
  publish<T extends Topic>(topic: T, payload: TopicPayloads[T]): Promise<void>;
  subscribe<T extends Topic>(topic: T, handler: Handler<T>): Unsubscribe;
  /** 와일드카드 구독: `trader.*` 처럼 prefix 매칭. payload 는 unknown 으로 폴백. */
  subscribePattern(pattern: string, handler: (topic: Topic, payload: unknown) => void | Promise<void>): Unsubscribe;
  close(): Promise<void>;
}
