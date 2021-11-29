/** Returns an array with {@link items} in it. */
export function oneOrMore<T>(items: T | T[]): T[] {
  return ([] as T[]).concat(items).filter((item) => item);
}
