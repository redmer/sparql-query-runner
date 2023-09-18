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
  keychain: Record<string, ICredentialData>;

  constructor(credentials?: ICredentialData, forURL?: string) {
    this.keychain = {};
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
      this.keychain = Object.assign(this.keychain, credentialsOrHandler.keychain);
    else
      try {
        const url = new URL(forURL);
        this.keychain[url.origin] = credentialsOrHandler;
      } catch (err) {
        this.keychain[""] = credentialsOrHandler;
      }
  }

  /** Comunica API */
  public async getProxy(request: IRequest): Promise<IRequest> {
    const req = new Request(request.input);
    const origin = new URL(req.url).origin;

    return {
      init: {
        ...request.init,
        headers: Auth.asHeader(this.keychain[origin] ?? this.keychain[""]),
      },
      input: request.input,
    };
  }
}
