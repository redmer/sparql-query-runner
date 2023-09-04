export const MIMETYPE_MAP = {
  "application/trig": [".trig"],
  "application/n-quads": [".nq", ".nquads"],
  "text/turtle": [".ttl", ".turtle"],
  "application/n-triples": [".nt", ".ntriples"],
  "text/n3": [".n3"],
  "application/ld+json": [".json", ".jsonld"],
  "application/rdf+xml": [".rdf", ".rdfxml", ".owl"],
  "text/html": [".html", ".htm", ".xhtml", ".xht"],
  "image/svg+xml": [".xml", ".svg", ".svgz"],
} as const;

export type SerializationFormat = keyof typeof MIMETYPE_MAP;

function mimetypeForExtension(ext: string): SerializationFormat | undefined {
  return Object.keys(MIMETYPE_MAP).find((k) =>
    MIMETYPE_MAP[k].includes(ext)
  ) as SerializationFormat;
}

/**
 * Get the media type based on the extension of the given path,
 * which can be an URL or file path.
 * @param {string} path A path.
 * @return {string} A media type or the empty string.
 */
export function getRDFMediaTypeFromFilename(path: string): SerializationFormat | undefined {
  const dotIndex = path.lastIndexOf(".");
  if (dotIndex < 0) return; // return early if not found
  return mimetypeForExtension(path.slice(dotIndex));
}
