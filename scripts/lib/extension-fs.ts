import fs from "node:fs";
import path from "path";
import { YarnVars } from "./YarnVars.js";

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
}: {
  extensionId: string;
}) => {
  return getExtensionPath({ extensionId }) + ".zip";
};

const pathExistsAndIsAccessible = async (targetPath: string) => {
  return await fs.promises
    .access(targetPath)
    .then(() => true)
    .catch(() => false);
};

export const extensionExists = async ({
  extensionId,
}: {
  extensionId: string;
}) => {
  return await pathExistsAndIsAccessible(getExtensionPath({ extensionId }));
};

export const extensionZipExists = async ({
  extensionId,
}: {
  extensionId: string;
}) => {
  return await pathExistsAndIsAccessible(getExtensionZipPath({ extensionId }));
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
}: {
  extensionId: string;
}) => {
  if (await extensionExists({ extensionId })) {
    const extensionPath = getExtensionPath({ extensionId });
    await fs.promises.rm(extensionPath, {
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
}: {
  extensionId: string;
}) => {
  const extensionZipPath = getExtensionZipPath({ extensionId });
  if (await extensionZipExists({ extensionId })) {
    await fs.promises.rm(extensionZipPath);
  }
};
