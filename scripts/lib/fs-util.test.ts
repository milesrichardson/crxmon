import { describe, it, expect } from "vitest";
import { computeChecksum, computeChecksums } from "./fs-util.js";
import { GET_YARN_VAR } from "./YarnVars.js";
import path from "path";

const testFile = path.join(
  GET_YARN_VAR("PROJECT_CWD"),
  ".data",
  "fixtures",
  "random-1200kb.bin"
);

// As manually computed in bash, with commands: md5sum, sha1sum, sha256sum, sha512sum, crc32
const expectedChecksums = {
  md5: "f60976897889e052fc8d7b4aeaffb6a8",
  sha1: "28363a44879d4a5a2e6384a1683e1870bdaf7e88",
  sha256: "a45c7456a6772d53a290502c4274a0b3a91132b4ae74994c72ac147ab35d1303",
  sha512:
    "38dee040e0b5ffb29027253de41d33883cb7fbf011763d7613228cddd3ee3021257326e3addd5d287588e83e6a6f2f8eef65cb846ddda9c8e9d80d74f1e75cfc",
  crc32: "330730fa",
};

describe("computeChecksum", async () => {
  it("computes md5", async () => {
    const md5 = await computeChecksum(testFile, "md5");
    expect(md5).toBe(expectedChecksums.md5);
  });

  it("computes sha1", async () => {
    const sha1 = await computeChecksum(testFile, "sha1");
    expect(sha1).toBe(expectedChecksums.sha1);
  });

  it("computes sha256", async () => {
    const sha256 = await computeChecksum(testFile, "sha256");
    expect(sha256).toBe(expectedChecksums.sha256);
  });

  it("computes crc32", async () => {
    const crc32 = await computeChecksum(testFile, "crc32");
    expect(crc32).toBe(expectedChecksums.crc32);
  });
});

describe("computeChecksums", async () => {
  it("computes all checksums", async () => {
    const checksums = await computeChecksums(testFile);
    expect(checksums).toEqual(expectedChecksums);
    expect(checksums).toMatchInlineSnapshot(`
      {
        "crc32": "${expectedChecksums.crc32}",
        "md5": "${expectedChecksums.md5}",
        "sha1": "${expectedChecksums.sha1}",
        "sha256": "${expectedChecksums.sha256}",
        "sha512": "${expectedChecksums.sha512}",
      }
    `);
  });
});
