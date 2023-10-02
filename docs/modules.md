# Module usage

The following table indicates for any module if it can be used as Source, Step or Target.
And if so, which arguments may be supplied.

| Name               | Source | Step | Target | Credentials | Into-Graph    | Only-Graphs | Other args |
| ------------------ | ------ | ---- | ------ | ----------- | ------------- | ----------- | ---------- |
| sparql             | \*     |      | \*     | \*          |
| file               | \*     |      | \*     |             | \*            | \*          |
| laces-hub          | \*     |      | \*     | Always      | When Source   | When Target |
| triplydb           | \*     |      | \*     | Always      | \*            | \*          |
| shacl              |        | \*   |        |             | Results-Graph | \*          |
| reason             |        | \*   |        |             | Results-Graph | \*          | Ruleset    |
| construct          |        | \*   |        |             | \*            |
| shell              |        | \*   |
| assert             |        | \*   |        |             |               |             | Message    |
| update             |        | \*   |
| sparql-graph-store |        |      | \*     | \*          | \*            | \*          |
| sparql-quad-store  |        |      | \*     | \*          | \*            | \*          |

TODO: Rename Target-Graph to Into-Graph for Sources, Steps, Targets.
TODO: Rename Into-Graph for validate steps (shacl, reason) into Results-Graph
TODO: Is it clear enough Sparql is either a Source and implied Target or explicitly a Target

- If Source:
  - Only-Graphs: filters Output-Quad-Stream
  - Into-Graph: merges Output-Quad-Stream
- If Step:
  - Only-Graphs: filters Input-Quad-Stream
  - Into-Graph: merges Output-Quad-Stream
- If Target:
  - Only-Graphs: filters Input-Quad-Stream
  - Into-Graph: merges Input-Quad-Stream
