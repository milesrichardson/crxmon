import { argv, chalk, fs, path } from "zx";
import { GET_YARN_VAR } from "./lib/YarnVars.js";

import { scrapeVersionDetailPage } from "./lib/crx4chrome-scraper.js";

import type { CriticalDetailPageMetadata } from "./lib/crx4chrome-scraper.js";
import { downloadExtension } from "./lib/download-extension.js";
import { prettifyExtension } from "./lib/prettify-extension.js";

import { computeChecksums, fileExistsAndIsReadable } from "./lib/fs-util.js";
import type { MultiChecksum } from "./lib/fs-util.js";

const main = async () => {
  switch (argv._[0]) {
    case "package-regex":
      await testPackageVersionsRegex();
      break;
    case "sample-metadata":
      await scrapeRandomPackagesForMetadataSample();
      break;
    case "download-history":
      await downloadExtensionHistory();
      break;
    case "print-versions":
      await printVersions();
      break;
    case "checksums":
      await getChecksums(argv._[1]);
      break;
    case "install-state":
      await createInstallStateFile(
        "grammarly-sorted.json",
        "grammarly-error-log.json"
      );
      break;
    case "install-state-by-version":
      await createInstallStateByVersionFile();
      break;
    case "inspect-install-state":
      await inspectInstallStateByVersion();
      break;
    case "create-prune-script":
      await createPruneScript();
      break;
    default:
      console.log(chalk.red("Invalid command"));
      break;
  }
};

const writeLinesToFile = async (lines: string[], pathFromRepoRoot: string) => {
  await fs.writeFile(
    path.join(
      GET_YARN_VAR("PROJECT_CWD"),
      ...(Array.isArray(pathFromRepoRoot)
        ? pathFromRepoRoot
        : [pathFromRepoRoot])
    ),
    lines.join("\n"),
    {
      encoding: "utf-8",
    }
  );
};

const writeJSONToFile = async (
  object: any,
  pathFromRepoRoot: string | string[]
) => {
  await fs.writeFile(
    path.join(
      GET_YARN_VAR("PROJECT_CWD"),
      ...(Array.isArray(pathFromRepoRoot)
        ? pathFromRepoRoot
        : [pathFromRepoRoot])
    ),
    JSON.stringify(object, null, 2),
    {
      encoding: "utf-8",
    }
  );
};

const readJSONFromFile = async <Shape>(pathFromRepoRoot: string | string[]) => {
  return JSON.parse(
    await fs.readFile(
      path.join(
        GET_YARN_VAR("PROJECT_CWD"),
        ...(Array.isArray(pathFromRepoRoot)
          ? pathFromRepoRoot
          : [pathFromRepoRoot])
      ),
      {
        encoding: "utf-8",
      }
    )
  ) as Shape;
};

const getMetadataSample = async () => {
  return await readJSONFromFile<any>("metadata-sampling.json");
};

const testPackageVersionsRegex = async () => {
  const metadataSample = await getMetadataSample();

  const packageVersions: string[] = metadataSample[0]["package-version"];

  const versionRegex = /\d+((\.(\d+\.){0,2})(\d+))?/gm;

  for (const version of packageVersions) {
    const matches = version.match(versionRegex);

    if (!matches) {
      console.log(chalk.red("NO: "), version);
    } else {
      console.log(
        chalk.green("match:"),
        version,
        "--->",
        chalk.green(matches[0])
      );
    }
  }
};

/**
 * Using the random-crx.txt file, scrape the version detail page for each CRX,
 * and print JSON to stdout containing all the observed values
 * and put it into a metadata-sampling.json file to show the observed metadata keys
 */
