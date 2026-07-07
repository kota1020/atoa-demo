import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface Foreground {
  app: string;
  title: string;
}

/**
 * Apps and window titles we refuse to even capture. Better to miss signal
 * than to ever OCR a vault or a private browsing window.
 */
const BLOCKED_APPS = new Set([
  "1Password", "1Password 7", "Bitwarden", "LastPass", "KeePassXC",
  "Keychain Access", "Passwords", "キーチェーンアクセス", "パスワード",
]);

const BLOCKED_TITLE = /incognito|private browsing|プライベート|シークレット|password|パスワード|秘密鍵|recovery phrase/i;

export function isBlocked(fg: Foreground): boolean {
  return BLOCKED_APPS.has(fg.app) || BLOCKED_TITLE.test(fg.title);
}

const FRONTMOST_SCRIPT = `
tell application "System Events"
  set p to first application process whose frontmost is true
  set appName to name of p
  set winTitle to ""
  try
    set winTitle to name of front window of p
  end try
end tell
return appName & linefeed & winTitle`;

/** Browsers that hide AXTitle but answer the Chromium AppleScript dictionary (Dia does this). */
const CHROMIUM_BROWSERS = new Set([
  "Dia", "Google Chrome", "Chromium", "Arc", "Brave Browser", "Microsoft Edge", "Vivaldi", "Opera",
]);

async function browserTabTitle(app: string): Promise<string> {
  const expr = app === "Safari"
    ? `tell application "Safari" to get name of front document`
    : `tell application "${app}" to get title of active tab of front window`;
  try {
    const { stdout } = await run("osascript", ["-e", expr], { timeout: 10_000 });
    return stdout.trim();
  } catch {
    return "";
  }
}

/** Frontmost app + window title. Title may be "" without Accessibility permission. */
export async function frontmost(): Promise<Foreground> {
  let app = "unknown";
  let title = "";
  try {
    const { stdout } = await run("osascript", ["-e", FRONTMOST_SCRIPT], { timeout: 10_000 });
    const [first = "unknown", ...rest] = stdout.trimEnd().split("\n");
    app = first.trim();
    title = rest.join(" ").trim();
  } catch {
    return { app, title };
  }
  if (!title && (CHROMIUM_BROWSERS.has(app) || app === "Safari")) {
    title = await browserTabTitle(app);
  }
  return { app, title };
}

/**
 * Capture the main display to `outPath` (PNG, no sound, no cursor).
 * Note: real window contents require the terminal to have the macOS
 * Screen Recording permission — without it you mostly get the wallpaper.
 */
export async function captureScreen(outPath: string): Promise<void> {
  await run("screencapture", ["-x", "-C", "-m", "-t", "png", outPath], { timeout: 15_000 });
}
