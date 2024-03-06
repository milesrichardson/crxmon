export const fetchLatestExtensionInfo = async ({
  extensionIdOrIds,
}: {
  /**
   * Either an extension ID, or an array of extension IDs,
   * or a comma-separated string of multiple extension IDs
   *
   * The Google update protocol ("Omaha") is defined here:
   * https://chromium.googlesource.com/chromium/src.git/+/master/docs/updater/protocol_3_1.md
   *
   **/
  extensionIdOrIds: string | string[];
}) => {
  const extensionIds = Array.isArray(extensionIdOrIds)
    ? extensionIdOrIds
    : [...extensionIdOrIds.split(",").map((x) => x.trim())];

  const updatecheckURL = "https://update.googleapis.com/service/update2/json";

  const chromeVersion = "124.0.6339.0";

  const body = {
    request: {
      acceptformat: "crx3,puff",
      app: [
        ...extensionIds.map((extensionId) => ({
          appid: extensionId,
          updatecheck: {},
        })),
      ],
      prodversion: chromeVersion,
      protocol: "3.1",
      /**
       * Don't count the update in metrics
       * ("Any value other than the empty string indicates that the request
       *   should not be counted toward official metrics")
       */
      testsource: "autoupdate",
    },
  };

  const response = await fetch(updatecheckURL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Server returns invalid JSON (according to spec, to avoid naive execution of response)
  // Specifically: JSON responses from the server are prefixed with )]}'\n
  const responseText = await response.text();
  const data = (() => {
    try {
      if (responseText.startsWith(")]}'\n")) {
        return JSON.parse(responseText.slice(5));
      } else {
        return JSON.parse(responseText);
      }
    } catch (err) {
      throw new Error(`Error parsing response: \n ${responseText}`);
    }
  })();

  return data;
};
