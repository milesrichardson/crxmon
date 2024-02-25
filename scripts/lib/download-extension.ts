import { chalk } from "zx";
import fs from "node:fs";
import path from "path";

// We need to use a (rather old) package specifically for unzipping crx3 files
// because the various zip extraction packages break with crx3 files.
import unzipCrx from "unzip-crx-3";

import {
  getExtensionPath,
  getExtensionZipPath,
  removeExtension,
  maybeRemoveExtensionZip,
} from "./extension-fs.js";

import { getExtensionPublicKey } from "./extension-crypto.js";

export const downloadExtension = async ({
  extensionId,
  keepZip = false,
  writeKeyToManifest = false,
}: {
  extensionId: string;
  keepZip?: boolean;
  writeKeyToManifest?: boolean;
}) => {
  try {
    const downloadURL = makeDownloadURL({ extensionId });

    const extensionPath = getExtensionPath({ extensionId });
    const extensionZipPath = getExtensionZipPath({ extensionId });

    const response = await fetch(downloadURL, { redirect: "follow" });

    if (!response.ok || !response.body) {
      throw new Error(`Unexpected response ${response.statusText}`);
    }

    await fs.promises.writeFile(extensionZipPath, response.body);

    await removeExtension({ extensionId });
    await unzipCrx(extensionZipPath, extensionPath);

    if (writeKeyToManifest) {
      console.log("Extracting public key from crx:", extensionZipPath);
      const extPubKey = await getExtensionPublicKey(extensionZipPath);
      console.log("Writing key to manifest.json:", chalk.green(extPubKey));
      const manifestPath = path.join(extensionPath, "manifest.json");
      const manifestJson = await fs.promises.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestJson);

      if (!extPubKey) {
        throw new Error("Failed to extract public key from crx");
      }

      if (manifest.key) {
        console.log("WARN: manifest already has key:", manifest.key);

        if (manifest.key === extPubKey) {
          console.log("INFO: manifest key is already set to the same");
        } else {
          console.log("WARN: overwriting different manifest key", manifest.key);
        }
      }

      manifest.key = extPubKey;
      const newManifestJson = JSON.stringify(manifest, null, 2);
      await fs.promises.writeFile(manifestPath, newManifestJson);
    }

    if (!keepZip) {
      await maybeRemoveExtensionZip({ extensionId });
    } else {
      console.log(
        [
          `Kept zip file at ${chalk.yellow(
            extensionZipPath
          )}, but next download will overwrite it.`,
          "So make sure to move it if you want to keep it.",
        ].join("\n")
      );
    }

    console.log(`Saved to ${chalk.yellow(extensionPath)}`);
  } catch (error) {
    console.error(
      `ERR: Failed to download and unzip extension ${extensionId}: ${error}`
    );

    // Cleanup if possible: remove the extension directory and/or its zip file
    await removeExtension({ extensionId });
    await maybeRemoveExtensionZip({ extensionId });
  }
};

const makeDownloadURL = ({ extensionId }: { extensionId: string }) => {
  // TODO: Generate these based on the environment (and/or see which actually matter)
  const searchParams = new URLSearchParams({
    response: "redirect",
    os: "mac",
    arch: "x64",
    os_arch: "x86_64",
    nacl_arch: "x86-64",
    prod: "chromecrx",
    prodchannel: "canary",
    prodversion: "121.0.6116.0",
    lang: "en-US",
    acceptformat: "crx3,puff",
  });

  // circumvent URLSearchParams default encoding because we want x to be a single
  // param that is already percent encoded (we don't want to encode it twice)
  const encodedTrailer = `x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;

  const baseURL = `https://clients2.google.com/service/update2/crx`;

  return `${baseURL}?${searchParams.toString()}&${encodedTrailer}`;
};

// Make the global Fetch API compatible with streaming response.body to file
// NOTE: This can't go in scripts.d.ts because it requires importing node:stream/web (?)
import type * as streamWeb from "node:stream/web";
declare global {
  interface Response {
    readonly body: streamWeb.ReadableStream<Uint8Array> | null;
  }
}