const scrapeRandomPackagesForMetadataSample = async () => {
  const randomCrxFile = path.join(
    GET_YARN_VAR("PROJECT_CWD"),
    "zips",
    "sitemaps",
    "random-crx.txt"
  );

  const SAMPLE_N = 10_000;

  /** The random-crx.txt file contains the URL, we just need the number */
  const crxNumbers = (await fs.readFile(randomCrxFile))
    .toString()
    .split("\n")
    .map((url) => url.slice("https://www.crx4chrome.com/crx/".length, -1))
    .slice(0, SAMPLE_N);

  const allMetadataKeys = new Set<string>();

  const metadataValueExamples: Record<string, string[]> & {
    ["more-about"]?: string[][];
  } = {};

  const errorDetails = [];
  const errorNumbers = [];

  for (const crxNumber of crxNumbers) {
    try {
      const { metadata: _m, rawMetadata } = await scrapeVersionDetailPage(
        `/crx/${crxNumber}/`
      );

      const rawMetadataKeys = Object.keys(rawMetadata.metadata);
      for (const key of rawMetadataKeys) {
        allMetadataKeys.add(key);
        const value: string =
          rawMetadata.metadata[key as keyof typeof rawMetadata.metadata]!;

        if (key.startsWith("more-about-")) {
          if (!("more-about" in metadataValueExamples)) {
            metadataValueExamples["more-about"] = [];
          }

          if (
            metadataValueExamples["more-about"]!.length < SAMPLE_N &&
            !metadataValueExamples["more-about"]!.find((x) => x[1] === key)
          ) {
            metadataValueExamples["more-about"]!.push([value, key]);
          }
        } else {
          if (!(key in metadataValueExamples)) {
            metadataValueExamples[key] = [];
          }

          if (
            metadataValueExamples[key].length < SAMPLE_N &&
            !metadataValueExamples[key].includes(value)
          ) {
            metadataValueExamples[key].push(value);
          }
        }
      }
    } catch (e: any) {
      errorNumbers.push(crxNumber);
      errorDetails.push([crxNumber, e.message]);
    }
  }

  console.log(
    JSON.stringify(
      {
        examples: metadataValueExamples,
        errorDetails,
        errorNumbers,
        allMetadataKeys: Array.from(allMetadataKeys).sort(),
      },
      null,
      2
    )
  );
};

type DownloadParams = Required<Parameters<typeof downloadExtension>[0]>;

type DownloadLogItem = DownloadParams &
  (
    | { success: true; loading: false; urlExists: boolean }
    | { success: null; loading: true; urlExists: boolean }
    | { success: null; loading: true; urlExists: null }
    | {
        loading: false;
        success: false;
        urlExists: boolean;
        errors: { code: string; error: any }[];
      }
  );

type MetadataFileJSON = {
  overview: { extensionId: string };
  versions: { detail: CriticalDetailPageMetadata }[];
};

const generateDownloadParamsFromMetadata = (metadata: MetadataFileJSON) => {
  const {
    overview: { extensionId },
    versions,
  } = metadata;

  const downloads: DownloadParams[] = versions.reduce(
    (acc, { detail: versionDetail }) => [
      ...acc,
      ...[
        {
          source: "google",
          downloadURL: versionDetail.crx.google,
        },
        ...(versionDetail.crx.crx4chrome
          ? [
              {
                source: "crx4chrome",
                downloadURL: versionDetail.crx.crx4chrome,
              },
            ]
          : []),
      ].map(
        ({ source, downloadURL }): DownloadParams => ({
          throwErrors: true,
          downloadURL,
          extensionId,
          extensionPath: path.join(
            GET_YARN_VAR("PROJECT_CWD"),
            ".data",
            "extensions",
            extensionId,
            versionDetail.version,
            source
          ),
          extensionZipPath: path.join(
            GET_YARN_VAR("PROJECT_CWD"),
            ".data",
            "extensions",
            extensionId,
            versionDetail.version,
            source + ".crx"
          ),
          keepZip: true,
          writeKeyToManifest: true,
        })
      ),
    ],
    [] as DownloadParams[]
  );

  return downloads;
};

