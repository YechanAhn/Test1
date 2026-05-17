import type { Handler, IEventBus, Unsubscribe } from "./IEventBus.js";
import { type Topic, type TopicPayloads, topicMatches } from "./topics.js";

type AnyHandler = (payload: unknown) => void | Promise<void>;
type PatternHandler = (topic: Topic, payload: unknown) => void | Promise<void>;

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<AnyHandler>>();
  private patternHandlers = new Map<string, Set<PatternHandler>>();
  private closed = false;

  async publish<T extends Topic>(topic: T, payload: TopicPayloads[T]): Promise<void> {
    if (this.closed) throw new Error("bus closed");
    const exact = this.handlers.get(topic);
    if (exact) {
      for (const h of exact) await h(payload);
    }
    for (const [pattern, set] of this.patternHandlers) {
      if (topicMatches(pattern, topic)) {
        for (const h of set) await h(topic, payload);
      }
    }
  }

  subscribe<T extends Topic>(topic: T, handler: Handler<T>): Unsubscribe {
    let set = this.handlers.get(topic);
    if (!set) {
      set = new Set();
      this.handlers.set(topic, set);
    }
    set.add(handler as AnyHandler);
    return () => set!.delete(handler as AnyHandler);
  }

  subscribePattern(pattern: string, handler: PatternHandler): Unsubscribe {
    let set = this.patternHandlers.get(pattern);
    if (!set) {
      set = new Set();
      this.patternHandlers.set(pattern, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.handlers.clear();
    this.patternHandlers.clear();
  }
}
