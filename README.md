# sparql-query-runner

This NodeJS executable runs a series of pipeline steps, defined in `sparql-query-runner.json` in the folder root.

## Usage

```sh
$ npm install --global @redmer/sparql-query-runner
$ sparql-query-runner
```

For the configuration file, a JSON Schema is available at `https://rdmr.eu/sparql-query-runner/schema.json`.
Supported editors, incuding VS Code, provide syntax validation and text completion using the schema.

Below example shows an excerpt from [@stichting-crow/imbor](https://github.com/stichting-crow/imbor).
There is a single (developer-local) endpoint used, that gets the defined prefixes set.
Then, a MS-Access database is imported into the GraphDB-instance,
five `INSERT {} WHERE {}`-SPARQL update requests are sent.
After a short delay (default: 5 sec), two graphs are downloaded.

```yaml
version: v5
prefixes:
  ex: https://example.org/
jobs:
  my-first-job:
    sources:
      - file: test1.ttl
        with:
          into-graph: https://example.org/data
    steps:
      - construct: >
          CONSTRUCT { <https://rdmr.eu/> a <http://schema.org/Blog> } WHERE {}
        with:
          into-graph: ex:data
      - shell: echo 'Hello, world'
      - update: >
          INSERT DATA { <https://rdmr.eu/> a <http://schema.org/PostOffice> . }
    targets:
      - file: output1.trig
```

## Documentation on step types

Available at [docs/](docs/).
