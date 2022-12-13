## How does the workflow cache work?

The CLI presents a `--cache` option, that keeps the state of constructed quads per step.
This cache is however highly dependent on the parts and steps present in each workflow,
but tries its best to keep a fresh cache of the steps.

You can manually clear and reset the cache with `$ sparql-query-runner clear-cache`.

Dependent workflows and steps are only cached if the workflows and steps they depend on are cacheable, too.

If the workflow is a `type: direct-update` workflow that works on an endpoint, the cache is disabled, as update queries do not return any info to the client.
Other clients may also cause changes to the endpoint data that may change responses in a workflow.

If the workflow uses a `source: { type: sparql }`, the subsequent steps are not cached,
but if that step is implicitly a SPARQL source (i.e., `type: auto` or unset), then the subsequent are cached.
This may be erroneously, but the current workflow cache heuristics cannot detect such SPARLQ endpoints.
