export const fetchLatestExtensionInfo = async ({
  extensionIdOrIds,
}: {
  /**
   * Either an extension ID, or an array of extension IDs,
   * or a comma-separated string of multiple extension IDs
   **/
  extensionIdOrIds: string | string[];
}) => {
  const extensionIds = Array.isArray(extensionIdOrIds)
    ? extensionIdOrIds
    : [...extensionIdOrIds.split(",").map((x) => x.trim())];

  const updatecheckURL = "https://update.googleapis.com/service/update2/json";

  const chromeVersion = "121.0.6167.57";

  const body = {
    request: {
      acceptformat: "crx3,puff",
      app: [
        ...extensionIds.map((extensionId) => ({
          appid: extensionId,
          packages: {
            package: [
              {
                fp: "2.0",
              },
            ],
          },
          ping: {
            r: -1,
          },
          updatecheck: {},
          version: "0",
        })),
      ],
      prodversion: chromeVersion,
      protocol: "3.1",
    },
  };

  const response = await fetch(updatecheckURL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Server returns invalid JSON. Maybe it's a bug or a feature, so remove it if there
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
