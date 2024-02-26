import { YarnVars } from "./YarnVars.js";
import path from "node:path";
import fs from "node:fs";

export const getExtensionDataPaths = () => {
  if (!YarnVars.PROJECT_CWD) {
    throw new Error("PROJECT_CWD is not set - is script running via Yarn?");
  }

  return {
    allExtensionsPath: path.join(YarnVars.PROJECT_CWD, "extensions-2021.json"),
    topExtensionsPath: path.join(YarnVars.PROJECT_CWD, "top-extensions.json"),
    getTopNExtensionsPath: (n: number) => {
      if (!YarnVars.PROJECT_CWD) {
        throw new Error("PROJECT_CWD is not set - is script running via Yarn?");
      }

      return path.join(YarnVars.PROJECT_CWD, `top-${n}-extensions.json`);
    },
  };
};

export const getTopExtensions = async (numExtensions?: number) => {
  let { topExtensionsPath, getTopNExtensionsPath } = getExtensionDataPaths();

  if (numExtensions) {
    topExtensionsPath = getTopNExtensionsPath(numExtensions);
  }

  const data = await fs.promises.readFile(topExtensionsPath);
  return JSON.parse(data.toString()) as Extension[];
};

export const getAllExtensions = async () => {
  const { allExtensionsPath } = getExtensionDataPaths();
  const data = await fs.promises.readFile(allExtensionsPath);
  return JSON.parse(data.toString()) as Extension[];
};

export type Extension = {
  /** e.g. `gomekmidlodglbbmalcneegieacbdmki` */
  id: string;
  /** e.g. `Avast Online Security` */
  name: string;
  /** e.g. `Avast Software` */
  author: string;
  /** The URL to the webstore listing */
  url: `https://chrome.google.com/webstore/detail/${string}/${string}`;
  /** The webstore category */
  category:
    | "Accessibility"
    | "Blogging"
    | "Developer Tools"
    | "Fun"
    | "News & Weather"
    | "Photos"
    | "Productivity"
    | "Search Tools"
    | "Shopping"
    | "Social & Communication"
    | "Sports";
  /** e.g. 2.7359083763754772 */
  rating: number;
  /** e.g. 4453 */
  ratings: number;
  /** e.g. `"10,000,000+" */
  installs: string;
  /** e.g. `10000000` */
  minInstalls: number;
  /**
   * Examples:
   *  * `Free`
   *  * `Uses in-app payments`
   *  * `US$5.99/month`
   *  * `US$5.99/month - Free to try`
   */
  price: "Free" | "Uses in-app payments" | string;
};
