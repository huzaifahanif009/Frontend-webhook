export interface RuntimeConfig {
  apiBaseUrl: string;
  apiKey: string;
  loginPassword: string;
  /** Shows the Re-sync menu item / screen when true. Defaults to false (hidden) — the
   * functionality still works and is reachable at /resync directly either way. */
  showResyncScreen: boolean;
  /** Separate from loginPassword — required to open the Re-sync screen and the Devices
   * "Recover missed attendance" action. Deliberately its own value so the everyday login
   * password isn't also the gate on these more sensitive, harder-to-reverse actions. */
  actionPassword: string;
}
