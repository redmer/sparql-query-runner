/** Returns an array with {@link items} in it. */
export function oneOrMore<T>(items: T | T[] | undefined): T[] {
  if (items == undefined) return [];
  return ([] as T[]).concat(items).filter((item) => item);
}
