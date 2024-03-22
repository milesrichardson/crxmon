import { fetch, path } from "zx";
import { JSDOM } from "jsdom";
import fetchCache, { FileSystemCache, CACHE_VERSION } from "node-fetch-cache";
import { GET_YARN_VAR } from "./YarnVars.js";
import { extractExtensionVersionFromString } from "./extension-versions.js";

export const scrapeOverview = async ({
  extensionId,
}: {
  extensionId: string;
}): Promise<Crx4ChromeExtensionOverview> => {
  const overviewPageURL = `https://www.crx4chrome.com/extensions/${extensionId}/`;
  const pageSource = await fetch(overviewPageURL).then((resp) => resp.text());

  const maybeSiteIdMatch = pageSource.match(/href="\/history\/(\d+)\/">/);

  if (!maybeSiteIdMatch) {
    throw new Error(`Could not find siteId in: ${overviewPageURL}`);
  }

  const siteId = parseInt(maybeSiteIdMatch[1]);

  return {
    extensionId,
    overviewPageURL,
    siteId,
    versionHistoryURL: `https://www.crx4chrome.com/history/${siteId}`,
  };
};

type CacheOptions = Parameters<typeof fetchCache.create>[0];
type FSCacheOptions = ConstructorParameters<typeof FileSystemCache>[0];

const downloadPageDocument = async ({
  url,
  cache,
}: {
  url: string;
  cache?: {
    useCache: boolean;
    /** the cache subdirectory of .cache */
    subdirectory?: string;
    /** Override options */
    cacheOptions?: CacheOptions;
    /** Override options */
    fsCacheOptions?: FSCacheOptions;
  };
}): Promise<Document> => {
  const defaultCacheSubdirectory = "crx4chrome";

  const fetchImpl = cache?.useCache
    ? fetchCache.create({
        shouldCacheResponse: (response) => response.ok,
        cache: new FileSystemCache({
          cacheDirectory: path.join(
            GET_YARN_VAR("PROJECT_CWD"),
            ".data",
            "node-fetch-cache",
            defaultCacheSubdirectory,
            cache?.subdirectory ?? ""
          ),
          ...cache?.fsCacheOptions,
        }),
        ...cache?.cacheOptions,
      })
    : fetch;

  // zx.fetch has a logger, but node-fetch-cache doesn't, so log it ourselves
  if (cache?.useCache) {
    console.error(`fetchCache: ${url}`);
  }

  const pageSource = await fetchImpl(url).then((resp) => resp.text());

  const pageDOM = new JSDOM(pageSource, {
    url: url,
  });

  if (!pageDOM || !pageDOM.window || !pageDOM.window.document) {
    throw new Error(`Could not parse page: ${url}`);
  }

  return pageDOM.window.document;
};

type Pagination = {
  curPage: number;
  endPage: number;
};

// NOTE: On the last page, this will return the second-to-last page number
const parsePaginationFromDocument = ({
  parsedDocument,
}: {
  parsedDocument: Document;
}): Pagination => {
  const paginationContainer = parsedDocument.querySelector(".pagination");

  // Pagination controls do not appear when there is only 1 page
  if (!paginationContainer) {
    return {
      curPage: 1,
      endPage: 1,
    };
  }

  const currentPageElement = paginationContainer.querySelector(".current");

  if (!currentPageElement || !currentPageElement.textContent) {
    throw new Error("Pagination container missing curent page element or text");
  }

  const curPage = parseInt(currentPageElement.textContent, 10);

  const endPageElement = Array.from(
    paginationContainer.querySelectorAll("a:not(.next)")
  ).at(-1);

  if (!endPageElement || !endPageElement.textContent) {
    throw new Error("Pagination container missing end page element or text");
  }

  const endPage = parseInt(endPageElement.textContent, 10);

  return {
    curPage,
    endPage,
  };
};

// type Crx4ChromeExtensionVersion = {};
type Crx4ChromeExtensionVersion = any;

