import { FeatureConverter } from "@ngageoint/simple-features-geojson-js";
import { GeometryWriter } from "@ngageoint/simple-features-wkt-js";
import type * as RDF from "@rdfjs/types";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import stringify from "json-stable-stringify";
import { DataFactory } from "rdf-data-factory";
import { GEO, RDF as RDFNS, XYZ } from "./namespaces";

export interface FeatureQuadsContext {
  /** The base URI from which the GeoJSON was got */
  baseURI: string;
  /** An optional RDF/JS DataFactory */
  dataFactory?: RDF.DataFactory;
  /** Provide a context for the feature table */
  tableName: string;
}

interface FeatureQuadsPrivateContext extends Required<FeatureQuadsContext> {
  subject: RDF.NamedNode;
  graph: RDF.Quad_Graph;
}

function wktFromGeometry(geometry: Geometry): string {
  const sf = FeatureConverter.toSimpleFeaturesGeometryFromGeometryObject(geometry);
  return GeometryWriter.writeGeometry(sf);
}

function* geometryQuads(geometry: Geometry, ctx: FeatureQuadsPrivateContext): Generator<RDF.Quad> {
  const df = ctx.dataFactory;
  const geometrySubject = df.blankNode();

  yield df.quad(ctx.subject, GEO("hasDefaultGeometry"), geometrySubject, ctx.graph);
  yield df.quad(geometrySubject, RDFNS("type"), GEO("Geometry"), ctx.graph);

  yield df.quad(
    geometrySubject,
    GEO("asGeoJSON"),
    df.literal(stringify(geometry), GEO("geoJSONLiteral")),
    ctx.graph
  );
  yield df.quad(
    geometrySubject,
    GEO("asWKT"),
    df.literal(wktFromGeometry(geometry), GEO("wktLiteral")),
    ctx.graph
  );
}

function* propertyQuads(
  properties: GeoJsonProperties,
  ctx: FeatureQuadsPrivateContext
): Generator<RDF.Quad> {
  const df = ctx.dataFactory;

  for (const [k, v] of Object.entries(properties))
    yield df.quad(ctx.subject, XYZ(encodeURI(k)), df.literal(v), ctx.graph);
}

export function featureQuads(feature: Feature, ctx: FeatureQuadsContext): RDF.Quad[] {
  // provide optionals
  const dataFactory = ctx.dataFactory ?? new DataFactory();

  // Calculate the subject URL for the feature
  const featureURL = new URL(String(feature.id), ctx.baseURI ?? XYZ("").value);
  const subject = dataFactory.namedNode(featureURL.href);

  // Calculate the graph URL for the table
  const tableURL = new URL(encodeURI(ctx.tableName), ctx.baseURI ?? XYZ("").value);
  const graph = dataFactory.namedNode(tableURL.href);

  // Get quads representations of the Feature
  const geometryQ = geometryQuads(feature.geometry, { subject, graph, dataFactory, ...ctx });
  const propertyQ = propertyQuads(feature.properties, { subject, graph, dataFactory, ...ctx });

  return [...geometryQ, ...propertyQ];
}