const downloadExtensionHistory = async () => {
  const metadata = await readJSONFromFile<MetadataFileJSON>(
    "grammarly-sorted.json"
  );

  const downloads = generateDownloadParamsFromMetadata(metadata);

  const {
    overview: { extensionId },
  } = metadata;

  console.log(JSON.stringify(downloads, null, 2));

  const downloadLog: DownloadLogItem[] = await readJSONFromFile(
    "grammarly-error-log.json"
  );

  for (const download of downloads) {
    const { exists, error } = await urlExists(download.downloadURL)
      .then((exists) => ({ exists, error: null }))
      .catch((error: any) => ({ exists: { ok: false, status: 0 }, error }));

    if (!exists.ok) {
      downloadLog.push({
        ...download,
        urlExists: false,
        success: false,
        loading: false,
        errors: [
          error
            ? {
                code: "ERR_CHECKING_URL_EXISTS",
                error: "Error when checking URL exists",
              }
            : { code: "URL_NOT_FOUND", error: exists },
        ],
      });
      writeJSONToFile(downloadLog, "grammarly-error-log.json");
      continue;
    }

    downloadLog.push({
      ...download,
      urlExists: true,
      success: null,
      loading: true,
    });
    writeJSONToFile(downloadLog, "grammarly-error-log.json");

    try {
      await fs.ensureDir(download.extensionPath);
      await fs.ensureDir(path.dirname(download.extensionZipPath));

      await downloadExtension(download);

      downloadLog.push({
        ...downloadLog.pop()!,
        success: true,
        loading: false,
        urlExists: true,
      });
      writeJSONToFile(downloadLog, "grammarly-error-log.json");
    } catch (error: any) {
      downloadLog.push({
        ...downloadLog.pop()!,
        urlExists: true,
        success: false,
        loading: false,
        errors: [
          {
            code: "ERR_DOWNLOADING",
            error,
          },
        ],
      });
      writeJSONToFile(downloadLog, "grammarly-error-log.json");
      continue;
    }

    try {
      await prettifyExtension({
        extensionId,
        extensionPath: download.extensionPath,
      });
      // (No need to push log because it's already marked as success)
    } catch (error: any) {
      downloadLog.push({
        ...downloadLog.pop()!,
        success: false,
        loading: false,
        urlExists: true,
        errors: [
          {
            code: "ERR_PRETTIFYING",
            error,
          },
        ],
      });
      writeJSONToFile(downloadLog, "grammarly-error-log.json");
    }
  }
  // downloadExtension
};

const urlExists = async (url: string) => {
  const response = await fetch(url, { method: "HEAD" });

  return {
    ok: response.ok,
    status: response.status,
  };
};

const printVersions = async () => {
  const { versions } = await readJSONFromFile<MetadataFileJSON>(
    "grammarly-sorted.json"
  );

  for (const [index, { detail }] of versions.slice(88).entries()) {
    console.log(index, detail.version);
  }
};

const getChecksums = async (filename: string) => {
  if (!filename) {
    throw new Error("getChecksums expects a file");
  }

  if (!(await fileExistsAndIsReadable(filename))) {
    throw new Error("File does not exist or is not readable: " + filename);
  }

  const checksums = await computeChecksums(filename);

  console.log(JSON.stringify(checksums, null, 2));
};

type ChecksumMismatch = {
  algo: string;
  error: "MISMATCH_LEADING_ZERO" | "MISMATCH_WARNING" | "MISMATCH" | "MISSING";
  expected: string;
  actual?: string;
};

type InstallStateEntry = {
  versionDetail: CriticalDetailPageMetadata;
  downloadState: DownloadLogItem;
  installState?: {
    checksums: MultiChecksum;
    checksumsMatch: boolean;
    checksumMismatches: ChecksumMismatch[];
    checksumWarnings: ChecksumMismatch[];
  };
  /** The download was marked as not successful, but we check it anyway */
  potentialFalseAlarm?: boolean;
  errors?: { code: string; error: any }[];
};

