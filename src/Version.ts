/**
 * Version information for the Go2 web app.
 */
export const MJSWAN_VERSION = __APP_VERSION__;

// Declare the global constant injected by vite
declare const __APP_VERSION__: string;

// Upstream mjswan contributors retained for attribution.
export interface Contributor {
  login: string;
  html_url: string;
}

export const GITHUB_CONTRIBUTORS: Contributor[] = [
  {
    login: "ttktjmt",
    html_url: "https://github.com/ttktjmt",
  },
  {
    login: "claude",
    html_url: "https://github.com/claude",
  },
  {
    login: "julien-blanchon",
    html_url: "https://github.com/julien-blanchon",
  },
  {
    login: "unmoyai",
    html_url: "https://github.com/unmoyai",
  },
  {
    login: "brentyi",
    html_url: "https://github.com/brentyi",
  },
  {
    login: "Axellwppr",
    html_url: "https://github.com/Axellwppr",
  },
  {
    login: "CharlieLeee",
    html_url: "https://github.com/CharlieLeee",
  },
];
