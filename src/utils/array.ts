/** Returns an array with {@link items} in it.
 *
 * Name: Greather than or Equal to 1
 */
export function ge1<T>(items: T | T[]): T[];
export function ge1(items: undefined): undefined;
export function ge1<T>(items: T | T[] | undefined): T[] | undefined {
  if (items == undefined) return undefined;
  return ([] as T[]).concat(items).filter((item) => item);
}

/** Exhaust a generator */
export async function arrayFromGenerator<T>(generator: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of generator) out.push(x);
  return out;
}
