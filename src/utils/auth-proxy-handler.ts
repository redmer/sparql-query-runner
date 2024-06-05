import type { IProxyHandler, IRequest } from "@comunica/types";
import type { ICredentialData } from "../config/types.js";
import * as Auth from "./auth.js";
import { Bye } from "./report.js";

interface Store {
  [origin: string]: {
    credentials: ICredentialData;
    additionalHeaders: Record<string, string>;
  };
}

/**
 * Comunica only supports Basic auth by default, this helper provides middleware
 * that enables bearer tokens, too. It modifies every Comunica request with the
 * passed-through credentials.
 *
 * This handler also adds per-origin credentials and not just a single per origin.
 */
export class AuthProxyHandler implements IProxyHandler {
  store: Store;

  constructor(
    credentials?: ICredentialData,
    forURL?: string,
    additionalHeaders?: Record<string, string>
  ) {
    this.store = {};

    if (credentials) this.add(credentials, forURL, additionalHeaders);
  }

  /**
   * Add supplied credentials to all requests.
   *
   * @param credentials The credentials to be passed through. Note that an
   * {@link ICredentialData} is passed, so that future auth types may be supported.
   * Such types would be implemented in {@link Auth.asHeader}.
   */
  public add(handler: AuthProxyHandler): void;
  public add(
    credentials: ICredentialData,
    forURL: string,
    additionalHeaders?: Record<string, string>
  ): void;
  public add(
    cred_hand: ICredentialData | AuthProxyHandler,
    forURL?: string,
    additionalHeaders?: Record<string, string>
  ) {
    if (cred_hand instanceof AuthProxyHandler) {
      for (const [origin, { credentials, additionalHeaders }] of Object.entries(cred_hand.store))
        this.add(credentials, origin, additionalHeaders);
      return; // cred_hand is heraafter ICredentialData
    }
    const origin = forURL ?? "";

    const current = this.store[origin];
    if (!current) this.store[origin] = { credentials: cred_hand, additionalHeaders };
    if (this.store[origin].credentials !== cred_hand)
      Bye(`Multiple credentials registered for ${origin}. 
This is unsupported: the httpProxyHandler can't handle multiple credentials
per external source/target.`);
  }

  bestKey(requestURL: string): string {
    // First, find if the requested URL is literally used as key
    const literally = this.store[requestURL];
    if (literally) return requestURL;

    // If a key is a prefix of the requested URL
    const startsWith = Object.keys(this.store).filter((k) => requestURL.startsWith(k));
    if (startsWith.length == 1) return startsWith[0];

    // If we have agreeing origins
    const origins = Object.keys(this.store)
      .map((k) => [k, new URL(k)] as [string, URL])
      .filter(([_k, url]) => new URL(requestURL).origin == url.origin);
    if (origins.length == 1) return origins[0][0];

    // No keys in common, no substrings in common, no origins in common...
    return undefined;
  }

  /** Comunica API */
  public async getProxy(request: IRequest): Promise<IRequest> {
    const req = new Request(request.input);
    const value = this.store[this.bestKey(req.url)];

    return {
      init: {
        ...request.init,
        headers: {
          ...request?.init?.headers,
          ...value?.additionalHeaders,
          ...Auth.asHeader(value?.credentials),
        },
      },
      input: request.input,
    };
  }
}
