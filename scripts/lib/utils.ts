/**
 * Given a thing, or a function that returns a thing, normalize it to a thing,
 * or undefined.
 *
 * @example
 * ```ts
 * const prefixed = (prefixOrPrefixer: string | ((prefix: string) => string)) => {
 *  return maybeThingFromThingOrThingifier(prefixOrPrefixer, "hola");
 * };
 * // will be "hello"
 * const hello = prefixed("hello")
 *
 * // will be "hola hello"
 * const holaHello = prefixed((prefix) => `${prefix} hello`)
 * ```
 */
export const maybeThingFromThingOrThingifier = <
  T extends any | ((...args: any[]) => any),
  U = T extends (...args: any[]) => any ? ReturnType<T> : T,
>(
  thing: T,
  ...args: T extends (...args: any[]) => U ? Parameters<T> : never
): U | undefined => {
  if (typeof thing === "undefined") {
    return undefined;
  } else if (typeof thing === null) {
    return undefined;
  } else if (typeof thing === "function") {
    return thing(...args);
  } else {
    return thing as U;
  }
};

export const normalizeThingOrThingifier = <
  T extends unknown | ((...args: any[]) => unknown),
  U = T extends (...args: any[]) => unknown ? ReturnType<T> : T,
>(
  thing: T,
  ...args: T extends (...args: any[]) => U ? Parameters<T> : never
): U => {
  if (typeof thing === "function") {
    return thing(...args);
  } else {
    return thing as unknown as U;
  }
};

// const prefixed = (prefixOrPrefixer: string | ((prefix: string) => string)) => {
//   return normalize(prefixOrPrefixer, "hola");
// };

// const hello = prefixed("hello");
// prefixed((prefix) => `${prefix} hello`)
