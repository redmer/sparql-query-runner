declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PORT?: string;
      DEBUG?: string;

      LACES_ENDPOINT_URI?: string;
      LACES_APP_ID?: string;
      LACES_APP_PWD?: string;

      /** Treat WARNING level messages as Errors and throw instead. */
      TREAT_WARNINGS_AS_ERRORS?: string;
    }
  }
}

export {};
