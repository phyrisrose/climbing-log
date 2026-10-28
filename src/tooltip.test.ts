import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { placeTooltip } from "./tooltip.ts";

const CONTAINER = { width: 400, height: 300 };
const CARD = { width: 160, height: 60 };
const GAP = 8;

// An 8×8 dot whose top-left corner is at (left, top).
const dot = (left: number, top: number) => ({ left, top, width: 8, height: 8 });

describe("placeTooltip: horizontal", () => {
  test("centers the card on the dot when it fits", () => {
    // dot center 204 − card half 80 = 124
    assert.equal(placeTooltip(dot(200, 150), CONTAINER, CARD).left, 124);
  });

  test("keeps the card inside the right edge", () => {
    // centered would be 314, so its right edge would be at 474 > 400
    assert.equal(placeTooltip(dot(390, 150), CONTAINER, CARD).left, 240);
  });

  test("keeps the card inside the left edge", () => {
    assert.equal(placeTooltip(dot(4, 150), CONTAINER, CARD).left, 0);
  });

  test("keeps the left edge visible when the card is wider than the container", () => {
    const narrow = { width: 120, height: 300 };
    assert.equal(placeTooltip(dot(50, 150), narrow, CARD).left, 0);
    assert.equal(placeTooltip(dot(110, 150), narrow, CARD).left, 0);
  });
});

describe("placeTooltip: vertical", () => {
  test("goes above the dot when there's room", () => {
    // 150 − 8 − 60 = 82
    assert.deepEqual(placeTooltip(dot(200, 150), CONTAINER, CARD), {
      left: 124,
      top: 82,
      placement: "above",
    });
  });

  test("fits exactly above, with no room to spare", () => {
    // room above = 68 − 8 = 60 = card height
    const result = placeTooltip(dot(200, 68), CONTAINER, CARD);
    assert.equal(result.placement, "above");
    assert.equal(result.top, 0);
  });

  test("flips below when there's no room above (the doc comment's example)", () => {
    assert.deepEqual(placeTooltip(dot(100, 50), CONTAINER, CARD), {
      left: 24,
      top: 66, // 50 + 8 + 8
      placement: "below",
    });
  });

  test("flips below near the top-left corner too (both checks are independent)", () => {
    assert.deepEqual(placeTooltip(dot(4, 50), CONTAINER, CARD), {
      left: 0,
      top: 66,
      placement: "below",
    });
  });

  test("when it fits on neither side, uses the side with more room", () => {
    const short = { width: 400, height: 100 };
    // room above 20 − 8 = 12, room below 100 − 36 = 64: below wins
    assert.equal(placeTooltip(dot(200, 20), short, CARD).placement, "below");
    // room above 60 − 8 = 52, room below 100 − 76 = 24: above wins
    assert.equal(placeTooltip(dot(200, 60), short, CARD).placement, "above");
  });

  test("respects a custom gap", () => {
    assert.equal(placeTooltip(dot(200, 150), CONTAINER, CARD, 0).top, 90);
    assert.equal(placeTooltip(dot(200, 150), CONTAINER, CARD, GAP * 2).top, 74);
  });
});
