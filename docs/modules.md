# Module usage as Source, Step or Target: and with which arguments

The following table indicates for any module if it can be used as Source, Step or Target.
And if so, which arguments may be supplied.

| Module type            | Source | Step | Target | `credentials` | `into-graph`  | `only-graphs` | Other                                         |
| :--------------------- | :----: | :--: | :----: | :-----------: | :-----------: | :-----------: | :-------------------------------------------- |
| sparql                 |   \*   |      |   \*   |      \*       |               |               | Source-Type                                   |
| sparql-update-endpoint |        |      |   \*   |      \*       |
| file                   |   \*   |      |   \*   |               |      \*       |      \*       |
| laces-hub              |   \*   |      |   \*   |    always     |  when Source  |  when Target  |
| triplydb               |   \*   |      |   \*   |    always     |      \*       |      \*       |
| construct              |        |  \*  |        |               |      \*       |
| update                 |        |  \*  |
| assert                 |        |  \*  |        |               |               |               | Message                                       |
| shell                  |        |  \*  |
| http-request           |        |  \*  |        |               |               |               | Body, Body-File, Destination, Method, Headers |
| shacl                  |        |  \*  |        |               |               |      \*       |
| infer                  |        |  \*  |        |               | Results-Graph |      \*       | Ruleset                                       |
| sparql-graph-store     |        |      |   \*   |      \*       |      \*       |      \*       |
| sparql-quad-store      |        |      |   \*   |      \*       |      \*       |      \*       |

Refer to the [modules documentation](index.md) to look up what these arguments may do.
