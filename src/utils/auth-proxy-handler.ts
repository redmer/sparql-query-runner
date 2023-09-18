import type { IProxyHandler, IRequest } from "@comunica/types";
import type { ICredentialData } from "../config/types.js";
import * as Auth from "./auth.js";

/**
 * Comunica only supports Basic auth by default, this helper provides middleware
 * that enables bearer tokens, too. It modifies every Comunica request with the
 * passed-through credentials.
 *
 * This handler also adds per-origin credentials and not just a single per origin.
 */
export class AuthProxyHandler implements IProxyHandler {
  credentials: Record<string, ICredentialData> = {};

  constructor(credentials?: ICredentialData, forURL?: string) {
    this.credentials = {};
    if (credentials) this.add(credentials, forURL);
  }

  /**
   * Add supplied credentials to all requests.
   *
   * @param credentials The credentials to be passed through. Note that an
   * {@link ICredentialData} is passed, so that future auth types may be supported.
   * Such types would be implemented in {@link Auth.asHeader}.
   */
  public add(handler: AuthProxyHandler): void;
  public add(credentials: ICredentialData, forURL?: string): void;
  public add(credentialsOrHandler: ICredentialData | AuthProxyHandler, forURL?: string) {
    if (credentialsOrHandler instanceof AuthProxyHandler)
      this.credentials = Object.assign(this.credentials, credentialsOrHandler.credentials);
    else
      try {
        const url = new URL(forURL);
        this.credentials[url.origin] = credentialsOrHandler;
      } catch (err) {
        this.credentials[""] = credentialsOrHandler;
      }
  }

  /** Comunica API */
  public async getProxy(request: IRequest): Promise<IRequest> {
    return {
      init: request.init,
      input: this.modifyInput(request.input),
    };
  }

  /** Comunica API */
  public modifyInput(input: RequestInfo | string): RequestInfo {
    const request = new Request(input);
    const origin = new URL(request.url).origin;
    return new Request(input, {
      headers: { ...Auth.asHeader(this.credentials[origin] ?? this.credentials[""]) },
    });
  }
}
