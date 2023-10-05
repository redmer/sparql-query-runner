declare module "shacl-engine" {
  import type * as RDF from "@rdfjs/types";

  declare interface ConstructorOptions {
    /** A RDF/JS DataFactory, which is used to generate the report */
    factory: RDF.DataFactory;
    /** Boolean flag to enable collecting covered quads. */
    coverage?: boolean;
    /** Generate debug results for successful validations. */
    debug?: boolean;
    /** Generate nested result details. */
    details?: boolean;
    /** Generate results for path traversing. */
    trace?: boolean;
  }

  declare interface ValidateData {
    /** An RDF/JS DatasetCore object that contains the quads. */
    dataset: RDF.DatasetCore;
    /** An iterable object of RDF/JS Terms that will be used as initial focus nodes. */
    terms?: RDF.Term[];
  }

  /** A SHACL Validator, provided by shacl-engine */
  declare class Validator {
    /**
     * Create a SHACL Validator.
     *
     * @param dataset The shapes that will be used for validation
     * @param opts Options
     */
    constructor(dataset: RDF.DatasetCore, opts: ConstructorOptions);

    /**
     * Execute the validations.
     *
     * @param data
     * @param shapes An iterable object of RDF/JS Terms that refers to the initial
     *  set of shapes. (optional) This doesn't limit the nested shapes.
     */
    validate(data: ValidateData, shapes?: RDF.Term[]): Promise<Report>;
  }

  declare class Report {
    conforms: boolean;
    dataset: RDF.DatasetCore;
    results: Result[];
  }

  declare class Result {
    readonly focusNode: RDF.BlankNode | RDF.NamedNode | null;
    readonly message: (RDF.BlankNode | RDF.NamedNode | RDF.Literal)[];
    readonly path: RDF.BlankNode | RDF.NamedNode | null;
    readonly results: Result[];
    readonly severity: RDF.NamedNode | null;
    readonly constraintComponent: RDF.BlankNode | RDF.NamedNode | null;
    readonly shape: RDF.BlankNode | RDF.NamedNode | null;
  }
}
