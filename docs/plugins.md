| job part | direct    | explicit                                                    |
| -------- | --------- | ----------------------------------------------------------- |
| source   | endpoint  |
| source   | file      | localfile, remotefile, msaccess                             |
| source   | update    | --                                                          |
| source   | construct |
| target   | endpoint  | sparql, sparql-target-graph-store, sparql-target-quad-store |
| target   | file      |
| target   | update    | sparql-update                                               |
| target   | construct |
| step     | endpoint  |
| step     | file      | sparql-query-construct, sparql-update                       |
| step     | update    | sparlq-update                                               |
| step     | construct | sparql-query-construct                                      |

## steps

- `source/file`
- `source/laces`
- `source/msaccess`
- `source/sparql`
- `source/triplydb`
- `step/construct`
- `step/shacl`
- `step/shell`
- `step/update`
- `target/file`
- `target/laces`
- `target/sparql-graph-store`
- `target/sparql-quad-store`
- `target/sparql`
- `target/triplydb`

# In general

`sparql-query-runner` processes, in accordance with RDF/JS types, only quads.
Triples are assumed to be in the default graphs.
Read up on RDF 1.1 quads and graphs if this only vaguely rings a bell.

## Provide arguments with `with`

Many sources, steps, and targets can be tunes with optional arguments.
In general these supply access credentials, and limit input and output to certain graphs.
Some steps have more arguments that are not auto-supplied by the autocomplete schema.
Refer to the this documentation instead.

## Access authentication with `with: credentials:`

There are three types of authentication built-in:
HTTP `Basic` authentication, `Bearer` token in a header, as well as supplying any list of `HTTP-Header`s.

It's better not to write access details like passwords in the version controlled workflow file.
You can environment variables instead, that are substituted in the source file with the `${var}` syntax.

> [!TIP]
>
> ```yaml
> source:
>   - sparql: ${DATABASE_ENDPOINT}
>     credentials:
>       username: ${DATABASE_ACCESS_TOKEN}
>       password: \${DATABASE_ACCESS_TOKEN}
> ```
>
> ```yaml
> # DATABASE_ACCESS_TOKEN is set to `abc123`
> source:
>   - sparql: ${DATABASE_ENDPOINT} # not found, kept as-is
>     credentials:
>       username: abc123 # found, substituted
>       password: \${DATABASE_ACCESS_TOKEN} # escaped, not substituted
> ```

Found environment variables are substituted.
A backslash escapes this substitution, in the example with the password.
Variables that are not found, keep the syntax as-is.

## Limit source and output graphs with `with: only-graphs:`

**Sources** and **targets** may have more graphs in their quads that required;
supply `only-graphs` to filter out other graphs.
Its value is a list of URIs or CURIEs. Refer to the default graphs as `""`.

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

This is especially useful for SPARQL Construct queries that may not (according to SPARQL 1.1) have a `GRAPH {}` clause.

```yaml
steps:
  - file: construct-library.rq
    with:
      target-graph: http://example.org/data
```

# Sources

## Microsoft Access DB `sources/msaccess`

This source loads a Microsoft Access database file and generates triples from it.
It is based on NPM package [`@rdmr-eu/rdfjs-source-msaccess`][rdfjs-source-msaccess], in turn on `mdb-reader`.

rdfjs-source-msaccess: https://github.com/redmer/rdfjs-source-msaccess

By default, the triples are generated with a model similar to Facade-X (`with: model: facade-x`).
Refer to documentation at [`@rdmr-eu/rdfjs-source-msaccess`][rdfjs-source-msaccess] how that looks like.
The simpler CSV mode is available too, using `with: model: csv`.

> ```yaml
> msaccess: data/library.db
> with:
>   model: csv
> ```

# Steps

# Targets
