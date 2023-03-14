## Running `sparql-query-runner` from the Command Line Interface

# Installation and basic usage

`sparql-query-runner` requires Node 18 to be installed.
It can be run without installing with `npx`:

```cli
$ npx @rdmr-eu/sparql-query-runner run
```

Or it can be installed locally, using `npm`. It is then always available in `$PATH` as `sparql-query-runner`.

```cli
$ npm install -g @rdmr-eu/sparql-query-runner
  [installing...]
$ sparql-query-runner run
```

## CLI commands

The command line interface of `@rdmr-eu/sparql-query-runner` or `$ sparql-query-runner`:

- subcommand `run`: run a pipeline
  - option `--cache`: Cache each step's results locally (default: false)
  - option `-i, --config`: Path to pipeline file (default: "sparql-query-runner.yaml")
- subcommand `rules`: generate SHACL Rules from CONSTRUCT steps
  - option `-i, --config`: Path to pipeline file (default: "sparql-query-runner.yaml")
- option `--version`: Show version number
- option `--help`: Show help
