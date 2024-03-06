import fs from "node:fs";
import path from "path";
import { YarnVars } from "./YarnVars.js";

// TODO: Refactor this file. It was originally written assuming a static/default
// location for extensions and extension zips, and then was made more flexible,
// to take each optionally, but as a result the code is now more unwieldy,
// duplicative, and harder to understand or write correctly.

/**
 * Return the path to the directory for the given extension ID.  By default,
 * return an absolute path.  To return a path relative to PROJECT_CWD, set
 * `relativeFromProjectCwd` to `true`.
 */
export const getExtensionPath = ({
  extensionId,
  relativeFromProjectCwd = false,
}: {
  extensionId: string;
  /**
   * Set to `true` to get path relative to PROJECT_CWD (default is `false`, i.e.
   * absolute)
   */
  relativeFromProjectCwd?: boolean;
}) => {
  if (!YarnVars.PROJECT_CWD) {
    throw new Error("PROJECT_CWD is not set - is script running via Yarn?");
  }

  const extensionPath = path.join(
    relativeFromProjectCwd ? "." : YarnVars.PROJECT_CWD,
    "extensions",
    extensionId
  );

  return extensionPath;
};

export const getExtensionZipPath = ({
  extensionId,
  extensionPath,
}: {
  extensionId: string;

  /**
   * Optional local path to the directory where the extension should be
   * extracted (i.e., `extensionPath/manifest.json` will exist after
   * extraction).
   *
   * If not specified, the path will be constructed using
   * the {@link getExtensionPath} function.
   */
  extensionPath?: string;
}) => {
  return (extensionPath ?? getExtensionPath({ extensionId })) + ".zip";
};

const pathExistsAndIsAccessible = async (targetPath: string) => {
  return await fs.promises
    .access(targetPath)
    .then(() => true)
    .catch(() => false);
};

export const extensionExists = async ({
  extensionId,
  extensionPath,
}: {
  extensionId: string;

  /**
   * Optional local path to the directory where the extension should be
   * extracted (i.e., `extensionPath/manifest.json` will exist after
   * extraction).
   *
   * If not specified, the path will be constructed using
   * the {@link getExtensionPath} function.
   */
  extensionPath?: string;
}) => {
  return await pathExistsAndIsAccessible(
    extensionPath ?? getExtensionPath({ extensionId })
  );
};

const extensionZipExists = async ({
  extensionId,
  extensionZipPath,
  extensionPath,
}: {
  extensionId: string;
  /**
   * Optional local path to the file where the compressed extension (i.e.,
   * the `crx` file) should be saved.
   *
   * If not specified, the path will be constructed using
   * the {@link getExtensionZipPath} function, which defaults
   * to saving the file parallel to the extension directory, with the name
   * of `{extensionId}.zip`.
   */
  extensionZipPath?: string;

  /**
   * Optional local path to the directory where the extension should be
   * extracted (i.e., `extensionPath/manifest.json` will exist after
   * extraction).
   *
   * If not specified, the path will be constructed using
   * the {@link getExtensionPath} function.
   */
  extensionPath?: string;
}) => {
  return await pathExistsAndIsAccessible(
    extensionZipPath ?? getExtensionZipPath({ extensionId, extensionPath })
  );
};

/**
 * Remove an extension, if it exists. If it doesn't exist, do nothing.
 *
 * Throw an error when the extension exists but cannot be removed.
 *
 * Note: This only removes the extension directory. It does not remove
 * any .zip of the extension that might exist.
 */
export const removeExtension = async ({
  extensionId,
  extensionPath,
}: {
  extensionId: string;
  /**
   * Optional local path to the directory where the extension should be
   * extracted (i.e., `extensionPath/manifest.json` will exist after
   * extraction).
   *
   * If not specified, the path will be constructed using
   * the {@link getExtensionPath} function.
   */
  extensionPath?: string;
}) => {
  if (await extensionExists({ extensionId, extensionPath })) {
    await fs.promises.rm(extensionPath ?? getExtensionPath({ extensionId }), {
      recursive: true,
      force: true,
    });
  }
};

/**
 * Attempt to remove the extension .zip, which may or may not exist.
 *
 * Throw an error when the extension .zip exists but cannot be removed.
 */
export const maybeRemoveExtensionZip = async ({
  extensionId,
  extensionZipPath,
  extensionPath,
}: {
  extensionId: string;
  /**
   * Optional local path to the file where the compressed extension (i.e.,
   * the `crx` file) should be saved.
   *
   * If not specified, the path will be constructed using
   * the {@link getExtensionZipPath} function, which defaults
   * to saving the file parallel to the extension directory, with the name
   * of `{extensionId}.zip`.
   */
  extensionZipPath?: string;
  /**
   * Optional local path to the directory where the extension should be
   * extracted (i.e., `extensionPath/manifest.json` will exist after
   * extraction).
   *
   * If not specified, the path will be constructed using
   * the {@link getExtensionPath} function.
   */
  extensionPath?: string;
}) => {
  if (
    await extensionZipExists({ extensionId, extensionZipPath, extensionPath })
  ) {
    await fs.promises.rm(
      extensionZipPath ?? getExtensionZipPath({ extensionId, extensionPath })
    );
  }
};
