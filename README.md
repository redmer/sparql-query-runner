# sparql-query-runner

This NodeJS executable runs a series of pipeline steps, defined in `sparql-query-runner.json` in the folder root.

## Usage

```sh
$ npx @redmer/sparql-query-runner
```

For the configuration file, a JSON Schema is available at `https://rdmr.eu/ns/sparql-query-runner/schema.json`. 
Supported editors, incuding VS Code, provide syntax validation and text completion using the schema.

Below example shows an excerpt from [@stichting-crow/imbor](https://github.com/stichting-crow/imbor).
There is a single (developer-local) endpoint used, that gets the defined prefixes set.
Then, a MS-Access database is imported into the GraphDB-instance, 
five `INSERT {} WHERE {}`-SPARQL update requests are sent.
After a short delay (default: 5 sec), two graphs are downloaded.   

```json
{
  "$schema": "https://rdmr.eu/ns/sparql-query-runner/schema.json",
  "pipeline": {
    "name": "Example pipeline (IMBOR 2021)",
    "endpoint": "http://localhost:7200/repositories/imbor-2021/statements",
    "prefixes": {
      "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "nen2660": "https://w3id.org/nen2660/def#",
      "nen3610": "http://definities.geostandaarden.nl/def/nen3610#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
      "sh": "http://www.w3.org/ns/shacl#",
      "skos": "http://www.w3.org/2004/02/skos/core#"
    },
    "steps": [
      {
        "type": "set-prefixes",
        "url": "http://localhost:7200/repositories/imbor-2021"
      },
      {
        "type": "import-msaccess",
        "url": "resources/mdb/IMBOR-2022.c02.accdb"
      },
      {
        "type": "sparql",
        "url": [
          "resources/transformations/attributen.rq",
          "resources/transformations/klassen-definities.rq",
          "resources/transformations/klassen-hierarchie.rq",
          "resources/transformations/termen-en-collecties.rq",
          "resources/transformations/vakdisciplines.rq",
        ]
      },
      {
        "type": "delay"
      },
      {
        "type": "download-file",
        "url": "resources/imbor-vocabulair.ttl",
        "graphs": ["https://data.crow.nl/imbor/term/"]
      },
      {
        "type": "download-file",
        "url": "resources/imbor-ontologie.ttl",
        "graphs": ["https://data.crow.nl/imbor/def/"]
      }
    ]
  }
}
```

## Requirements

- A SPARQL server endpoint.
  Note: currently only GraphDB (RDF4J) has been tested.
  PR's are welcome to add support for other backends.

## Documentation on step types

Available at [docs/](docs/).
