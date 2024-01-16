import { fetch } from "zx";
import { JSDOM } from "jsdom";

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

const downloadPageDocument = async ({
  url,
}: {
  url: string;
}): Promise<Document> => {
  const pageSource = await fetch(url).then((resp) => resp.text());

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
   */

  // numVersions: number;
};
