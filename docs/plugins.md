# Configuring a pipline with `sparql-query-runner`

**`sparql-query-runner`** runs SPARQL queries (what's in a name), on remote endpoint as well as locally constructed datasets.

Locally constructed datasets can also
load from [local and remote files](#files-and-sparql-endpoints),
still execute SPARQL,
[validate using SHACL](#validate-rdf-data-using-shacl-with-stepsshacl)
and [save files](#export-a-job-dataset-to-a-local-file-with-targetsfile),
upload to [graph stores](#export-to-a-sparql-graph-store-or-sparql-quad-store-with-targetssparql-graph-store-and-targetssparql-quad-store)
and [some vendors](#upload-to-laces-hub-or-triplydb-with-targetslaces-hub-or-targetstriplydb) too.

It does all this building on [Comunica][comunica], _a knowledge graph querying framework_.

A **workflow** is run from a **workflow file** (`.sqr.yaml`) and configures the steps taken.
A workflow consists of one or more **jobs** that each define sources, transformation steps, and targets.
A **source** is a RDF file or SPARQL endpoint, providing the data against which the later steps perform queries.
A **step** is a [SPARQL Update][sparql-update] or [SPARQL Construct][sparql-construct] query, a SHACL validation step or a shell command.
A **target** is a SPARQL endpoint, a local file or a remote graph store.

# Calling

After installation, `sparql-query-runner` is available on your $PATH.
Provide the `--help` option to describe all subcommands and options.

# On further configuration

Create a file called `sparql-query-runner.sqqr.yaml` (or at least ending in `.sqqr.yaml`) to let `sparql-query-runner` automatically find the workflow file.
Although YAML is easy enough to edit with a text editor, you need to be careful with -- in YAML meaningful -- spaces, quotation marks and indentation.
An IDE may provide feedback (VS Code does), by associating the workflow file with the JSON schema at `https://rdmr.eu/sparql-query-runner/schema.json`.

Run the workflow with `sparql-query-runner run`.
You may supply multiple workflow files with `--config`.

## Version, jobs and prefixes

Every workflow file defines its schema version (`version: v5`) and the constituent jobs.
Every job is an dictionary containing the details of that job.
The name of the job is lowercase \[a-z0-9\_-] and cannot start with a number.

**Prefixes** can be defined at the workflow or job level.
Workflow-level prefixes are copied to each job, but jobs can overwrite them (do not recommend, as this is an easy source of bugs).
By default, the [RDFa core initial context prefixes][rdfa] are defined (i.a. `rdf:`, `sh:`).
Disable these default prefixes with the CLI option `--no-default-prefixes`.

The prefixes are used in three places:

- When exporting files to abbreviated (i.e., not NQuads or NTriples) serialization formats.
- To expand CURIEs of graph arguments if those use known prefixes.
  That only happens with `with: only-graphs:` and `with: target-graph:`.
- To add prefix definitions with inline SPARQL Update and Construct queries.
  If an inline query has a line starting with `PREFIX`, no prefixes are inserted.
  Queries loaded from a file need to supply their own prefix definitions.

```yaml
$schema: https://rdmr.eu/sparql-query-runner/schema.json
version: v5
jobs:
  my-job-2: ...
```

Jobs are executed top to bottom and are presumed to be dependent of eachother:
that means that a job can export data to an endpoint and that the next job can assume it's available at an endpoint.
If your jobs are truly independent, enable parallel execution with `independent: true`.

## Provide arguments with `with`

Many sources, steps, and targets can be tuned with optional arguments.
In general these supply access credentials, and limit input and output to certain graphs.
Refer to the this documentation instead.

## Access authentication with `with: credentials:`

There are three types of authentication built-in:
HTTP `Basic` authentication, `Bearer` token in a header, as well as supplying any list of `HTTP-Header`s.

It's better not to write access details like passwords in the version controlled workflow file.
You can environment variables instead, that are substituted in the source file with the `${var}` syntax.
They can be defined in a `.env` file in the working directory, which are automatically loaded.
An env-file should not be committed to public version control.

> [!TIP]
>
> With the following workflow file, the env-file thereafter, `sparql-query-runner` combines them as if
> the third example was what was written.
>
> ```yaml
> sources:
>   - sparql: ${DATABASE_ENDPOINT}
>     with:
>       credentials:
>         username: ${DATABASE_ACCESS_TOKEN}
>         password: \${DATABASE_ACCESS_TOKEN}
> ```
>
> ```conf
> DATABASE_ACCESS_TOKEN=abc132
> ```
>
> ```yaml
> sources:
>   - sparql: ${DATABASE_ENDPOINT} # not found, kept as-is
>     with:
>       credentials:
>         username: abc123 # found, substituted
>         password: \${DATABASE_ACCESS_TOKEN} # escaped, not substituted
> ```

Found environment variables are substituted.
A backslash escapes this substitution, in the example with the password.
Variables that are not found, keep the syntax as-is.

## Limit source and output graphs with `with: only-graphs:`

**Sources** and **targets** may have more graphs in their quads than required;
supply `only-graphs` to filter out other graphs.
Its value is a list of URIs or CURIEs. Refer to the default graphs as `""`.
Blank node labelled graphs cannot be referred to. Write a query instead. An example is provided below.

```yaml
sources:
  - file: data/library.nq
    with:
      only-graphs:
        - schema:graph
        - http://example.org/data
        - ""
```

## Modify source graph with `with: target-graph:`

**Sources** and **steps** may supply `target-graph` to override the (named) graph of the quads.
Its value is a single URI or CURIE. Refer to the default graph as `""`.
Blank node labelled graphs cannot be used as target.

This is especially useful for SPARQL Construct queries that may not (according to SPARQL 1.1) have a `GRAPH {}` clause.

```yaml
steps:
  - file: construct-library.rq
    with:
      target-graph: http://example.org/data
```

# Sources

## Files and SPARQL endpoints

- `file:` loads a local or remote RDF file.
- `sparql:` saves a remote endpoint for query steps.

Files and SPARQL endpoints are provided by `sources/comunica-auto`.
If the file source is local or modified with `with: target-graph:` or `with: only-graphs:`, it is provided by `sources/file`.

# Steps

## Validate RDF data using SHACL with `steps/shacl`

This step validates the local and imported RDF data with SHACL.
(Provided by `rdf-validate-shacl`.)

That means that the following are not validated:

- remote files (without `only-graphs` or `target-graph`)
- remote SPARQL endpoints

Either provide a filepath to an RDF containing SHACL shapes or the empty string `""`.
The former validates using those shapes but doesn't add them to the local dataset.
The latter validates using the shapes in the job dataset.

```yaml
steps:
  - shacl: my-shapes.ttl # validates using shapes in file
  - shacl: "" # validates using shapes in job dataset
```

## Execute shell commands with `steps/shell`

This step executes arbitrary shell (CLI) commands.
This is a security concern when executing unknown workflows and jobs:
by default, `sparql-query-runner` will skip these steps (with a warning).
Use the CLI option `--warnings-as-errors` to ensure that stops the execution.

Use the CLI option `--exec-shell` to execute these commands.
There is a 1 second delay before the command is executed, so you may quit execution.

## Construct RDF data with `steps/construct`

Use this step to issue SPARQL Construct (or Describe) queries.
It is issued against the job dataset and online sources.

Provide either a reference to a `.rq` file or a complete query.
Construct queries (as-of RDF 1.1) cannot provide graph (quad) info:
provide `with: target-graph:` to insert it into a specific graph.

```yaml
steps:
  - construct: >
      CONSTRUCT { ?s a ?c . } WHERE { ?s ?p ?o . ?o a ?c . }
  - construct: get-classes.rq
    with:
      target-graph: https://example.org/data#
```

## Update RDF data with `steps/update`

Use this step to issue SPARQL Update queries against remote SPARQL endpoints.
The WHERE clause uses the job-local dataset and the remote endpoint.

Provide either a reference to a `.ru` file or a complete query.
Provide graph targets or limitations within the query.

```yaml
steps:
  - update: >
      INSERT DATA { <https://example.org/> a <http://schema.org/Website> }
  - update: website-data.ru
```

# Targets

## Export a job dataset to a local file with `targets/file`

Export the job-local dataset to a local file with `file:`.

## Export to a SPARQL graph store or SPARQL quad store with `targets/sparql-graph-store` and `targets/sparql-quad-store`

Update a remote SPARQL store with the SPARQL Graph Store or SPARQL Quad Store protocol.

```yaml
targets:
  - sparql-graph-store: https://example.org/repositories/datastore
  - sparql-quad-store: https://example.org/repositories/datastore
```

## Execute SPARQL update queries on a different remote SPARQL store with `targets/sparql`

By default, Comunica executes SPARQL update queries on all updatable sources.
If you supply a `sparql:` target, this re-targets the Update query to the provided endpoint.
Only one `sparql:` target is allowed.

```yaml
steps:
  - update: my-query.ru
targets:
  - sparql: https://example.org/sparql-update
    with:
      credentials:
        token: hE7LoWh01Sp4tR1Ck
```

## Upload to Laces Hub or TriplyDB with `targets/laces-hub` or `targets/triplydb`

...

[sparql-update]: http://www.w3.org/TR/2013/REC-sparql11-update-20130321
[sparql-http-update]: https://www.w3.org/TR/2013/REC-sparql11-http-rdf-update-20130321
[sparql-construct]: https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct
[laces]: https://hub.laces.tech
[comunica]: https://comunica.dev/
[rdfa]: https://www.w3.org/2011/rdfa-context/rdfa-1.1
