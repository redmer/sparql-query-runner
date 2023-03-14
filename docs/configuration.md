## Configuration file `sparql-query-runner.yaml`

`sparql-query-runner` uses a configuration file to describe the steps of a workflow.
The file describes one or more workflows that have discrete SPARQL endpoints, query steps, data sources and data destinations.

Supply the filename with `-i` or name it `sparql-query-runner.yaml` so it may be auto-discovered in the present working directory (PWD).
You may provide multiple workflows in a single file as well as multiple configuration files (each with `-i`).

### YAML example

Although YAML is easy enough to edit with a text editor, you need to be careful with -- for YAML meaningful -- spaces, quotation marks and indentation.
Use an editor with JSON Schema support to get feedback on the right usage of the configuration file, by providing the JSON Schema file at:

> https://rdmr.eu/sparql-query-runner/v2-schema.json

Both JSON and YAML files are supported. In JSON files, comments are not supported.

> **Example**
>
> ```yaml
> version: v4
> pipelines:
>   - name: My RDF Pipeline
>     endpoint: http://example.org/sparql
>     steps:
>       - src/example.rq
> ```

## Schema

There are two types of workflows:

- `direct-update` which connects to a SPARQL endpoint and directly performs [SPARQL updates][sparql-update] on the endpoint.
- `construct-quads` which connects to SPARQL endpoints, local and remote RDF files and performs SPARQL [`CONSTRUCT`][sparql-construct] queries. The resulting quads are saved locally or uploaded remotely.

Available steps, sources and destinations are limited by this choice.

1. All workflows support:
   - `name`: A human-readable name of a workflow
   - `prefixes`: An alias to namespace mapping
   - `independent`: This workflow can be run without waiting for others.
1. Direct SPARQL update workflows support:
   - `type`: `direct-update`
   - `endpoint`: A SPARQL endpoint that supports update queries.
   - `steps`: A list of query steps that update the data on the endpoint.
1. SPARQL Construct quads workflow support:
   - `type`: `construct-quads`
   - `sources`: A list of RDF sources to be made available for the steps to query over.
   - `destinations`: A list of files or RDF stores that the constructed quads get exported to.
   - `steps`: A list of query steps that construct the data.

### For all values

Values for local files are relative to the PWD.
They must NOT start with `file://`.
Internet accessible files must start with `http://` or `https://`.
If the resource requires authentication, provide an auth map with the reference to the credentials.
Graph names are supplied as fully qualified URIs.

#### Authorization

For resources that require authorized access, provide the credentials in a `.env` file relative to the PWD.
That file should not be committed to public version control.

```conf
SERVICE_USERNAME=user@example.org
SERVICE_PASSWORD=sekret
SERVICE_BEARER_TOKEN=b057fcfe-2d67-4794-9125-f9def24306eb
```

Connect a resource with it's access credentials by adding a `auth:` map to the step, destination, endpoint or source.
Multiple access credentials may not be supported when combining `sparql` or `auto` sources, `sparql` or `auto` destinations, all with `endpoint`s.

1. HTTP Basic auth
   ```yaml
   auth:
     user_env: SERVICE_USERNAME
     password_env: SERVICE_PASSWORD
   ```
2. Bearer token auth
   ```yaml
   auth:
     token_env: SERVICE_BEARER_TOKEN
   ```

### Sources

```yaml
sources:
  - workflow-input.nq # directly import all graphs of a file
  - type: auto # remote file
  - type: local-file
    url: workflow-input.nq
    onlyGraphs: [""] # the import is limited to this list of graphs
  - type: msaccess # provide table triples in <csv:> namespace
    url: database.db
  - type: msaccess-xyz # provide table triples in Façade-X style
    url: database.db
  - type: sparql # Query a SPARQL endpoint
    url: https://example.org/sparql
    auth: {}
```

Each source represents a _source_ of RDF quads.
This can be a RDF file (like `.ttl` or `.trig`) that is accessible online or locally.
It could also be a SPARQL read endpoint.
For Microsoft Access databases, provide `type: msaccess` or `type: msaccess-xyz` to generate quads in the `csv:` or Façade-X schema.

By default, all graphs are loaded into their named graphs or the default graph if not specified in-data.
You may limit the loaded graphs by supplying `onlyGraphs: [..., ...]`: a list of the fully qualified URIs of the graphs. The default graph name is `""`.

### Destinations

```yaml
destinations:
  - workflow-results.ttl # directly write to a file, type determined by file extension
  - type: file
    url: workflow-results.ttl
    onlyGraphs: # only export these graphs, usable everywhere
      - https://example.org/id/MyGraph
  - type: sparql
    url: https://example.org/repositories/example/statements
    auth: {}
  - type: auto # default
    url: workflow-results.ttl
  - type: sparql-graph-store
    url: https://example.org/repositories/example/statements
    auth: {}
  - type: sparql-quad-store
    url: https://example.org/repositories/example/statements
    auth: {}
  - type: laces
    url: https://hub.laces.tech/group/repo/publ
    auth: {}
```

Each destination represents a place to export RDF quads to.
This can be
a local RDF file,
a [SPARQL Graph Store][sparql-http-update],
or the [Laces Hub][laces].

### Steps

```yaml
steps:  # in a construct-quads workflow
  - query-construct.rq  # directly write the path to the query file
  - type: sparql-construct  # or explicitely mention the type
    url:
      - query-construct.rq  # url may or may be not a list within a step
    intoGraph: https://example.org/id/MyGraph  # constructed quads go into the specified graph
  - type: sparql-construct
    url: query-construct.rq
    targetClass: https://example.org/def/Book  # the sh:targetClass for a constructed sh:SPARQLRule
  - type: shacl-validate
    url: book-shapes.ttl  # the file containing the SHACL shapes
  - query: >
      CONSTRUCT { ?s a ex:Typo } WHERE { ?s a ex:SpellingError . }
    intoGraph: https://example.org/id/MyGraph  # constructed quads go into the specified graph
steps:  # in an direct-update workflow
  - query-update.ru
  - type: sparql-update
    url: query-update.ru
  - update: >
      INSERT { ?s a ex:Typo } WHERE { ?s a ex:SpellingError . }
```

Steps perform SPARQL queries, either Update queries (`.ru`) or Construct queries (`.rq`) or perform SHACL validation.

The SHACL validator (`type: shacl-validate`) can only check the state of the locally constructed quads. Provide a link to a file with in the default graph the SHACL shapes that need to be checked.

### Endpoint

The endpoint is a SPARQL Update endpoint, that can process `.ru` queries.
Supply [auth details](#authorization) with `auth: {}` if required.

[sparql-update]: http://www.w3.org/TR/2013/REC-sparql11-update-20130321
[sparql-http-update]: https://www.w3.org/TR/2013/REC-sparql11-http-rdf-update-20130321
[sparql-construct]: https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct
[laces]: https://hub.laces.tech
[comunica]: https://comunica.dev/
