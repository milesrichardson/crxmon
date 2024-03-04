/**
 * Extract (the first) valid version found in the given string. For example,
 * if the string is `v8.1.2.3-foobar`, then extract `8.1.2.3`.
 *
 * If no version is found, throw a TypeError.
 *
 * If "normalize" is set to `true`, then also call `normalizeVersion` on the
 * returned version, which will append a `.0` to the version until it has 4 parts.
 *
 * A valid version is "one to four dot-separated integers".
 *
 * Here are some examples of valid versions:
 *
 *  * `"version": "1"`
 *  * `"version": "1.0"`
 *  * `"version": "2.10.2"`
 *  * `"version": "3.1.2.4567"`
 *
 * This is defined by the Chrome extension manifest spec, which in turn is based
 * on the Omaha update protocol.
 *
 * For more, see:
 *  * https://developer.chrome.com/docs/extensions/reference/manifest/version
 *  * https://chromium.googlesource.com/chromium/src.git/+/master/docs/updater/protocol_3_1.md#Version-Numbers
 */
export const extractExtensionVersionFromString = (
  maybeVersionString: string,
  opts: {
    normalize?: boolean;
  } = { normalize: false }
) => {
  const versionRegex = /\d+((\.(\d+\.){0,2})(\d+))?/;

  const matches = maybeVersionString.match(versionRegex);

  if (!matches || !matches[0]) {
    throw new TypeError(`No valid version found in "${maybeVersionString}"`);
  }

  const version = matches[0];

  return opts.normalize ? normalizeVersion(version) : version;
};

/**
 * Append `.0` to the version until it has 4 parts.
 *
 * If the version has more than 4 parts, then throw a TypeError.
 *
 * If any part of the version is not an integer, then throw a TypeError.
 *
 * Note: if the version is empty, then it will be normalized to `0.0.0.0`
 */
export const normalizeVersion = (unnormalizedVersion: string) => {
  const parts = unnormalizedVersion.split(".");

  if (parts.length > 4) {
    throw new TypeError(`Too many parts in version: ${unnormalizedVersion}`);
  }

  if (parts.some((part) => !/^\d+$/.test(part))) {
    throw new TypeError(
      `Invalid version (contains non-integer part): ${unnormalizedVersion}`
    );
  }

  while (parts.length < 4) {
    parts.push("0");
  }

  return parts.join(".");
};

/**
 * Compare two extension versions. Return -1 if `aVersion` is less than `bVersion`,
 * 1 if `aVersion` is greater than `bVersion`, and 0 if they are equal.
 *
 * Using this with the `Array.prototype.sort` method will sort the versions
 * in ASCENDING order.
 *
 * To sort in descending order, use {@link compareExtensionVersionsDescending}
 */
export const compareExtensionVersionsAscending = (
  aVersion: string,
  bVersion: string
) => {
  const a = normalizeVersion(aVersion).split(".").map(Number);
  const b = normalizeVersion(bVersion).split(".").map(Number);

  for (let i = 0; i < 4; i++) {
    if (a[i] < b[i]) {
      return -1;
    } else if (a[i] > b[i]) {
      return 1;
    }
  }

  return 0;
};

/**
 * Inverse of {@link compareExtensionVersionsAscending}.
 *
 * Compare two extension versions. Return -1 if `bVersion` is less than `aVersion`,
 * 1 if `bVersion` is greater than `aVersion`, and 0 if they are equal.
 *
 * Using this with the `Array.prototype.sort` method will sort the versions
 * in DESCENDING order.
 *
 */
export const compareExtensionVersionsDescending = (
  aVersion: string,
  bVersion: string
) => {
  return compareExtensionVersionsAscending(bVersion, aVersion);
};
