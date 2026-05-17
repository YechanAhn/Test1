import { describe, it, expect } from "vitest";
import { topicMatches } from "../topics.js";

describe("topicMatches", () => {
  it("정확 일치", () => {
    expect(topicMatches("trader.order", "trader.order")).toBe(true);
  });
  it("와일드카드 prefix 매칭", () => {
    expect(topicMatches("trader.*", "trader.order")).toBe(true);
    expect(topicMatches("trader.*", "trader.fill")).toBe(true);
    expect(topicMatches("trader.*", "watcher.alert")).toBe(false);
  });
  it("다른 경계는 매칭하지 않는다", () => {
    expect(topicMatches("trader.*", "traders.order")).toBe(false);
  });
});