const parseVersionItemsFromDocument = ({
  parsedDocument,
}: {
  parsedDocument: Document;
}): Crx4ChromeExtensionVersion[] => {
  const parsedHistoryList = parsedDocument.querySelector("ol.history");
  if (!parsedHistoryList) {
    throw new Error(`Could not find history list `);
  }

  const parsedItems = Array.from(parsedHistoryList.querySelectorAll("li")).map(
    (listItem) => ({
      crxPage: listItem.querySelector("a")!.getAttribute("href"),
      metadata: Array.from(listItem.children).map(
        (listSubitem) => listSubitem.textContent
      ),
    })
  );

  return parsedItems;
};

export const scrapeVersions = async ({
  extension,
  state = {
    curPage: 1,
    accumulatedItems: [],
  },
}: {
  extension: Crx4ChromeExtensionOverview;

  /** Used internally for recursive calls */
  state?: {
    curPage: number;
    accumulatedItems: Crx4ChromeExtensionVersion[];
  };
}): Promise<Crx4ChromeExtensionVersion[]> => {
  const { curPage, accumulatedItems } = state;
  const parsedDocument = await downloadPageDocument({
    url: `${extension.versionHistoryURL}/${curPage}/`,
  });

  const pagination = parsePaginationFromDocument({ parsedDocument });
  if (curPage !== pagination.curPage) {
    throw new Error(
      `Mismatch in parsed curPage (${pagination.curPage}) and requested curPage (${curPage})`
    );
  }

  // Every page includes the latest version at the top of the list
  const curPageVersions = parseVersionItemsFromDocument({ parsedDocument });
  const latestVersion = curPageVersions[0];
  const olderVersions = curPageVersions.slice(1);

  // TODO: Assert that latestVersion contains string indicating it's latest

  state.accumulatedItems = [
    ...(curPage === 1 ? [latestVersion] : accumulatedItems),
    ...olderVersions,
  ];

  // note: on final page, parser sets pagination.endPage to END - 1, which is incorrect
  // but doesn't affect anything except the logic here so whatever
  if (curPage >= pagination.endPage) {
    return state.accumulatedItems;
  }

  console.assert(curPage < pagination.endPage, "curPage < endPage");

  return await scrapeVersions({
    extension,
    state: {
      curPage: curPage + 1,
      accumulatedItems: state.accumulatedItems,
    },
  });
};

type VersionDetailMetadata = {
  /** e.g. "kbfnbcaeplbcioakkpcpgfkobkghlhen-14.1135.0-www.Crx4Chrome.com.crx" */
  "crx-file": string;
  /** e.g. "1.66 MB" or "37.09 MB (38892873 Bytes)" */
  "file-size": string;

  "package-version": string;

  "updated-on": string;

  /** guarded to have at least one of md5|sha1|sha256 */
  md5?: string;
  /** guarded to have at least one of md5|sha1|sha256 */
  sha1?: string;
  /** guarded to have at least one of md5|sha1|sha256 */
  sha256?: string;
  crc32?: string;

  "extension-languages"?: string;
  "theme-languages"?: string;

  /** e.g. "Chrome version 88 or greater" */
  require?: string;
};

const isVersionDetailMetadata = (obj: any): obj is VersionDetailMetadata => {
  return (
    typeof obj === "object" &&
    "crx-file" in obj &&
    "file-size" in obj &&
    "package-version" in obj &&
    ("sha1" in obj || "sha256" in obj || "md5" in obj || "crc32" in obj) &&
    "updated-on" in obj
  );
};

type RawLink = {
  title: string;
  href: string;
  anchor: string;
};

type DownloadLinksMetadata = {
  crx: {
    google: `https://clients2.google.com/crx/blobs/${string}`;
    crx4chrome?: `https://${string}.crx4chrome.com/crx.php?i=${string}&v=${string}`;
  };
  webstore?: `https://chrome.google.com/webstore/detail/${string}`;
  unparsed: RawLink[];
};

