import { chalk, log } from "zx";
import fs from "node:fs";
import path from "path";

// We need to use a (rather old) package specifically for unzipping crx3 files
// because the various zip extraction packages break with crx3 files.
import unzipCrx from "unzip-crx-3";

// TODO: Hardcoded extension for debugging
const EXT_IDS = {
  GOOGLE_TRANSLATE: "aapbdbdomjkkjkaonfhkkikfgjllcleb",
} as const;

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

const YarnVars: EnvironmentVariablesFromYarn = {
  PROJECT_CWD: process.env.PROJECT_CWD,
};

const getExtensionPath = async ({ extensionId }: { extensionId: string }) => {
  if (!YarnVars.PROJECT_CWD) {
    throw new Error("PROJECT_CWD is not set - is script running via Yarn?");
  }

  const extensionPath = path.join(
    YarnVars.PROJECT_CWD,
    "extensions",
    extensionId
  );

  return extensionPath;
};

const downloadExtension = async ({ extensionId }: { extensionId: string }) => {
  try {
    const downloadURL = makeDownloadURL({ extensionId });

    const extensionPath = await getExtensionPath({ extensionId });

    const extensionZipPath = extensionPath + ".zip";
    const extensionUnzippedPath = extensionPath;

    const response = await fetch(downloadURL, { redirect: "follow" });

    if (!response.ok || !response.body) {
      throw new Error(`Unexpected response ${response.statusText}`);
    }

    await fs.promises.writeFile(extensionZipPath, response.body);

    await fs.promises.rm(extensionUnzippedPath, {
      recursive: true,
      force: true,
    });

    await unzipCrx(extensionZipPath, extensionUnzippedPath);

    await fs.promises.rm(extensionZipPath);

    log({
      kind: "stdout",
      verbose: true,
      data: Buffer.from(`Saved to ${chalk.yellow(extensionPath)}`, "utf8"),
    });
  } catch (error) {
    log({
      kind: "stderr",
      verbose: true,
      data: Buffer.from(
        `ERR: Failed to download and unzip extension ${extensionId}: ${error}`,
        "utf8"
      ),
    });
  }
};

await downloadExtension({ extensionId: EXT_IDS.GOOGLE_TRANSLATE });

// Make the global Fetch API compatible with streaming response.body to file
// NOTE: This can't go in scripts.d.ts because it requires importing node:stream/web (?)
import type * as streamWeb from "node:stream/web";
declare global {
  interface Response {
    readonly body: streamWeb.ReadableStream<Uint8Array> | null;
  }
}
