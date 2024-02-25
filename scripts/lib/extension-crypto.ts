// @ts-expect-error No types
import crx from "crx3-utils";

/**
 * Return the base64 encoded public key of the given crx file, suitable for
 * setting as the `key` in a manifest.json file so that the browser can verify
 * the extension even after modification.
 *
 * If the key is not set, then the unpacked extension will have a different
 * key and the browser will load it with a different extension ID, causing
 * problems for any extension code that expects its pages to be at that ID.
 */
export const getExtensionPublicKey = async (extCrxPath: string) => {
  return await crx.u
    .read(extCrxPath)
    .then(crx.parse)
    .then((hdr: any) => {
      return crx
        .der2pem(crx.container(hdr, "rsa", crx.rsa_main_index(hdr)).public_key)
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\n/g, "");
    });
};
