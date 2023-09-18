export declare type MarkRequired<T, ReqK extends keyof T> = Exclude<T, ReqK> &
  Required<Pick<T, ReqK>>;
export declare type MarkOptional<T, OptK extends keyof T> = Omit<T, OptK> & Partial<Pick<T, OptK>>;
export declare type ArrayOrSingle<T> = T | T[];
export declare type KeysOfUnion<T> = T extends T ? keyof T : never;
/** Type of the elements in an homogenous array */
export declare type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
/** Type of an Object.entries() */
export declare type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];
