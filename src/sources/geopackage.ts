import { BoundingBox, GeoPackageAPI } from "@ngageoint/geopackage";
import type * as RDF from "@rdfjs/types";
import { IJobSourceData } from "../config/types";
import { ConfigurationError } from "../config/validate";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types";
import { featureQuads } from "../utils/geosparql";

export class GeopackageSource implements WorkflowPart<IJobSourceData> {
  id = () => "sources/geopackage";

  isQualified(data: IJobSourceData): boolean {
    return data.access.endsWith(".gpkg"); // only support for geopackages
  }

  boundingBox(data: IJobSourceData): BoundingBox {
    if (data?.with?.["bounding-box"] === undefined)
      throw new ConfigurationError(`Limit the bounding box:
      Provide a space-separated string in \`with: bounding-box:\` the bounding
      coordinates as "minLongitude maxLongitude minLatitude maxLatitude"
      (west east south north).`);

    const bb: string = data?.with?.["bounding-box"];
    const [west, east, south, north] = bb.split(" ").map((v) => Number(v));
    return new BoundingBox(west, east, south, north);
  }

  // TODO: Find out if the GeoJSON commands work around CRS issues

  info(data: IJobSourceData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const geopackage = await GeoPackageAPI.open(data.access);
      const boundingBox = this.boundingBox(data);
      const results: RDF.Quad[] = [];

      // Only feature tables are parsed, within a certain bounding box
      for (const tableName of geopackage.getTables().features)
        for (const feature of geopackage.queryForGeoJSONFeaturesInTable(tableName, boundingBox))
          results.push(
            ...featureQuads(feature, {
              tableName,
              dataFactory: context.factory,
              baseURI: data.access,
            })
          );

      return {
        data: async () => results,
      };
    };
  }
}
