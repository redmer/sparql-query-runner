/** Mark keys or properties ReqK required for type T */
export declare type MarkRequired<T, ReqK extends keyof T> = Exclude<T, ReqK> &
  Required<Pick<T, ReqK>>;

/** Mark keys or properties OptK optional for type T */
export declare type MarkOptional<T, OptK extends keyof T> = Omit<T, OptK> & Partial<Pick<T, OptK>>;

/** Either a single or an array of T */
export declare type ArrayOrSingle<T> = T | T[];

/** Keys of a type union T */
export declare type KeysOfUnion<T> = T extends T ? keyof T : never;

/** Type of the elements in an homogenous array */
export declare type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

/** Type of an Object.entries() */
export declare type Entries<ObjectT> = {
  [Key in keyof ObjectT]: [Key, ObjectT[Key]];
}[keyof ObjectT][];

export type ConditionalKeys<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
}[keyof Base];
