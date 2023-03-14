# `@rdmr-eu/sparql-query-runner`

This application runs a predefined (series of) pipeline(s) that consists of
[SPARQL 1.1 Update][sparql-update] queries and [SPARQL `CONSTRUCT`][sparql-construct] queries.
It can also check the latter for wellformedness using SHACL,
as well as upload artifacts to [SPARQL Graph Stores][sparql-http-update] and [Laces Hub][laces].
It does all this building on [Comunica][comunica], _a knowledge graph querying framework_.

[sparql-update]: http://www.w3.org/TR/2013/REC-sparql11-update-20130321
[sparql-http-update]: https://www.w3.org/TR/2013/REC-sparql11-http-rdf-update-20130321
[sparql-construct]: https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct
[laces]: https://hub.laces.tech
[comunica]: https://comunica.dev/

## Usage

- [Configuring `sparql-query-runner` workflows](configuration.md)
- [Running `sparql-query-runner` from the Command Line Interface](cli.md)
