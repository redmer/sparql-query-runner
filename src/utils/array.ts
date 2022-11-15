/** Returns an array with {@link items} in it. */
export function oneOrMore<T>(items: T | T[] | undefined): T[] {
  if (items == undefined) return [];
  return ([] as T[]).concat(items).filter((item) => item);
}

/** Strict check not empty */
export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  //@ts-ignore
  const testDummy: TValue = value;
  return true;
}
