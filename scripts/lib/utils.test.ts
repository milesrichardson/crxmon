import { describe, it, expect } from "vitest";
import { normalizeThingOrThingifier } from "./utils.js";

describe("normalizeThingOrThingifier", () => {
  const prefixed = (
    prefixOrPrefixer: string | ((prefix: string) => string)
  ) => {
    return normalizeThingOrThingifier(prefixOrPrefixer, "hola");
  };

  it("normalizeThingOrThingifiers a string", () => {
    expect(prefixed("hello")).toBe("hello");
  });

  it("normalizeThingOrThingifiers a function", () => {
    expect(prefixed((prefix) => `${prefix} hello`)).toBe("hola hello");
  });

  it("doesn't normalizeThingOrThingifier null or undefiend", () => {
    // @ts-expect-error It should error
    expect(prefixed((prefix) => undefined)).toBe(undefined);
    // @ts-expect-error It should error
    expect(prefixed(undefined)).toBe(undefined);
    // @ts-expect-error It should error
    expect(prefixed(null)).toBe(null);
    // @ts-expect-error It should error
    expect(prefixed((prefix) => null)).toBe(null);
  });
});
