// import { IDest, IBaseStep, IQueryStep, IUpdateStep } from "../config/types.js";
// import { DestinationPartInfo, PipelinePart, PipelinePartGetter, RuntimeCtx } from "./types.js";
// import { serialize } from "../utils/graphs-to-file.js";
// import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
// import { SH, XSD, RDF } from "../utils/namespaces.js";
// import * as Report from "../utils/report.js";
// import N3, { BlankNode, DataFactory, NamedNode, Term } from "n3";
// import fs from "fs/promises";

// export default class ShaclRulesLocalFileDestination
//   implements PipelinePart<IQueryStep | IUpdateStep>
// {
//   // Export a(ll) graph(s) to a file
//   name = () => "shacl-rules-file-destination";

//   qualifies(data: IQueryStep | IUpdateStep): boolean {
//     if (data.type == "shacl-validate") return true;
//     return false;
//   }

//   async info(data: IQueryStep | IUpdateStep): Promise<PipelinePartGetter> {
//     const mimetype = "text/turtle";

//     return async (context: Readonly<RuntimeCtx>): Promise<DestinationPartInfo> => {
//       const shRulesStore = new N3.Store();
//       return {
//         start: async () => {
//           // each step needs to have value for $this, i.e. sh:targetClass
//           const withTargetClass = context.pipeline.steps.filter((s) =>
//             Object.hasOwn(s, "targetClass")
//           );
//           if (!withTargetClass.length) {
//             Report.print("warning", `no step has targetClass specified, required for SHACL Rules`);
//           }

//           // each step with targetClass has multiple url`s, add those
//           for (const [i, step] of withTargetClass.entries()) {
//             const queries = step.url.filter((val) => val.endsWith(".rq"));
//             for (const query of queries) {
//               const subject = DataFactory.namedNode(
//                 new URL(query, "http://example.org/rule/").href
//               );

//               shRulesStore.addQuad(subject, SH("rule"), DataFactory.blankNode());
//             }
//           }
//           await serialize(context.quadStore, data.url, {
//             format: mimetype,
//             graphs: data.graphs,
//             prefixes: context.pipeline.prefixes,
//           });
//         },
//       };
//     };
//   }
// }

// export namespace ShaclRules {
//   export function* quadsForNamespaces(data: Record<string, string>) {
//     for (const [abbr, val] of Object.entries(data)) {
//       const bnode = DataFactory.blankNode();
//       yield [DataFactory.namedNode(val), SH("declare"), bnode];
//       yield [bnode, SH("namespace"), DataFactory.literal(val, XSD("anyURI"))];
//       yield [bnode, SH("prefix"), DataFactory.literal(abbr)];
//     }
//   }

//   export function* quadsForQuery(query: string, subject: Term) {
//     // TargetClass
//   }

//   export async function* quadsForStep(step: IBaseStep, i: number) {
//     const targetClass = step["targetClass"];
//     if (!targetClass || Array.isArray(targetClass)) return;

//     for (const url of step.url) {
//       const subject = DataFactory.namedNode(new URL(url, "http://example.org/rule/").href);
//       const object = DataFactory.blankNode();
//       yield [subject, RDF("type"), SH("NodeShape")];
//       yield [subject, SH("targetClass"), DataFactory.namedNode(targetClass)];
//       yield [subject, SH("rule"), object];

//       const query = await fs.readFile(url, { encoding: "utf-8" });
//       yield* quadsForQuery(query, object);
//       yield [object];
//     }
//   }
// }

// /*
// # What is required for the SHACL Rule`s?

// [] a sh:NodeShape ;
//   sh:targetClass __ ; # whence this value? .yaml -> this: ?
//   sh:rule [
//     a sh:SPARQLRule ;
//     sh:order __ ; # ordinal uit .yaml
//     sh:prefixes __ , __ ; # values moeten gedestilleerd worden uit querytekst
//     sh:construct """CONSTRUCT {} WHERE {}""" ;
//   ] .

// __ sh:declare [
//   sh:namespace "..."^^xsd:anyURI ;
//   sh:prefix "sh" ;
// ] .

// */
