# Definitions

**Layers** are cacheable, depend on each other and primarily represent sources, steps and targets.
The implementation of specific layers are to be found in sources/, steps/, targets/.

- sources
- steps
- targets
- jobs (the aggregate of sources, steps, targets)
- config (the aggregate of jobs)

Each layer can be cached, depending on

The job/source/step/target cache tries to cache previous results and discard them
if input parameters change.

| DEPENDENT | DEPENDS ON                                                                  |
| --------- | --------------------------------------------------------------------------- |
| Config    | Included jobs                                                               |
| Jobs      | Preceding jobs (unless .independent)                                        |
|           | the configuration prefixes                                                  |
|           | all of their sources/steps/targets (!)                                      |
|           | targets are dependent on steps are dependent on sources. Just targets then. |
| Sources   | local and remote filesystem or service changes                              |
| Steps     | the job prefixes                                                            |
|           | loaded sources                                                              |
|           | preceding steps                                                             |
|           | file: external changes                                                      |
|           | file: variable functions (BNODE(), UUID(), STRUUID(), RAND(), NOW())        |
| Targets   | loaded sources                                                              |
|           | performed steps                                                             |
|           | the job prefixes                                                            |
