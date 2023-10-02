import type * as RDF from "@rdfjs/types";
import { readFileSync } from "fs";
import { factsToQuads, incremental, owl2rl, quadsToFacts, rdfs } from "hylar-core";
import N3 from "n3";
import type { IJobStepData } from "../config/types.js";
import type { InMemQuadStore, JobRuntimeContext, WorkflowPartStep } from "../runner/types.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

export class InferReason implements WorkflowPartStep {
  id = () => "entailment-with-hylar-core";
  names = ["steps/reason"];

  exec(data: IJobStepData) {
    return async (context: JobRuntimeContext) => {
      if (data.with.targetGraph)
        context.warning(`Target-Graph ignored: Only shapes in the default graph are used`);

      const ruleset = data.with?.["ruleset"] == "owl2rl" ? owl2rl : rdfs;

      return {
        asStep: async (_stream: RDF.Stream, quadStore: InMemQuadStore) => {
          if (context.workflowContext.options.skipReasoning) return;

          // const explicit = new N3.Store();
          const datasetImplicit = new N3.Store();
          const ontologyExplicit = new N3.Store();
          const ontologyImplicit = new N3.Store();

          if (data.access) {
            const reader = readFileSync(data.access, { encoding: "utf-8" });
            const result = new N3.Parser({
              format: getRDFMediaTypeFromFilename(data.access),
            }).parse(reader);

            const { additions, deletions } = await incremental(
              quadsToFacts(result),
              [],
              [],
              [],
              ruleset
            );

            ontologyImplicit.addQuads(factsToQuads(additions).implicit);
            ontologyImplicit.removeQuads(factsToQuads(deletions).implicit);

            ontologyExplicit.addQuads(factsToQuads(additions).explicit);
            ontologyExplicit.removeQuads(factsToQuads(deletions).explicit);
          }

          // Note that the example first loads an ontology. Our documentation
          // says we could do that too.
          const { additions, deletions } = await incremental(
            quadsToFacts(quadStore.getQuads()),
            [],
            quadsToFacts(ontologyExplicit.getQuads(null, null, null, null)),
            quadsToFacts(ontologyImplicit.getQuads(null, null, null, null)),
            ruleset
          );

          datasetImplicit.addQuads(factsToQuads(additions).implicit);
          datasetImplicit.removeQuads(factsToQuads(deletions).implicit);

          if (data?.with?.targetGraph && data.with.targetGraph.value !== "--")
            return datasetImplicit.match();
        },
      };
    };
  }
}