const parseDownloadLinks = (
  downloadLinks: RawLink[]
): { downloadLinksMetadata: DownloadLinksMetadata; warnings?: string[] } => {
  const downloadLinksMetadata = {
    crx: {
      google: "",
      crx4chrome: "",
    },
    webstore: "",
    unparsed: [] as RawLink[],
  };

  for (const link of downloadLinks) {
    const parsedHref = new URL(
      link.href.startsWith("/")
        ? `https://www.crx4chrome.com${link.href}`
        : link.href
    );

    downloadLinksMetadata.unparsed.push(link);

    if (
      link.title === "Download from Google CDN" ||
      parsedHref.searchParams
        .get("l")
        ?.startsWith("https://clients2.google.com/crx/blobs/")
    ) {
      downloadLinksMetadata.crx.google = parsedHref.searchParams.get(
        "l"
      ) as DownloadLinksMetadata["crx"]["google"];
    } else if (
      link.title === "Download from Crx4Chrome" ||
      (parsedHref.searchParams.get("l") &&
        parsedHref.searchParams.get("l")?.startsWith("https://") &&
        new URL(parsedHref.searchParams.get("l") as string).host.endsWith(
          ".crx4chrome.com"
        ))
    ) {
      downloadLinksMetadata.crx.crx4chrome =
        (parsedHref.searchParams.get(
          "l"
        ) as DownloadLinksMetadata["crx"]["crx4chrome"]) ?? link.href;
    } else if (
      link.title === "Chrome Web Store" ||
      link.href.startsWith("https://chrome.google.com/webstore/detail/")
    ) {
      // Strip tracking params
      const webstoreURL = new URL(link.href);
      [...webstoreURL.searchParams.keys()].forEach((key) =>
        webstoreURL.searchParams.delete(key)
      );

      downloadLinksMetadata.webstore = webstoreURL.toString();
    }
  }

  const checkResults = [
    ["error", "crx.google", downloadLinksMetadata.crx.google] as const,
    [
      "warn",
      "crx.crx4chrome",
      downloadLinksMetadata.crx.crx4chrome,
      (dl: DownloadLinksMetadata) => delete dl.crx.crx4chrome,
    ] as const,
    [
      "warn",
      "webstore",
      downloadLinksMetadata.webstore,
      (dl: DownloadLinksMetadata) => delete dl.webstore,
    ] as const,
  ] as const;

  const fails = checkResults.filter(([_level, _key, value]) => !value);

  for (const [_level, _key, _value, cleanup] of fails) {
    if (cleanup) {
      cleanup(downloadLinksMetadata as DownloadLinksMetadata);
    }
  }

  const errors = fails.filter(([level]) => level === "error");
  const warnings = fails.filter(([level]) => level === "warn");

  const warningMessages = warnings.map(
    ([_, key]) => `Missing download link: ${key}`
  );

  if (errors.length > 0) {
    throw new Error(
      `Missing download links: ${errors.map(([_, key]) => key).join(", ")}`
    );
  }

  return {
    downloadLinksMetadata: downloadLinksMetadata as DownloadLinksMetadata,
    warnings: warningMessages.length > 0 ? warningMessages : undefined,
  };
};

type HashSet = RequireAtLeastOne<{
  md5: string;
  sha1: string;
  sha256: string;
  crc32: string;
}>;

export type CriticalDetailPageMetadata = {
  crx: DownloadLinksMetadata["crx"];
  webstore?: DownloadLinksMetadata["webstore"];
  version: string;
  updated: string;

  hashes: HashSet;
};

const isHashSet = (obj: any): obj is HashSet => {
  const keys = ["md5", "sha1", "sha256", "crc32"];

  if (
    typeof obj !== "object" ||
    !keys.some((key) => key in obj) ||
    keys.some((key) => key in obj && typeof key !== "string")
  ) {
    return false;
  }

  return true;
};

const extractCriticalMetadata = ({
  metadata,
  downloadLinksMetadata,
}: {
  metadata: VersionDetailMetadata;
  downloadLinksMetadata: DownloadLinksMetadata;
}): CriticalDetailPageMetadata => {
  const hashes = Object.fromEntries(
    Object.entries(metadata).filter(([key]) =>
      ["md5", "sha1", "sha256", "crc32"].includes(key)
    )
  ) as HashSet;

  if (!isHashSet(hashes)) {
    throw new Error(`Invalid hashes: ${JSON.stringify(hashes, null, 2)}`);
  }

  return {
    crx: downloadLinksMetadata.crx,
    webstore: downloadLinksMetadata.webstore,
    version: extractExtensionVersionFromString(metadata["package-version"]),
    updated: metadata["updated-on"],
    hashes,
  };
};

