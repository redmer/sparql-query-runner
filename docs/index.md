# Configuring a pipline with `sparql-query-runner`

**`sparql-query-runner`** runs SPARQL queries (what's in a name), on remote endpoint as well as locally constructed datasets.

Locally constructed datasets can also
load from [local and remote files](#files-and-sparql-endpoints),
still execute SPARQL,
[validate using SHACL](#validate-rdf-data-using-shacl-with-stepsshacl)
and [save files](#export-a-job-dataset-to-a-local-file-with-targetsfile),
upload to [graph stores](#export-to-a-sparql-graph-store-or-sparql-quad-store-with-targetssparql-graph-store-and-targetssparql-quad-store)
and [some vendors](#upload-to-laces-hub-or-triplydb-with-targetslaces-hub-or-targetstriplydb) too.

It builds on [Comunica][comunica] and other JavaScript packages.

#### Terminology

A **workflow** is run from a **workflow file** (`.sqr.yaml`) and configures the steps taken.
A workflow consists of one or more **jobs** that each define sources, transformation steps, and targets.
A **source** is a RDF file or SPARQL endpoint, providing the data against which the later steps perform queries.
A **step** is a [SPARQL Update][sparql-update] or [SPARQL Construct][sparql-construct] query, a SHACL validation step or a shell command.
A **target** is a SPARQL endpoint, a local file or a remote graph store.
Data from unfiltered remote file sources and SPARQL endpoints are never collected for a target: these are queried differently.

# Running after installation

After installation, `sparql-query-runner` is available on your $PATH.
Provide the `--help` option to describe all subcommands and options.

Create a file called `workflow.sqr.yaml` (or at least ending in `.sqr.yaml`) to let `sparql-query-runner` automatically find the workflow file.
Although YAML is easy enough to edit with a text editor, you need to be careful with -- for YAML meaningful -- spaces, quotation marks and indentation.
An editor may provide feedback (VS Code does), by associating the workflow file with the JSON schema at `https://rdmr.eu/sparql-query-runner/schema.json`.

Run the workflow with `sparql-query-runner run`.
You may supply multiple workflow files with `--config`.

## Version, jobs and prefixes

Every workflow file defines its schema version (`version: v5`) and the constituent jobs.
Every job is an dictionary containing the details of that job.
The name of the job is lowercase \[a-z0-9\_-] and cannot start with a number.
When merging workflow files, no job may have the same name.

**Prefixes** can be defined at the workflow or job level.
Workflow-level prefixes are copied to each job, but jobs can overwrite them (but be beware: this is an easy source of bugs).
By default, the [RDFa core initial context prefixes][rdfa] are defined (i.a. `rdf:`, `sh:`).
Disable these default prefixes with the CLI option `--no-default-prefixes`.

The prefixes are used in three places:

- When exporting quads to abbreviated serialization formats, like Turtle or Trig.
- To expand CURIEs of `with: only-graphs:` and `with: into-graph:` arguments if those use known prefixes.
- To add prefix definitions with _inline_ SPARQL Update and Construct queries.
  If an inline query has a line starting with `PREFIX`, no prefixes are inserted.
  Queries loaded from a file need to supply their own prefix definitions.

```yaml
$schema: https://rdmr.eu/sparql-query-runner/schema.json
version: v5
jobs:
  my-job-2: ...
```

Jobs are executed top to bottom and are presumed to be dependent of each other:
that means that a job can export data to an endpoint and that the next job can assume it's available at an endpoint.
If your jobs are truly independent, enable parallel execution with `independent: true`.

## Access authentication with `with: credentials:`

There are three types of authentication built-in:

- HTTP basic authentication: provide `username:` and `password:`.
- Bearer authentication: provide a `token:` value.
- Arbitrary HTTP headers: provide a dictionary of header names and values in `headers:`.

It's better not to write access details like passwords in the version controlled workflow file.
You can environment variables instead, that are substituted in the source file with the `${var}` syntax.
They can be defined in a `.env` file in the working directory, which are automatically loaded.
An env-file should not be committed to public version control.

> [!TIP]
>
> With the following workflow file, provided the env-file thereafter, `sparql-query-runner` combines them as if
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
>
> Note that this variable substitution is also available for non-credential fields. Beware of YAML syntax and quote values wherever possible.

Found environment variables are substituted.
A backslash escapes this substitution, in the example with the password.
Variables that are not found, keep the syntax as-is.

## Limit and override graphs with `only-graphs:` and `into-graph:`

Sources may have more graphs than required, targets may be limited to certain graphs and some sources need to have their graph info overwritten.

- `only-graphs`: filter out other graphs.
  Its value is a list of URIs or CURIEs. Refer to the default graphs as `""`.
  Blank node labelled graphs cannot be referred to.
- `into-graph`: override the (named) graph of the quads.
  Its value is a single URI or CURIE. Refer to the default graph as `""`.
  Blank node labelled graphs cannot be used as target.

The latter is especially useful for SPARQL Construct queries that may not (according to SPARQL 1.1) have a `GRAPH {}` clause.

- For a **Source**:
  - `only-graphs:` filters the source's _output_ quads
  - `into-graph:` merges the source's _output_ quads
- For a **Step**:
  - `only-graphs:` filters the step's _input_ quads
  - `into-graph:` merges the step's _output_ quads
- For a **Target**:
  - `only-graphs:` filters the target's _input_ quads
  - `into-graph:` merges the target's _input_ quads

# Sources

## Files and SPARQL endpoints

Load a local or remote RDF file with `file`.
Save a remote endpoint for query steps with `sparql`.

| Configure                   | Notes                                    |
| --------------------------- | ---------------------------------------- |
| `sparql:`                   | Path to a remote SPARQL endpoint.        |
| `with:`                     |                                          |
| &nbsp;&nbsp; `credentials:` | Credentials to access the endpoint.      |
| &nbsp;&nbsp; `source-type:` | A [Comunica source type][c-source-type]. |

If the SPARQL endpoint supports Update queries, [`update:`](#update-rdf-data-with-update) steps _will_ update the endpoint.
If you want to redirect all updates, provide a [`sparql-update-endpoint`](#execute-sparql-update-queries-on-a-different-remote-sparql-store-with-sparql-update-endpoint).

[c-source-type]: https://comunica.dev/docs/query/advanced/source_types/#supported-source-types

| Configure                   | Notes                               |
| --------------------------- | ----------------------------------- |
| `file:`                     | Path to a local or remote RDF file. |
| `with:`                     |
| &nbsp;&nbsp; `only-graphs:` | Limit imported graphs. (List)       |
| &nbsp;&nbsp; `into-graph:`  | Override imported quads' graph.     |

Local file sources or modified remote files are implemented by `local-file-source`.
Other remote files as well as SPARQL endpoints are implemented by Comunica.

## Get datasets from Laces Hub or TriplyDB with `laces-hub` or `triplydb`

Get a dataset from a Laces Hub publication or a TriplyDB dataset.

| Configure                   | Notes                                     |
| --------------------------- | ----------------------------------------- |
| `laces-hub:`                | URL to a single publication on Laces Hub. |
| `with:`                     |
| &nbsp;&nbsp; `credentials:` | Credentials to fetch the resource.        |
| &nbsp;&nbsp; `into-graph:`  | Override imported quads' graph.           |

| Configure                   | Notes                              |
| --------------------------- | ---------------------------------- |
| `triplydb:`                 | URL to a TriplyDB dataset.         |
| `with:`                     |
| &nbsp;&nbsp; `credentials:` | Credentials to fetch the resource. |
| &nbsp;&nbsp; `only-graphs:` | Limit exported graphs. (List)      |
| &nbsp;&nbsp; `into-graph:`  | Override exported quads' graph.    |

Laces Hub publications contain a single graph.
The implementation downloads it as an RDF file and saves it to query on.

TriplyDB may or may not have a SPARQL service configured.
Instead, the implementation accesses the always available Triple Fragments service.

# Steps

## Easily validate a single constraint `assert`

This step executes a SPARQL ASK query.
The query should return `true` if all assertions are met and the workflow will continue.
If the query returns `false`, the workflow will stop.

| Configure               | Notes                                      |
| ----------------------- | ------------------------------------------ |
| `assert:`               | <li>Path to an .rq file <li>Inline query.  |
| `with:`                 |
| &nbsp;&nbsp; `message:` | Message for stderr if query returns false. |

Supply `--skip-assertions` to skip this step.

Implemented by Comunica.

## Validate RDF data using SHACL with `shacl`

This step validates the local and imported RDF data with SHACL.

| Configure                   | Notes                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `shacl:`                    | Path to an RDF file containing SHACL shapes. (Optional)                                         |
| `with:`                     |
| &nbsp;&nbsp; `only-graphs:` | Validate only over asserted triples from these graphs (default: only the default graph). (List) |
| &nbsp;&nbsp; `into-graph:`  | Put SHACL result set in this graph. Prevent output with `--`. (Default: `--`)                   |

If you provide a path to an RDF file containing SHACL shapes, it validates using the shapes its default graph.
These shapes are not added to the local dataset.
If the value is kept empty, it validates using the shapes in the dataset's default graph.

That means that the following are not validated:

- remote files (without `only-graphs` or `into-graph`)
- remote SPARQL endpoints

```yaml
steps:
  - shacl: my-shapes.ttl # validates using shapes in file
  - shacl: "" # validates using shapes in job dataset
```

The implementation is provided by `rdf-validate-shacl` and `shacl-engine`.

## Infer new statements with `infer`

Infer new statements using reasoning with RDFS or OWL2RL entailment regimes.

| Configure                   | Notes                                                                         |
| --------------------------- | ----------------------------------------------------------------------------- |
| `infer:`                    | Path to a file containing RDFS/OWL assertions. (Optional argument)            |
| `with:`                     |                                                                               |
| &nbsp;&nbsp; `ruleset:`     | Infer using `rdfs` (default) or `owl2rl`.                                     |
| &nbsp;&nbsp; `only-graphs:` | Infer only over asserted triples from these graphs (default: all). (List)     |
| &nbsp;&nbsp; `into-graph:`  | Put inferred triples in this graph (default: `""`). Prevent output with `--`. |

Provided ABox and TBox may be incongruent and cause the reasoner to emit a fatal error.
This is best for most knowledge graph building usecases, but some automated workflows might prefer not to error-out:
supply `--skip-reasoning` to skip this step.

Only locally constructed and loaded triples are subject to reasoning.
That excludes the following:

- remote files (without `only-graphs` or `into-graph`)
- remote SPARQL endpoints

Implemented by [`jeswr/hylar-core`](https://github.com/jeswr/hylar-core).

## Execute shell commands with `shell`

This step executes arbitrary shell (CLI) commands.

| Configure | Notes                                    |
| --------- | ---------------------------------------- |
| `shell:`  | The shell command to execute. (Required) |
| `with:`   | _No arguments supported._                |

This is a security concern when executing unknown workflows and jobs:
by default, `sparql-query-runner` will skip these steps (with a warning).
Use the CLI option `--warnings-as-errors` to ensure that stops the execution.

Provide the CLI option `--exec-shell` to execute these commands.
No arguments are supported.
If after execution of the command _stderr_ is not empty, it is output as step result and the workflow stops.
Command output on _stdout_ is not saved.

## Construct RDF data with `construct`

Use this step to issue SPARQL Construct (or Describe) queries.
It is issued against the job dataset and online sources.

| Configure                  | Notes                                             |
| -------------------------- | ------------------------------------------------- |
| `construct:`               | <li> Path to an .rq file <li>Inline query.        |
| `with:`                    |
| &nbsp;&nbsp; `into-graph:` | Insert constructed triples into a specific graph. |

Provide either a reference to a `.rq` file or a complete query.
Construct queries (as-of RDF 1.1) cannot provide graph (quad) info:
provide `with: into-graph:` to insert it into a specific graph.

```yaml
steps:
  - construct: >
      CONSTRUCT { ?s a ?c . } WHERE { ?s ?p ?o . ?o a ?c . }
  - construct: get-classes.rq
    with:
      into-graph: https://example.org/data#
```

Implemented by Comunica.

## Update RDF data with `update`

| Configure | Notes                                      |
| --------- | ------------------------------------------ |
| `update:` | <li> Path to an .ru file <li>Inline query. |
| `with:`   | _No arguments supported._                  |

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

Implemented by Comunica.

# Targets

## Export a job dataset to a local file with `file`

Export the job-local dataset to a local file with `file:`.

| Configure                   | Notes                               |
| --------------------------- | ----------------------------------- |
| `file:`                     | Path to a local or remote RDF file. |
| `with:`                     |
| &nbsp;&nbsp; `only-graphs:` | Limit exported graphs. (List)       |
| &nbsp;&nbsp; `into-graph:`  | Override exported quads' graph.     |

Serializers by N3.

## Export to a SPARQL graph store or SPARQL quad store with `sparql-graph-store` and `sparql-quad-store`

Update a remote SPARQL store with the SPARQL 1.1 Graph Store HTTP Protocol or SPARQL Quad Store protocol.

```yaml
targets:
  - sparql-graph-store: https://example.org/repositories/datastore
  - sparql-quad-store: https://example.org/repositories/datastore
```

| Configure                   | Notes                               |
| --------------------------- | ----------------------------------- |
| `sparql-graph-store:`       | URL to a remote SPARQL Graph Store. |
| `sparql-quad-store:`        | URL to a remote SPARQL Quad Store.  |
| `with:`                     |
| &nbsp;&nbsp; `only-graphs:` | Limit exported graphs. (List)       |
| &nbsp;&nbsp; `into-graph:`  | Override exported quads' graph.     |
| &nbsp;&nbsp; `credentials:` | Credentials to update the resource. |

## Execute SPARQL update queries on a different remote SPARQL store with `sparql-update-endpoint`

By default, Comunica executes SPARQL update queries on all updatable sources.
If you supply a `sparql:` target, this re-targets the Update query to the provided endpoint.
Only one single `sparql:` target is allowed.

| Configure                   | Notes                                   |
| --------------------------- | --------------------------------------- |
| `sparql-update-endpoint:`   | URL to a remote SPARQL update endpoint. |
| `with:`                     |
| &nbsp;&nbsp; `credentials:` | Credentials to update the resource.     |

```yaml
steps:
  - update: my-query.ru
targets:
  - sparql-update-endpoint: https://example.org/sparql-update
    with:
      credentials:
        token: hE7LoWh01Sp4tR1Ck
```

Implemented by Comunica.

## Upload to Laces Hub or TriplyDB with `laces-hub` or `triplydb`

| Configure                   | Notes                                           |
| --------------------------- | ----------------------------------------------- |
| `laces-hub:`                | URL to a publication on Laces Hub.              |
| `triplydb:`                 | URL to a TriplyDB dataset.                      |
| `with:`                     |
| &nbsp;&nbsp; `credentials:` | Credentials to update the resource.             |
| &nbsp;&nbsp; `only-graphs:` | Limit exported graphs. (List)                   |
| &nbsp;&nbsp; `into-graph:`  | Override exported quads' graph. (Only TriplyDB) |

The TriplyDB integration is by Triply.

---

[sparql-update]: http://www.w3.org/TR/2013/REC-sparql11-update-20130321
[sparql-http-update]: https://www.w3.org/TR/2013/REC-sparql11-http-rdf-update-20130321
[sparql-construct]: https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct
[laces]: https://hub.laces.tech
[comunica]: https://comunica.dev/
[rdfa]: https://www.w3.org/2011/rdfa-context/rdfa-1.1
