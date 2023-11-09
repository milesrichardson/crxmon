/**
 * Generic function for creating generic callback type that can optionally take
 * injectable arguments with context specific meaning.
 *
 * At some point this may contribute to some proper currying implementation
 * for composable within() blocks, where each provides its own InjectableOpts
 */
export type FnWithInjectableOpts<T, InjectableOpts> =
  | (() => T)
  | ((opts: InjectableOpts) => T);
