# `@rdmr-eu/sparql-query-runner`

This application runs a predefined (series of) pipeline(s) that consists of
[SPARQL 1.1 Update][sparql-update] queries and [SPARQL `CONSTRUCT`][sparql-construct] queries.
It can also check the latter for wellformedness using SHACL,
as well as upload artifacts to [SPARQL Graph Stores][sparql-http-update] and [Laces Hub][laces].

[sparql-update]: http://www.w3.org/TR/2013/REC-sparql11-update-20130321
[sparql-http-update]: https://www.w3.org/TR/2013/REC-sparql11-http-rdf-update-20130321
[sparql-construct]: https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct
[laces]: https://hub.laces.tech

## Configuration file `sparql-query-runner.yaml`

The configuration file must be named `sparql-query-runner.yaml`.
It contains a list of pipelines, defined in YAML.
Although YAML is easy enough to edit with a text editor, you need to be careful with -- for YAML meaningful -- spaces, quotation marks and indentation.

There is a JSON Schema defined at `https://rdmr.eu/sparql-query-runner/v2-schema.json` and describes the expected format. You may provide the configuration as a JSON file named `sparql-query-runner.json`.

> **Example**
>
> ```yaml
> version: v4
> pipelines:
>   - name: My RDF Pipeline
>     endpoint: http://example.org/sparql
>     steps:
>       - src/add-schema.ru
> ```

## Pipelines

There are two pipeline types:

- `direct-update` which connects to a SPARQL endpoint and directly performs [SPARQL updates][sparql-update] on the endpoint.
- `construct-quads` which connects to SPARQL endpoints, local and remote RDF files and performs SPARQL [`CONSTRUCT`][sparql-construct] queries. The resulting quads are saved locally or uploaded remotely.

Available steps and destinations are limited by this choice.
