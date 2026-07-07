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

/** Frontmost app + window title. Title may be "" without Accessibility permission. */
export async function frontmost(): Promise<Foreground> {
  try {
    const { stdout } = await run("osascript", ["-e", FRONTMOST_SCRIPT], { timeout: 10_000 });
    const [app = "unknown", ...rest] = stdout.trimEnd().split("\n");
    return { app: app.trim(), title: rest.join(" ").trim() };
  } catch {
    return { app: "unknown", title: "" };
  }
}

/**
 * Capture the main display to `outPath` (PNG, no sound, no cursor).
 * Note: real window contents require the terminal to have the macOS
 * Screen Recording permission — without it you mostly get the wallpaper.
 */
export async function captureScreen(outPath: string): Promise<void> {
  await run("screencapture", ["-x", "-C", "-m", "-t", "png", outPath], { timeout: 15_000 });
}
