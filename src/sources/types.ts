import {
  IDataSource,
  IQueryEngine,
  QueryStringContext,
  IQueryContextCommon,
} from "@comunica/types/lib";
import type * as RDF from "@rdfjs/types";
import { ISource } from "../../config/types";

export interface SourceInfo {
  /** Query engine specific for local or remote files */
  engine: IQueryEngine;

  /** Source files */
  sources: IDataSource[];
}

export interface Source {
  matcher(data: ISource): boolean;
}
