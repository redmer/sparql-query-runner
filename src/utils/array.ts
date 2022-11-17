/** Returns an array with {@link items} in it. */
export function oneOrMore<T>(items: T | T[]): T[];
export function oneOrMore(items: undefined): undefined;
export function oneOrMore<T>(items: T | T[] | undefined): T[] | undefined {
  if (items == undefined) return undefined;
  return ([] as T[]).concat(items).filter((item) => item);
}

/** Strict check not empty */
export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  //@ts-ignore
  const testDummy: TValue = value;
  return true;
}

/** Exhaust a generator */
export async function arrayFromGenerator<T>(generator: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of generator) out.push(x);
  return out;
}
