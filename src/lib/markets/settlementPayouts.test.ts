import { describe, expect, it } from "vitest";
import { computeRefunds, computeWinPayouts } from "./settlementPayouts";

describe("computeWinPayouts", () => {
  it("matches the Go plan example", () => {
    const bets = [
      { id: "a", side: "yes", shares: 3, amount: 15_000 },
      { id: "b", side: "no", shares: 2, amount: 10_000 },
      { id: "c", side: "yes", shares: 1, amount: 5_000 },
    ];
    const got = computeWinPayouts(bets, "yes", 5, 5_000);
    expect(got.get("a")).toBe(21_375);
    expect(got.get("c")).toBe(7_125);
    expect(got.get("b")).toBe(0);
    expect([...got.values()].reduce((s, n) => s + n, 0)).toBe(28_500);
  });

  it("waives fee when stake would not be recovered", () => {
    const bets = [{ id: "a", side: "yes", shares: 1, amount: 5_000 }];
    const got = computeWinPayouts(bets, "yes", 5, 5_000);
    expect(got.get("a")).toBe(5_000);
  });

  it("does not pay seed liquidity", () => {
    const bets = [{ id: "a", side: "yes", shares: 1, amount: 5_000 }];
    const got = computeWinPayouts(bets, "yes", 5, 5_000);
    expect(got.get("a")).toBe(5_000);
  });

  it("pays 0 when there are no winning shares", () => {
    const bets = [{ id: "a", side: "no", shares: 2, amount: 10_000 }];
    const got = computeWinPayouts(bets, "yes", 5, 0);
    expect(got.get("a")).toBe(0);
  });

  it("refunds full stake", () => {
    const bets = [
      { id: "a", side: "yes", shares: 3, amount: 15_000 },
      { id: "b", side: "no", shares: 2, amount: 10_000 },
    ];
    const got = computeRefunds(bets);
    expect(got.get("a")).toBe(15_000);
    expect(got.get("b")).toBe(10_000);
  });
});
