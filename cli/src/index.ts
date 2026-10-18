
import "dotenv/config";
import { createClient, type Session } from "@supabase/supabase-js";
import keytar from "keytar";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const API_URL = (
  process.env.DORA_FAST_API_URL ?? "https://dora-fast.vercel.app"
).replace(/\/+$/, "");

const SUPABASE_URL = process.env.DORA_FAST_SUPABASE_URL;
const SUPABASE_KEY = process.env.DORA_FAST_SUPABASE_PUBLISHABLE_KEY;

const SERVICE = "dora-fast-cli";
const ACCOUNT = "supabase-session";

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Missing DORA_FAST_SUPABASE_URL or DORA_FAST_SUPABASE_PUBLISHABLE_KEY in cli/.env."
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function askPassword(): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Login requires an interactive terminal.");
  }

  stdout.write("Password: ");

  return new Promise((resolve, reject) => {
    let password = "";

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const onData = (buffer: Buffer) => {
      for (const byte of buffer) {
        if (byte === 3) {
          cleanup();
          stdout.write("\n");
          reject(new Error("Login cancelled."));
          return;
        }

        if (byte === 13 || byte === 10) {
          cleanup();
          stdout.write("\n");
          resolve(password);
          return;
        }

        if (byte === 8 || byte === 127) {
          password = password.slice(0, -1);
          continue;
        }

        if (byte >= 32 && byte <= 126) {
          password += String.fromCharCode(byte);
        }
      }
    };

    stdin.resume();
    stdin.setRawMode(true);
    stdin.on("data", onData);
  });
}

async function saveSession(session: Session) {
  await keytar.setPassword(
    SERVICE,
    ACCOUNT,
    JSON.stringify(session)
  );
}

async function readSession(): Promise<Session | null> {
  const saved = await keytar.getPassword(SERVICE, ACCOUNT);

  if (!saved) return null;

  try {
    return JSON.parse(saved) as Session;
  } catch {
    await keytar.deletePassword(SERVICE, ACCOUNT);
    return null;
  }
}

async function login() {
  const supabase = getSupabase();
  const email = await ask("Email: ");
  const password = await askPassword();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(error?.message ?? "Login failed.");
  }

  try {
    await saveSession(data.session);
  } catch {
    await supabase.auth.signOut();
    throw new Error(
      "Could not save the session in the OS credential store. No session was saved."
    );
  }

  console.log(`Logged in as ${data.user.email ?? email}.`);
  console.log("Session saved in the OS credential store.");
}

async function logout() {
  await keytar.deletePassword(SERVICE, ACCOUNT);
  console.log("Local CLI session removed.");
}

async function getAccessToken(): Promise<string> {
  const session = await readSession();

  if (!session) {
    throw new Error("Not logged in. Run: dora-fast login");
  }

  const supabase = getSupabase();

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: session.refresh_token,
  });

  if (error || !data.session) {
    await keytar.deletePassword(SERVICE, ACCOUNT);
    throw new Error("Session expired. Please run: dora-fast login");
  }

  await saveSession(data.session);
  return data.session.access_token;
}

async function listFiles() {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/api/files`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as {
    error?: string;
    files?: Array<{
      id: string;
      filename: string;
      size: number;
      status: string;
      createdAt: string;
    }>;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  const files = body.files ?? [];

  if (files.length === 0) {
    console.log("No files found.");
    return;
  }

  console.table(
    files.map((file) => ({
      ID: file.id,
      Filename: file.filename,
      Size: `${(file.size / (1024 * 1024)).toFixed(2)} MiB`,
      Status: file.status,
      Created: file.createdAt,
    }))
  );
}

async function main() {
  switch (process.argv[2]) {
    case "login":
      await login();
      break;

    case "logout":
      await logout();
      break;

    case "list":
      await listFiles();
      break;

    case "--help":
    case "-h":
    case undefined:
      console.log(`
Dora-Fast CLI

Usage:
  dora-fast login
  dora-fast logout
  dora-fast list
`);
      break;

    default:
      throw new Error(`Unknown command: ${process.argv[2]}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unexpected error.");
  process.exitCode = 1;
});