const createInstallStateFile = async (
  metadataFile: string,
  buildLogFile: string,
  resume = true
) => {
  const currentInstallState = resume
    ? await readJSONFromFile<InstallStateEntry[]>(
        "install-state-log.json"
      ).catch((_) => {
        console.info("Error reading install-state-log.json, starting fresh...");
        return [];
      })
    : [];

  const metadata = await readJSONFromFile<MetadataFileJSON>(metadataFile);
  const buildLog = await readJSONFromFile<DownloadLogItem[]>(buildLogFile);

  const expectedDownloadItems = generateDownloadParamsFromMetadata(metadata);

  const installState: InstallStateEntry[] = [];

  for (const [index, downloadState] of expectedDownloadItems.entries()) {
    console.log(
      `[${index + 1}/${expectedDownloadItems.length}]: `,
      downloadState.extensionZipPath
    );

    const existingEntry = currentInstallState.find(
      (entry) =>
        entry.downloadState.extensionPath === downloadState.extensionPath
    );

    if (existingEntry) {
      if (existingEntry.installState?.checksumsMatch) {
        console.log("Skipping (already checked):", downloadState.extensionPath);
        installState.push(existingEntry);
        continue;
      } else {
        console.log(
          "RECOMPUTE (checksums mismatch)",
          downloadState.extensionPath
        );
      }
    }

    const metadataEntry = metadata.versions.find(
      ({ detail: { crx } }) =>
        (!!crx.google && crx.google === downloadState.downloadURL) ||
        (!!crx.crx4chrome && crx.crx4chrome === downloadState.downloadURL)
    );

    if (!metadataEntry) {
      throw new Error(
        "No metadata entry for download state: " + downloadState.extensionPath
      );
    }

    const buildLogEntry = buildLog.find(
      (entry) => entry.extensionPath === downloadState.extensionPath
    );

    if (!buildLogEntry) {
      console.warn("No build log entry for", downloadState.extensionPath);
      continue;
    }

    let potentialFalseAlarm = false;
    if (!buildLogEntry?.success) {
      console.info(
        "Build log entry not successful for",
        downloadState.extensionPath
      );

      const { errors } = buildLogEntry as { errors?: { code: string }[] };

      if (
        errors &&
        errors.length === 1 &&
        errors[0].code === "ERR_DOWNLOADING"
      ) {
        console.log(
          "....BUT, it might have been a false alarm (ERR_DOWNLOADING)"
        );
        potentialFalseAlarm = true;
      } else {
        continue;
      }
    }

    try {
      const checksums = await computeChecksums(downloadState.extensionZipPath);

      const expectedChecksums = metadataEntry.detail.hashes;

      const checksumMismatches: ChecksumMismatch[] = [];
      const checksumWarnings: ChecksumMismatch[] = [];

      for (const [algo, expectedChecksum] of Object.entries(
        expectedChecksums
      )) {
        if (!(algo in checksums)) {
          console.warn(
            "No algo <",
            algo,
            "> in checksums for",
            downloadState.extensionZipPath
          );
          checksumMismatches.push({
            algo,
            error: "MISSING",
            expected: expectedChecksum,
          });
        } else if (
          checksums[algo as keyof typeof checksums] !== expectedChecksum
        ) {
          let actual = checksums[algo as keyof typeof checksums];

          // If expected checksum is any number of leading zeroes followed by actual checksum, consider it a match
          // e.g. Expected 008a985d; actual 8a985d ... should be a match
          if (
            algo === "crc32" &&
            expectedChecksum.endsWith(actual) &&
            /^0+$/.test(expectedChecksum.split(actual)[0])
          ) {
            console.log(
              "MISMATCH (leading zeroes)",
              algo,
              downloadState.extensionZipPath
            );
            checksumWarnings.push({
              algo,
              error: "MISMATCH_LEADING_ZERO",
              expected: expectedChecksum,
              actual,
            });
          } else if (
            algo === "crc32" &&
            Object.entries(expectedChecksums).length > 1
          ) {
            // crc32 is too finnicky, so we'll add it only to warnings, as long as there
            // are other hashes that can match.
            console.warn(
              "MISMATCH(warning, crc32)",
              algo,
              downloadState.extensionZipPath
            );
            checksumWarnings.push({
              algo,
              error: "MISMATCH_WARNING",
              expected: expectedChecksum,
              actual,
            });
          } else {
            console.warn("MISMATCH!", algo, downloadState.extensionZipPath);
            checksumMismatches.push({
              algo,
              error: "MISMATCH",
              expected: expectedChecksum,
              actual,
            });
          }
        }
      }

      installState.push({
        versionDetail: metadataEntry.detail,
        downloadState,
        installState: {
          checksums: checksums,
          checksumMismatches: checksumMismatches,
          checksumWarnings: checksumWarnings,
          checksumsMatch: checksumMismatches.length === 0,
        },
        potentialFalseAlarm,
      } as InstallStateEntry);
    } catch (err) {
      console.error(
        "Error computing checksums for",
        downloadState.extensionZipPath,
        err
      );
      installState.push({
        versionDetail: metadataEntry.detail,
        downloadState,
        errors: [{ code: "ERR_COMPUTING_CHECKSUMS", error: err }],
        potentialFalseAlarm,
      } as InstallStateEntry);
    }

    await writeJSONToFile(installState, "install-state-log.json");
  }

  await writeJSONToFile(installState, "install-state-log.json");
};

type InstallStateByVersion = {
  [version: string]: {
    copies: InstallStateEntry[];
    warnings: { code: string; details: any }[];
  };
};

