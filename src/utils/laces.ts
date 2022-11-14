import fs from "fs";
import fetch, { FormData, Response } from "node-fetch";
import { IAuthentication } from "../config/types";
import { authenticationAsHeader } from "./authentication";

export interface LacesRepositoryDesc {
  id: string;
  name: string;
  fullPath: string;
}

export interface LacesPublicationDesc {
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

export interface LacesPublicationPatch {
  owner: string;
  publisher: string;
  schemaURIs: string[];
}

export namespace Laces {
  export async function repositories(auth: IAuthentication): Promise<LacesRepositoryDesc[]> {
    const endpoint = `https://hub.laces.tech/api/v3/repositories`;
    const resp = await fetch(endpoint, { headers: { ...authenticationAsHeader(auth) } });
    return (await resp.json()) as LacesRepositoryDesc[];
  }

  export async function publications(
    repositoryId: string,
    auth: IAuthentication
  ): Promise<LacesPublicationDesc[]> {
    const endpoint = `https://hub.laces.tech/api/v3/repositories/${repositoryId}/publications`;
    const resp = await fetch(endpoint, { headers: { ...authenticationAsHeader(auth) } });
    return (await resp.json()) as LacesPublicationDesc[];
  }

  export async function updatePublication(
    publicationId: string,
    contentPayloadPath: string,
    metadataPayload: LacesPublicationPatch,
    auth: IAuthentication
  ): Promise<Response> {
    const endpoint = `http://hub.laces.tech/api/v3/publications/{publicationId}`;
    const metadata = {};

    const form = new FormData();
    form.append("content", fs.createReadStream(contentPayloadPath));
    form.append("metadata", JSON.stringify(metadata));

    const resp = await fetch(endpoint, {
      method: "PATCH",
      headers: { ...authenticationAsHeader(auth) },
      body: form,
    });
    return resp;
  }
}