export const scrapeVersionDetailPage = async (
  pathToCrx: `/crx/${number | string}/`
) => {
  if (!pathToCrx.startsWith("/crx/")) {
    throw new Error(`Invalid pathToCrx: ${pathToCrx} doesn't start with /crx/`);
  }

  const detailPageURL = `https://www.crx4chrome.com${pathToCrx}`;
  const detailPageDoc = await downloadPageDocument({
    url: detailPageURL,
    cache: {
      useCache: true,
      subdirectory: "crx",
      cacheOptions: {
        shouldCacheResponse: (response) => response.ok,
        calculateCacheKey: (resource) => {
          if (typeof resource !== "string") {
            throw new Error("resource is not string");
          }

          return JSON.stringify([new URL(resource).pathname, CACHE_VERSION]);
        },
      },
    },
  });

  const [metadataNode, downloadLinksNode] = Array.from(
    detailPageDoc.querySelectorAll(".info")
  ).slice(0, 2);

  if (!metadataNode) {
    throw new Error(`Could not find metadata in: ${detailPageURL}`);
  }

  if (!downloadLinksNode) {
    throw new Error(`Could not find download links in: ${detailPageURL}`);
  }

  const metadata = Object.fromEntries(
    Array.from(metadataNode.querySelectorAll("p"))
      .map((el) => el.textContent)
      .map((md) => {
        if (!md) {
          throw new Error("unexpected empty metadata node");
        }

        const [mdKey, ...mdVal] = md.split(":");
        return [
          mdKey.replace("•", "").trim().replaceAll(" ", "-").toLowerCase(),
          mdVal.join().trim(),
        ];
      })
  );

  if (!isVersionDetailMetadata(metadata)) {
    throw new Error(`Invalid metadata: ${JSON.stringify(metadata, null, 2)}`);
  }

  const downloadLinks = Array.from(
    downloadLinksNode.querySelectorAll("p > a")
  ).map((anchorTag) => ({
    title: anchorTag.getAttribute("title"),
    href: anchorTag.getAttribute("href"),
    anchor: anchorTag.textContent,
  })) as RawLink[];

  const { downloadLinksMetadata, warnings } = parseDownloadLinks(downloadLinks);

  // TODO: Pass this through the return value
  if (warnings) {
    warnings.forEach((warning) =>
      console.error(`WARN(${pathToCrx}): ${warning}`)
    );
  }

  return {
    metadata: extractCriticalMetadata({
      metadata,
      downloadLinksMetadata,
    }),
    rawMetadata: {
      metadata,
      downloadLinksMetadata: downloadLinksMetadata,
    },
  };
};

// https://www.crx4chrome.com/extensions/kbfnbcaeplbcioakkpcpgfkobkghlhen/
type Crx4ChromeExtensionOverview = {
  extensionId: string;
  overviewPageURL: string;
  /** The internal ID used by crx4chrome.com for the extension */
  siteId: number;

  // https://www.crx4chrome.com/history/2722/
  /** The URL to the version history page */
  versionHistoryURL: string;

  /**
   * Google CDN appears to retain versions for a while, but it's not
   * clear what heuristic is used to determine whether to keep it.
   * Time? Manifest changes?
   *
   * It's also not clear if "hosted on Google CDN" actually means it's
   * the version provided by the WebStore, or if it was uploaded by crx4chrome
   *
   * On Dec 31, 2023, for Grammarly extension, the oldest available
   * version was from May 6, 2021. The latest NON-available version
   * was the version prior to that, on April 29, 2021.
   *
   * https://www.crx4chrome.com/crx/242527/ (May 6) 14.1009.0
   * https://www.crx4chrome.com/crx/242183/ (Apr 29) 14.1008.0
   *
   * 5/6/21 - 12/31/23 = 969 days (138.43 weeks)
   * 4/29/21 - 12/31/23 = 976 days (139.43 weeks)
   *
   *
   * crx4 chrome ID goes up to (as of feb 29 2024) 352,596
   * https://www.crx4chrome.com/crx/352596/
   *
   *
   */

  // numVersions: number;
};

type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];
