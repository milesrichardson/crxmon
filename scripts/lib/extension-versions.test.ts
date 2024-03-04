import { describe, it, expect } from "vitest";

import {
  extractExtensionVersionFromString,
  normalizeVersion,
  compareExtensionVersionsAscending,
  compareExtensionVersionsDescending,
} from "./extension-versions.js";

describe("extractExtensionVersionFromString", () => {
  it("extracts a version from a string", () => {
    expect(extractExtensionVersionFromString(`"version": "1"`)).toBe("1");
    expect(extractExtensionVersionFromString(`"version": "1.0"`)).toBe("1.0");
    expect(extractExtensionVersionFromString(`"version": "2.10.2"`)).toBe(
      "2.10.2"
    );
    expect(extractExtensionVersionFromString(`v3.1.2.4567-blahblah"`)).toBe(
      "3.1.2.4567"
    );
  });

  it("normalizes the version when passing normalize: true", () => {
    expect(
      extractExtensionVersionFromString(`"version": "1"`, { normalize: true })
    ).toBe("1.0.0.0");

    expect(
      extractExtensionVersionFromString(`v3.0.1`, { normalize: true })
    ).toBe("3.0.1.0");
  });

  it("extracts only the first 4 parts when more are in string", () => {
    expect(
      extractExtensionVersionFromString(`"version": "3.1.2.4567.890"`)
    ).toBe("3.1.2.4567");
  });
});

describe("normalizeVersion", () => {
  it("throws a TypeError when the version is empty", () => {
    expect(() => normalizeVersion("")).toThrow(TypeError);
  });

  it("throws a TypeError when the version has a non-integer part", () => {
    expect(() => normalizeVersion("1.a")).toThrow(TypeError);
  });

  it("appends `.0` to the version until it has 4 parts", () => {
    expect(normalizeVersion("1")).toBe("1.0.0.0");
  });
});

describe("compareExtensionVersionsAscending", () => {
  it("returns 0 for equal versions", () => {
    expect(compareExtensionVersionsAscending("1", "1")).toBe(0);
    expect(compareExtensionVersionsAscending("1.0", "1.0")).toBe(0);
    expect(compareExtensionVersionsAscending("1.0.0", "1.0.0")).toBe(0);
    expect(compareExtensionVersionsAscending("3", "3.0.0")).toBe(0);
    expect(compareExtensionVersionsAscending("3", "3.0.0.0")).toBe(0);
  });

  it("returns -1 for a < b", () => {
    expect(compareExtensionVersionsAscending("1", "2")).toBe(-1);
    expect(compareExtensionVersionsAscending("1.0", "1.1")).toBe(-1);
    expect(compareExtensionVersionsAscending("1.0.0", "1.0.1")).toBe(-1);
    expect(compareExtensionVersionsAscending("1.0.2", "1.1.0")).toBe(-1);
    expect(compareExtensionVersionsAscending("1.0.9", "2.0.0")).toBe(-1);
  });

  it("returns 1 for a > b", () => {
    expect(compareExtensionVersionsAscending("2", "1")).toBe(1);
    expect(compareExtensionVersionsAscending("1.1", "1.0")).toBe(1);
    expect(compareExtensionVersionsAscending("1.0.1", "1.0.0")).toBe(1);
    expect(compareExtensionVersionsAscending("1.1.0", "1.0.0")).toBe(1);
    expect(compareExtensionVersionsAscending("2.0.0", "1.0.0")).toBe(1);
  });

  it("throws a TypeError for invalid version", () => {
    expect(() => compareExtensionVersionsAscending("1", "a")).toThrow(
      TypeError
    );
    expect(() => compareExtensionVersionsAscending("1.0.0.0.0", "1")).toThrow(
      TypeError
    );
  });

  it("can be used to sort an array of versions in ASCENDING order", () => {
    const sortedVersions = ["55.55.55", "2.0.1", "1.5.6", "7.8.9"]
      .sort(compareExtensionVersionsAscending)
      .join(", ");

    expect(sortedVersions).toBe("1.5.6, 2.0.1, 7.8.9, 55.55.55");
  });
});

describe("compareExtensionVersionsDescending", () => {
  it("returns 0 for equal versions", () => {
    expect(compareExtensionVersionsDescending("1", "1")).toBe(0);
    expect(compareExtensionVersionsDescending("1.0", "1.0")).toBe(0);
    expect(compareExtensionVersionsDescending("1.0.0", "1.0.0")).toBe(0);
    expect(compareExtensionVersionsDescending("3", "3.0.0")).toBe(0);
    expect(compareExtensionVersionsDescending("3", "3.0.0.0")).toBe(0);
  });

  it("returns -1 for b < a", () => {
    expect(compareExtensionVersionsDescending("2", "1")).toBe(-1);
    expect(compareExtensionVersionsDescending("1.1", "1.0")).toBe(-1);
    expect(compareExtensionVersionsDescending("1.0.1", "1.0.0")).toBe(-1);
    expect(compareExtensionVersionsDescending("1.1.0", "1.0.2")).toBe(-1);
    expect(compareExtensionVersionsDescending("2.0.0", "1.0.9")).toBe(-1);
  });

  it("returns 1 for a < b", () => {
    expect(compareExtensionVersionsDescending("1", "2")).toBe(1);
    expect(compareExtensionVersionsDescending("1.0", "1.1")).toBe(1);
    expect(compareExtensionVersionsDescending("1.0.0", "1.0.1")).toBe(1);
    expect(compareExtensionVersionsDescending("1.0.0", "1.1.0")).toBe(1);
    expect(compareExtensionVersionsDescending("1.0.0", "2.0.0")).toBe(1);
  });

  it("throws a TypeError for invalid version", () => {
    expect(() => compareExtensionVersionsDescending("1", "a")).toThrow(
      TypeError
    );
    expect(() => compareExtensionVersionsDescending("1.0.0.0.0", "1")).toThrow(
      TypeError
    );
  });

  it("can be used to sort an array of versions in DESCENDING order", () => {
    const sortedVersions = ["55.55.55", "2.0.1", "1.5.6", "7.8.9"]
      .sort(compareExtensionVersionsDescending)
      .join(", ");

    expect(sortedVersions).toBe("55.55.55, 7.8.9, 2.0.1, 1.5.6");
  });

  it("can be used to sort an array of objects by version in DESCENDING order", () => {
    const versions = [
      { version: "55.55.55" },
      { version: "2.0.1" },
      { version: "1.5.6" },
      { version: "7.8.9" },
    ];

    const sortedVersions = versions
      .sort((a, b) => compareExtensionVersionsDescending(a.version, b.version))
      .map((v) => v.version)
      .join(", ");

    expect(sortedVersions).toBe("55.55.55, 7.8.9, 2.0.1, 1.5.6");
  });
});
