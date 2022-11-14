const MIMETYPE_MAP = {
  "application/trig": [".trig"],
  "application/n-quads": [".nq", ".nquads"],
  "text/turtle": [".ttl", ".turtle"],
  "application/n-triples": [".nt", ".ntriples"],
  "text/n3": [".n3"],
  "application/ld+json": [".json", ".jsonld"],
  "application/rdf+xml": [".rdf", ".rdfxml", ".owl"],
  "text/html": [".html", ".htm", ".xhtml", ".xht"],
  "image/svg+xml": [".xml", ".svg", ".svgz"],
};

const key = (ext: string) => Object.keys(MIMETYPE_MAP).find((k) => MIMETYPE_MAP[k].includes(ext));

/**
 * Get the media type based on the extension of the given path,
 * which can be an URL or file path.
 * @param {string} path A path.
 * @return {string} A media type or the empty string.
 */
export function getMediaTypeFromExtension(path: string): string {
  const dotIndex = path.lastIndexOf(".");
  // Get extension after last dot and map to media
  return (dotIndex >= 0 && key(path.slice(dotIndex + 1))) || "";
}
