import fs from "fs";
import fetch, { FormData, Response } from "node-fetch";
import type { ICredentialData } from "../config/types";
import * as Auth from "./auth.js";

export interface LacesHubRepositoryDesc {
  id: string;
  name: string;
  fullPath: string;
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
export async function repositories(auth: ICredentialData): Promise<LacesHubRepositoryDesc[]> {
  const endpoint = `https://hub.laces.tech/api/v3/repositories`;
  const resp = await fetch(endpoint, { headers: { ...Auth.asHeader(auth) } });
  return (await resp.json()) as LacesHubRepositoryDesc[];
}

/** All accessible publications in a Laces repository. */
export async function publications(
  repositoryId: string,
  auth: ICredentialData
): Promise<LacesHubPublicationDesc[]> {
  const endpoint = `https://hub.laces.tech/api/v3/repositories/${repositoryId}/publications`;
  const resp = await fetch(endpoint, { headers: { ...Auth.asHeader(auth) } });
  return (await resp.json()) as LacesHubPublicationDesc[];
}

/** Update a publication in a Laces repository. */
export async function updatePublication(
  publicationId: string,
  contentPayloadPath: string,
  metadataPayload: LacesHubPublicationPatch,
  auth: ICredentialData
): Promise<Response> {
  const endpoint = `http://hub.laces.tech/api/v3/publications/${publicationId}`;
  const metadata = { ...metadataPayload };

  const form = new FormData();
  form.append("content", fs.createReadStream(contentPayloadPath));
  form.append("metadata", JSON.stringify(metadata));

  const resp = await fetch(endpoint, {
    method: "PATCH",
    headers: { ...Auth.asHeader(auth) },
    body: form,
  });
  return resp;
}
