import fs from "fs/promises";
import type { ICredentialData } from "../config/types.js";
import * as Auth from "./auth.js";

export interface LacesHubRepositoryDesc {
  id: string;
  name: string;
  path: string;
}

export interface LacesHubPublicationDesc {
  id: string;
  uri: string; // with initial slash
  publicationDate: number;
  repositoryId: string;
  publisher: string;
  description: string;
  schemaURIs: string[];
  owner: string;
  versioningMode: string;
  useVersionedBaseUri: boolean;
  name: string;
}

export interface LacesHubPublicationPatch {
  owner: string;
  publisher: string;
  schemaURIs: string[];
  versionLabel?: string;
}

/** All accessible Laces repositories */
export async function repositories(
  auth: ICredentialData,
  repoName: string
): Promise<LacesHubRepositoryDesc[]> {
  const endpoint = `https://hub.laces.tech/api/v4/repositories?searchText=${encodeURIComponent(
    repoName
  )}`;
  const resp = await fetch(endpoint, { headers: { ...Auth.asHeader(auth) } });
  const answ = await resp.json();
  return answ["contents"];
}

/** All accessible publications in a Laces repository. */
export async function publications(
  repositoryId: string,
  auth: ICredentialData
): Promise<LacesHubPublicationDesc[]> {
  const endpoint = `https://hub.laces.tech/api/v4/publications?repositoryId=${repositoryId}`;
  const resp = await fetch(endpoint, { headers: { ...Auth.asHeader(auth) } });
  const answ = await resp.json();
  return answ["contents"];
}

export async function getPublicationContents(
  publicationId: string,
  auth: ICredentialData
): Promise<string> {
  const endpoint = `https://hub.laces.tech/api/v4/publications/${publicationId}/statements`;
  const resp = await fetch(endpoint, {
    headers: { ...Auth.asHeader(auth), Accept: "application/n-triples" },
  });
  const answ = await resp.text();
  return answ;
}

/** Update a publication in a Laces repository. */
export async function updatePublication(
  publicationId: string,
  contentPayloadPath: string,
  // metadataPayload: LacesHubPublicationPatch,
  auth: ICredentialData
): Promise<Response> {
  const endpoint = `https://hub.laces.tech/api/v4/publications/${publicationId}/statements/async`;

  const form = new FormData();
  const stream = await fs.readFile(contentPayloadPath);
  form.append("publisher", "sparql-query-runner");
  form.append("content", new Blob([stream], { type: "application/n-triples" }), "export.nt");

  const resp = await fetch(endpoint, {
    method: "PATCH",
    headers: { ...Auth.asHeader(auth) },
    body: form,
  });
  return resp;
}
