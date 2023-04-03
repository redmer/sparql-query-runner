import type { IProxyHandler, IRequest } from "@comunica/types";
import type { RequestInfo } from "node-fetch";
import { Request } from "node-fetch";
import type { ICredential } from "../config/types.js";
import * as Auth from "./auth.js";

/**
 * Comunica only supports Basic auth by default, this helper provides middleware
 * that enables bearer tokens, too. It modifies every Comunica request with the
 * passed-through credentials.
 */
export class BasicBearerAuthProxyHandler implements IProxyHandler {
  #credentials: ICredential;

  /**
   * Add supplied credentials to all requests.
   *
   * @param credentials The credentials to be passed through. Note that an
   * {@link ICredential} is passed, so that future auth types may be supported.
   * Such types would be implemented in {@link Auth.asHeader}.
   */
  public constructor(credentials: ICredential) {
    this.#credentials = credentials;
  }

  public async getProxy(request: IRequest): Promise<IRequest> {
    return {
      init: request.init,
      input: this.modifyInput(request.input),
    };
  }

  public modifyInput(input: RequestInfo): RequestInfo {
    return new Request(input, { headers: { ...Auth.asHeader(this.#credentials) } });
  }
}