const createInstallStateByVersionFile = async () => {
  const installStateByVersion: InstallStateByVersion = {};

  const installStateLog = await readJSONFromFile<InstallStateEntry[]>(
    "install-state-log.json"
  ).catch((_) => {
    console.info("Error reading install-state-log.json, starting fresh...");
    return [];
  });

  for (const entry of installStateLog) {
    if (!(entry.versionDetail.version in installStateByVersion)) {
      installStateByVersion[entry.versionDetail.version] = {
        copies: [],
        warnings: [],
      };
    }

    if (
      installStateByVersion[entry.versionDetail.version].copies.find(
        (copy) =>
          copy.downloadState.extensionZipPath ===
          entry.downloadState.extensionZipPath
      )
    ) {
      installStateByVersion[entry.versionDetail.version].warnings.push({
        code: "DUPLICATE_ENTRY",
        details: entry,
      });
      continue;
    }

    installStateByVersion[entry.versionDetail.version].copies.push(entry);
  }

  await writeJSONToFile(installStateByVersion, "install-state-by-version.json");
};

const inspectInstallStateByVersion = async () => {
  const installStateByVersion = await readJSONFromFile<InstallStateByVersion>(
    "install-state-by-version.json"
  );

  for (const [version, { copies }] of Object.entries(installStateByVersion)) {
    if (copies.length === 1) {
      continue;
    }

    const uniqueChecksums = new Set<string>();
    for (const copy of copies) {
      uniqueChecksums.add(
        JSON.stringify(copy.installState?.checksums, null, 2)
      );
    }

    if (uniqueChecksums.size > 1) {
      console.error("VERSION:", version, "has different checksums");
    }

    console.log(version, copies.length);
  }
};

/**
 * Grammarly size comparison
 * Before dupes:
 *  621 crx files
 *  Metadata has 507 versions (~505 unique?)
 *  116 duplicates (makes sense -> 621-116 = 505)
 *  Total disk usage:  33.4 GiB  Apparent size:  33.2 GiB  Items: 168,349
 *
 * After delete (116 dupes):
 *  505 crx files
 *  Total disk usage:  22.5 GiB  Apparent size:  22.4 GiB  Items: 106,018
 *
 */
const createPruneScript = async () => {
  const installStateByVersion = await readJSONFromFile<InstallStateByVersion>(
    "install-state-by-version.json"
  );

  const cmds: string[] = ["NUM_DUPES_TO_DELETE=0"];

  let numDupesToDelete = 0;

  for (const [version, { copies }] of Object.entries(installStateByVersion)) {
    if (copies.length === 1) {
      continue;
    }

    const uniqueChecksums = new Set<string>();
    for (const copy of copies) {
      uniqueChecksums.add(
        JSON.stringify(copy.installState?.checksums, null, 2)
      );
    }

    if (uniqueChecksums.size > 1) {
      console.error("VERSION:", version, "has different checksums");
      continue;
    }

    // Prefer google.crx (NOTE: There could be duplicates, but that's okay because we know
    // we only downloaded them once. So when pruning, make sure to filter by NOT the one we want to keep)
    const copiesToDelete = copies.filter(
      (copy) => !copy.downloadState.extensionZipPath.endsWith("/google.crx")
    );

    cmds.push(`# ${version} has ${copies.length} copies`);
    for (const {
      downloadState: { extensionPath, extensionZipPath },
    } of copiesToDelete) {
      numDupesToDelete += 1;
      cmds.push(
        `echo "[${numDupesToDelete}/$NUM_DUPES_TO_DELETE]: Deleting ${version} dupe"`
      );

      cmds.push(
        `rm -rf "${extensionPath}" || { echo "ERROR deleting path: ${extensionPath}"; }`
      );
      cmds.push(
        `rm "${extensionZipPath}" || { echo "ERROR deleting zip: ${extensionZipPath}"; }`
      );
    }
    cmds.push("");
    cmds.push("");
  }

  cmds[0] = `NUM_DUPES_TO_DELETE=${numDupesToDelete}`;

  writeLinesToFile(cmds, "prune-dupes.sh");
  console.log(cmds.join("\n"));
  console.error("Also wrote to prune-dupes.sh");
};

// TODO: After cleanup, move non-dupes to canonical

await main();
