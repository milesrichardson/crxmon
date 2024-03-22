import fs from "node:fs";

import crypto from "node:crypto";

import { Crc32 } from "@aws-crypto/crc32";

const algorithms = ["md5", "sha1", "sha256", "sha512", "crc32"] as const;

type ChecksumAlgorithm = (typeof algorithms)[number];

export type MultiChecksum = { [K in (typeof algorithms)[number]]: string };

export const fileExistsAndIsReadable = async (
  filePath: string
): Promise<boolean> => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

export const computeChecksum = async (
  filename: string,
  algo: ChecksumAlgorithm
): Promise<string> => {
  if (!(await fileExistsAndIsReadable(filename))) {
    throw new Error(`File does not exist or is not readable: ${filename}`);
  }

  const hash = algo === "crc32" ? new Crc32() : crypto.createHash(algo);
  const fileStream = fs.createReadStream(filename);

  return new Promise((resolve, reject) => {
    fileStream.on("data", (data: Buffer) => hash.update(data));
    fileStream.on("end", async () =>
      resolve(
        algo === "crc32"
          ? (hash as Crc32).digest().toString(16) // convert Uint8Array to hex
          : (hash as crypto.Hash).digest("hex")
      )
    );
    fileStream.on("error", reject);
  });
};

export const computeChecksums = async (
  filename: string
): Promise<MultiChecksum> => {
  return (
    await Promise.all(algorithms.map((algo) => computeChecksum(filename, algo)))
  ).reduce(
    (checksums, checksum, i) => ({ ...checksums, [algorithms[i]]: checksum }),
    {} as MultiChecksum
  );
};
