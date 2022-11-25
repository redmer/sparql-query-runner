import { Parser } from "sparqljs";

const query = `
CONSTRUCT { 
  GRAPH <urn:targetgraph> {
    ?s ?p ?o .
  }
} WHERE {
  ?s ?p ?o .
  filter ( lang(?o) = "nl" )
}`;

const p = new Parser({ sparqlStar: true });
const results = p.parse(query);

console.log(results);
