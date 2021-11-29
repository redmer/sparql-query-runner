# `import-msaccess`

This step imports a Microsoft Access (`.mdb` `.accessdb`) into a GraphDB file.
Only tables are converted.

Each tables is in a separate graph, named `<csv:table/{{table-name}}>`.
Each row becomes a subject (usefullness questionable).
Each column becomes a predicate (`<csv:{{column-name}}>`) and the value an object.
See [import-msaccess](src/steps/import-msaccess.ts) to see the algorith for data types.

Optionally supply `"keep-nulls": true` to also generate `?s ?p <csv:None>` triples for cells where the value is null.
