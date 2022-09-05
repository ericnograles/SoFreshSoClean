import { gte, join, parse, resolve } from "./src/dev/deps.ts";
import { error } from "./src/dev/error.ts";
import { collect, generate } from "./src/dev/mod.ts";
const MIN_VERSION = "1.23.0";
// Check that the minimum supported Deno version is being used.
if (!gte(Deno.version.deno, MIN_VERSION)) {
    let message = `Deno version ${MIN_VERSION} or higher is required. Please update Deno.\n\n`;
    if (Deno.execPath().includes("homebrew")) {
        message += "You seem to have installed Deno via homebrew. To update, run: `brew upgrade deno`\n";
    } else {
        message += "To update, run: `deno upgrade`\n";
    }
    error(message);
}
const help = `fresh-init

Initialize a new Fresh project. This will create all the necessary files for a
new project.

To generate a project in the './foobar' subdirectory:
  fresh-init ./foobar

To generate a project in the current directory:
  fresh-init .

USAGE:
    fresh-init <DIRECTORY>

OPTIONS:
    --force   Overwrite existing files
    --twind   Setup project to use 'twind' for styling
    --vscode  Setup project for VSCode
`;
const CONFIRM_EMPTY_MESSAGE = "The target directory is not empty (files could get overwritten). Do you want to continue anyway?";
const USE_TWIND_MESSAGE = "Do you want to use 'twind' (https://twind.dev/) for styling?";
const USE_VSCODE_MESSAGE = "Do you use VS Code?";
const flags = parse(Deno.args, {
    boolean: [
        "force",
        "twind",
        "vscode"
    ],
    default: {
        "force": null,
        "twind": null,
        "vscode": null
    }
});
if (flags._.length !== 1) {
    error(help);
}
const unresolvedDirectory = Deno.args[0];
const resolvedDirectory = resolve(unresolvedDirectory);
try {
    const dir = [
        ...Deno.readDirSync(resolvedDirectory)
    ];
    const isEmpty = dir.length === 0 || dir.length === 1 && dir[0].name === ".git";
    if (!isEmpty && !(flags.force === null ? confirm(CONFIRM_EMPTY_MESSAGE) : flags.force)) {
        error("Directory is not empty.");
    }
} catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
        throw err;
    }
}
const useTwind = flags.twind === null ? confirm(USE_TWIND_MESSAGE) : flags.twind;
const useVSCode = flags.vscode === null ? confirm(USE_VSCODE_MESSAGE) : flags.vscode;
await Deno.mkdir(join(resolvedDirectory, "routes", "api"), {
    recursive: true
});
await Deno.mkdir(join(resolvedDirectory, "islands"), {
    recursive: true
});
await Deno.mkdir(join(resolvedDirectory, "static"), {
    recursive: true
});
await Deno.mkdir(join(resolvedDirectory, "components"), {
    recursive: true
});
if (useVSCode) {
    await Deno.mkdir(join(resolvedDirectory, ".vscode"), {
        recursive: true
    });
}
if (useTwind) {
    await Deno.mkdir(join(resolvedDirectory, "utils"), {
        recursive: true
    });
}
const importMap = {
    "imports": {
        "$fresh/": new URL("./", import.meta.url).href,
        "preact": "https://esm.sh/preact@10.10.0",
        "preact/": "https://esm.sh/preact@10.10.0/",
        "preact-render-to-string": "https://esm.sh/preact-render-to-string@5.2.1?external=preact"
    }
};
if (useTwind) {
    importMap.imports["@twind"] = "./utils/twind.ts";
    importMap.imports["twind"] = "https://esm.sh/twind@0.16.17";
    importMap.imports["twind/"] = "https://esm.sh/twind@0.16.17/";
}
const IMPORT_MAP_JSON = JSON.stringify(importMap, null, 2) + "\n";
await Deno.writeTextFile(join(resolvedDirectory, "import_map.json"), IMPORT_MAP_JSON);
let ROUTES_INDEX_TSX = `/** @jsx h */
import { h } from "preact";\n`;
if (useTwind) ROUTES_INDEX_TSX += `import { tw } from "@twind";\n`;
ROUTES_INDEX_TSX += `import Counter from "../islands/Counter.tsx";

export default function Home() {
  return (
    <div${useTwind ? " class={tw\`p-4 mx-auto max-w-screen-md\`}" : ""}>
      <img
        src="/logo.svg"
        height="100px"
        alt="the fresh logo: a sliced lemon dripping with juice"
      />
      <p${useTwind ? " class={tw\`my-6\`}" : ""}>
        Welcome to \`fresh\`. Try updating this message in the ./routes/index.tsx
        file, and refresh.
      </p>
      <Counter start={3} />
    </div>
  );
}
`;
await Deno.writeTextFile(join(resolvedDirectory, "routes", "index.tsx"), ROUTES_INDEX_TSX);
const COMPONENTS_BUTTON_TSX = `/** @jsx h */
import { h } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";
${useTwind ? 'import { tw } from "@twind";\n' : ""}
export function Button(props: h.JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={!IS_BROWSER || props.disabled}
    ${useTwind ? "  class={tw\`px-2 py-1 border(gray-100 2) hover:bg-gray-200\`}\n    " : ""}/>
  );
}
`;
await Deno.writeTextFile(join(resolvedDirectory, "components", "Button.tsx"), COMPONENTS_BUTTON_TSX);
const ISLANDS_COUNTER_TSX = `/** @jsx h */
import { h } from "preact";
import { useState } from "preact/hooks";
${useTwind ? 'import { tw } from "@twind";\n' : ""}
import { Button } from "../components/Button.tsx";

interface CounterProps {
  start: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.start);
  return (
    <div${useTwind ? " class={tw\`flex gap-2 w-full\`}" : ""}>
      <p${useTwind ? " class={tw\`flex-grow-1 font-bold text-xl\`}" : ""}>{count}</p>
      <Button onClick={() => setCount(count - 1)}>-1</Button>
      <Button onClick={() => setCount(count + 1)}>+1</Button>
    </div>
  );
}
`;
await Deno.writeTextFile(join(resolvedDirectory, "islands", "Counter.tsx"), ISLANDS_COUNTER_TSX);
const ROUTES_GREET_TSX = `/** @jsx h */
import { h } from "preact";
import { PageProps } from "$fresh/server.ts";

export default function Greet(props: PageProps) {
  return <div>Hello {props.params.name}</div>;
}
`;
await Deno.writeTextFile(join(resolvedDirectory, "routes", "[name].tsx"), ROUTES_GREET_TSX);
const ROUTES_API_JOKE_TS = `import { HandlerContext } from "$fresh/server.ts";

// Jokes courtesy of https://punsandoneliners.com/randomness/programmer-jokes/
const JOKES = [
  "Why do Java developers often wear glasses? They can't C#.",
  "A SQL query walks into a bar, goes up to two tables and says “can I join you?”",
  "Wasn't hard to crack Forrest Gump's password. 1forrest1.",
  "I love pressing the F5 key. It's refreshing.",
  "Called IT support and a chap from Australia came to fix my network connection.  I asked “Do you come from a LAN down under?”",
  "There are 10 types of people in the world. Those who understand binary and those who don't.",
  "Why are assembly programmers often wet? They work below C level.",
  "My favourite computer based band is the Black IPs.",
  "What programme do you use to predict the music tastes of former US presidential candidates? An Al Gore Rhythm.",
  "An SEO expert walked into a bar, pub, inn, tavern, hostelry, public house.",
];

export const handler = (_req: Request, _ctx: HandlerContext): Response => {
  const randomIndex = Math.floor(Math.random() * JOKES.length);
  const body = JOKES[randomIndex];
  return new Response(body);
};
`;
await Deno.writeTextFile(join(resolvedDirectory, "routes", "api", "joke.ts"), ROUTES_API_JOKE_TS);
const UTILS_TWIND_TS = `import { IS_BROWSER } from "$fresh/runtime.ts";
import { Configuration, setup } from "twind";
export * from "twind";
export const config: Configuration = {
  darkMode: "class",
  mode: "silent",
};
if (IS_BROWSER) setup(config);
`;
if (useTwind) {
    await Deno.writeTextFile(join(resolvedDirectory, "utils", "twind.ts"), UTILS_TWIND_TS);
}
const STATIC_LOGO = `<svg width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M34.092 8.845C38.929 20.652 34.092 27 30 30.5c1 3.5-2.986 4.222-4.5 2.5-4.457 1.537-13.512 1.487-20-5C2 24.5 4.73 16.714 14 11.5c8-4.5 16-7 20.092-2.655Z" fill="#FFDB1E"/>
  <path d="M14 11.5c6.848-4.497 15.025-6.38 18.368-3.47C37.5 12.5 21.5 22.612 15.5 25c-6.5 2.587-3 8.5-6.5 8.5-3 0-2.5-4-5.183-7.75C2.232 23.535 6.16 16.648 14 11.5Z" fill="#fff" stroke="#FFDB1E"/>
  <path d="M28.535 8.772c4.645 1.25-.365 5.695-4.303 8.536-3.732 2.692-6.606 4.21-7.923 4.83-.366.173-1.617-2.252-1.617-1 0 .417-.7 2.238-.934 2.326-1.365.512-4.223 1.29-5.835 1.29-3.491 0-1.923-4.754 3.014-9.122.892-.789 1.478-.645 2.283-.645-.537-.773-.534-.917.403-1.546C17.79 10.64 23 8.77 25.212 8.42c.366.014.82.35.82.629.41-.14 2.095-.388 2.503-.278Z" fill="#FFE600"/>
  <path d="M14.297 16.49c.985-.747 1.644-1.01 2.099-2.526.566.121.841-.08 1.29-.701.324.466 1.657.608 2.453.701-.715.451-1.057.852-1.452 2.106-1.464-.611-3.167-.302-4.39.42Z" fill="#fff"/>
</svg>`;
await Deno.writeTextFile(join(resolvedDirectory, "static", "logo.svg"), STATIC_LOGO);
try {
    const faviconArrayBuffer = await fetch("https://fresh.deno.dev/favicon.ico").then((d)=>d.arrayBuffer());
    await Deno.writeFile(join(resolvedDirectory, "static", "favicon.ico"), new Uint8Array(faviconArrayBuffer));
} catch  {
// Skip this and be silent if there is a nework issue.
}
let MAIN_TS = `/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />

import { ${useTwind ? "InnerRenderFunction, RenderContext, " : ""}start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
`;
if (useTwind) {
    MAIN_TS += `
import { config, setup } from "@twind";
import { virtualSheet } from "twind/sheets";

const sheet = virtualSheet();
sheet.reset();
setup({ ...config, sheet });

function render(ctx: RenderContext, render: InnerRenderFunction) {
  const snapshot = ctx.state.get("twind") as unknown[] | null;
  sheet.reset(snapshot || undefined);
  render();
  ctx.styles.splice(0, ctx.styles.length, ...(sheet).target);
  const newSnapshot = sheet.reset();
  ctx.state.set("twind", newSnapshot);
}

`;
}
MAIN_TS += `await start(manifest${useTwind ? ", { render }" : ""});\n`;
const MAIN_TS_PATH = join(resolvedDirectory, "main.ts");
await Deno.writeTextFile(MAIN_TS_PATH, MAIN_TS);
const DEV_TS = `#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";

await dev(import.meta.url, "./main.ts");
`;
const DEV_TS_PATH = join(resolvedDirectory, "dev.ts");
await Deno.writeTextFile(DEV_TS_PATH, DEV_TS);
try {
    await Deno.chmod(DEV_TS_PATH, 0o777);
} catch  {
// this throws on windows
}
const config = {
    tasks: {
        start: "deno run -A --watch=static/,routes/ dev.ts"
    },
    importMap: "./import_map.json"
};
const DENO_CONFIG = JSON.stringify(config, null, 2) + "\n";
await Deno.writeTextFile(join(resolvedDirectory, "deno.json"), DENO_CONFIG);
const README_MD = `# fresh project

### Usage

Start the project:

\`\`\`
deno task start
\`\`\`

This will watch the project directory and restart as necessary.
`;
await Deno.writeTextFile(join(resolvedDirectory, "README.md"), README_MD);
const vscodeSettings = {
    "deno.enable": true,
    "deno.lint": true,
    "editor.defaultFormatter": "denoland.vscode-deno"
};
const VSCODE_SETTINGS = JSON.stringify(vscodeSettings, null, 2) + "\n";
if (useVSCode) {
    await Deno.writeTextFile(join(resolvedDirectory, ".vscode", "settings.json"), VSCODE_SETTINGS);
}
const vscodeExtensions = {
    recommendations: [
        "denoland.vscode-deno"
    ]
};
const VSCODE_EXTENSIONS = JSON.stringify(vscodeExtensions, null, 2) + "\n";
if (useVSCode) {
    await Deno.writeTextFile(join(resolvedDirectory, ".vscode", "extensions.json"), VSCODE_EXTENSIONS);
}
const manifest = await collect(resolvedDirectory);
await generate(resolvedDirectory, manifest);
// Specifically print unresolvedDirectory, rather than resolvedDirectory in order to
// not leak personal info (e.g. `/Users/MyName`)
console.log("\n%cProject created!", "color: green; font-weight: bold");
console.log(`\nIn order to start the development server, run:\n`);
console.log(`$ cd ${unresolvedDirectory}`);
console.log("$ deno task start");
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4wLjIvaW5pdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBndGUsIGpvaW4sIHBhcnNlLCByZXNvbHZlIH0gZnJvbSBcIi4vc3JjL2Rldi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBlcnJvciB9IGZyb20gXCIuL3NyYy9kZXYvZXJyb3IudHNcIjtcbmltcG9ydCB7IGNvbGxlY3QsIGdlbmVyYXRlIH0gZnJvbSBcIi4vc3JjL2Rldi9tb2QudHNcIjtcblxuY29uc3QgTUlOX1ZFUlNJT04gPSBcIjEuMjMuMFwiO1xuXG4vLyBDaGVjayB0aGF0IHRoZSBtaW5pbXVtIHN1cHBvcnRlZCBEZW5vIHZlcnNpb24gaXMgYmVpbmcgdXNlZC5cbmlmICghZ3RlKERlbm8udmVyc2lvbi5kZW5vLCBNSU5fVkVSU0lPTikpIHtcbiAgbGV0IG1lc3NhZ2UgPVxuICAgIGBEZW5vIHZlcnNpb24gJHtNSU5fVkVSU0lPTn0gb3IgaGlnaGVyIGlzIHJlcXVpcmVkLiBQbGVhc2UgdXBkYXRlIERlbm8uXFxuXFxuYDtcblxuICBpZiAoRGVuby5leGVjUGF0aCgpLmluY2x1ZGVzKFwiaG9tZWJyZXdcIikpIHtcbiAgICBtZXNzYWdlICs9XG4gICAgICBcIllvdSBzZWVtIHRvIGhhdmUgaW5zdGFsbGVkIERlbm8gdmlhIGhvbWVicmV3LiBUbyB1cGRhdGUsIHJ1bjogYGJyZXcgdXBncmFkZSBkZW5vYFxcblwiO1xuICB9IGVsc2Uge1xuICAgIG1lc3NhZ2UgKz0gXCJUbyB1cGRhdGUsIHJ1bjogYGRlbm8gdXBncmFkZWBcXG5cIjtcbiAgfVxuXG4gIGVycm9yKG1lc3NhZ2UpO1xufVxuXG5jb25zdCBoZWxwID0gYGZyZXNoLWluaXRcblxuSW5pdGlhbGl6ZSBhIG5ldyBGcmVzaCBwcm9qZWN0LiBUaGlzIHdpbGwgY3JlYXRlIGFsbCB0aGUgbmVjZXNzYXJ5IGZpbGVzIGZvciBhXG5uZXcgcHJvamVjdC5cblxuVG8gZ2VuZXJhdGUgYSBwcm9qZWN0IGluIHRoZSAnLi9mb29iYXInIHN1YmRpcmVjdG9yeTpcbiAgZnJlc2gtaW5pdCAuL2Zvb2JhclxuXG5UbyBnZW5lcmF0ZSBhIHByb2plY3QgaW4gdGhlIGN1cnJlbnQgZGlyZWN0b3J5OlxuICBmcmVzaC1pbml0IC5cblxuVVNBR0U6XG4gICAgZnJlc2gtaW5pdCA8RElSRUNUT1JZPlxuXG5PUFRJT05TOlxuICAgIC0tZm9yY2UgICBPdmVyd3JpdGUgZXhpc3RpbmcgZmlsZXNcbiAgICAtLXR3aW5kICAgU2V0dXAgcHJvamVjdCB0byB1c2UgJ3R3aW5kJyBmb3Igc3R5bGluZ1xuICAgIC0tdnNjb2RlICBTZXR1cCBwcm9qZWN0IGZvciBWU0NvZGVcbmA7XG5cbmNvbnN0IENPTkZJUk1fRU1QVFlfTUVTU0FHRSA9XG4gIFwiVGhlIHRhcmdldCBkaXJlY3RvcnkgaXMgbm90IGVtcHR5IChmaWxlcyBjb3VsZCBnZXQgb3ZlcndyaXR0ZW4pLiBEbyB5b3Ugd2FudCB0byBjb250aW51ZSBhbnl3YXk/XCI7XG5cbmNvbnN0IFVTRV9UV0lORF9NRVNTQUdFID1cbiAgXCJEbyB5b3Ugd2FudCB0byB1c2UgJ3R3aW5kJyAoaHR0cHM6Ly90d2luZC5kZXYvKSBmb3Igc3R5bGluZz9cIjtcblxuY29uc3QgVVNFX1ZTQ09ERV9NRVNTQUdFID0gXCJEbyB5b3UgdXNlIFZTIENvZGU/XCI7XG5cbmNvbnN0IGZsYWdzID0gcGFyc2UoRGVuby5hcmdzLCB7XG4gIGJvb2xlYW46IFtcImZvcmNlXCIsIFwidHdpbmRcIiwgXCJ2c2NvZGVcIl0sXG4gIGRlZmF1bHQ6IHsgXCJmb3JjZVwiOiBudWxsLCBcInR3aW5kXCI6IG51bGwsIFwidnNjb2RlXCI6IG51bGwgfSxcbn0pO1xuXG5pZiAoZmxhZ3MuXy5sZW5ndGggIT09IDEpIHtcbiAgZXJyb3IoaGVscCk7XG59XG5cbmNvbnN0IHVucmVzb2x2ZWREaXJlY3RvcnkgPSBEZW5vLmFyZ3NbMF07XG5jb25zdCByZXNvbHZlZERpcmVjdG9yeSA9IHJlc29sdmUodW5yZXNvbHZlZERpcmVjdG9yeSk7XG5cbnRyeSB7XG4gIGNvbnN0IGRpciA9IFsuLi5EZW5vLnJlYWREaXJTeW5jKHJlc29sdmVkRGlyZWN0b3J5KV07XG4gIGNvbnN0IGlzRW1wdHkgPSBkaXIubGVuZ3RoID09PSAwIHx8XG4gICAgZGlyLmxlbmd0aCA9PT0gMSAmJiBkaXJbMF0ubmFtZSA9PT0gXCIuZ2l0XCI7XG4gIGlmIChcbiAgICAhaXNFbXB0eSAmJlxuICAgICEoZmxhZ3MuZm9yY2UgPT09IG51bGwgPyBjb25maXJtKENPTkZJUk1fRU1QVFlfTUVTU0FHRSkgOiBmbGFncy5mb3JjZSlcbiAgKSB7XG4gICAgZXJyb3IoXCJEaXJlY3RvcnkgaXMgbm90IGVtcHR5LlwiKTtcbiAgfVxufSBjYXRjaCAoZXJyKSB7XG4gIGlmICghKGVyciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSkge1xuICAgIHRocm93IGVycjtcbiAgfVxufVxuXG5jb25zdCB1c2VUd2luZCA9IGZsYWdzLnR3aW5kID09PSBudWxsXG4gID8gY29uZmlybShVU0VfVFdJTkRfTUVTU0FHRSlcbiAgOiBmbGFncy50d2luZDtcblxuY29uc3QgdXNlVlNDb2RlID0gZmxhZ3MudnNjb2RlID09PSBudWxsXG4gID8gY29uZmlybShVU0VfVlNDT0RFX01FU1NBR0UpXG4gIDogZmxhZ3MudnNjb2RlO1xuXG5hd2FpdCBEZW5vLm1rZGlyKGpvaW4ocmVzb2x2ZWREaXJlY3RvcnksIFwicm91dGVzXCIsIFwiYXBpXCIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbmF3YWl0IERlbm8ubWtkaXIoam9pbihyZXNvbHZlZERpcmVjdG9yeSwgXCJpc2xhbmRzXCIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbmF3YWl0IERlbm8ubWtkaXIoam9pbihyZXNvbHZlZERpcmVjdG9yeSwgXCJzdGF0aWNcIiksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuYXdhaXQgRGVuby5ta2Rpcihqb2luKHJlc29sdmVkRGlyZWN0b3J5LCBcImNvbXBvbmVudHNcIiksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuaWYgKHVzZVZTQ29kZSkge1xuICBhd2FpdCBEZW5vLm1rZGlyKGpvaW4ocmVzb2x2ZWREaXJlY3RvcnksIFwiLnZzY29kZVwiKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG59XG5pZiAodXNlVHdpbmQpIHtcbiAgYXdhaXQgRGVuby5ta2Rpcihqb2luKHJlc29sdmVkRGlyZWN0b3J5LCBcInV0aWxzXCIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbn1cblxuY29uc3QgaW1wb3J0TWFwID0ge1xuICBcImltcG9ydHNcIjoge1xuICAgIFwiJGZyZXNoL1wiOiBuZXcgVVJMKFwiLi9cIiwgaW1wb3J0Lm1ldGEudXJsKS5ocmVmLFxuICAgIFwicHJlYWN0XCI6IFwiaHR0cHM6Ly9lc20uc2gvcHJlYWN0QDEwLjEwLjBcIixcbiAgICBcInByZWFjdC9cIjogXCJodHRwczovL2VzbS5zaC9wcmVhY3RAMTAuMTAuMC9cIixcbiAgICBcInByZWFjdC1yZW5kZXItdG8tc3RyaW5nXCI6XG4gICAgICBcImh0dHBzOi8vZXNtLnNoL3ByZWFjdC1yZW5kZXItdG8tc3RyaW5nQDUuMi4xP2V4dGVybmFsPXByZWFjdFwiLFxuICB9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG59O1xuaWYgKHVzZVR3aW5kKSB7XG4gIGltcG9ydE1hcC5pbXBvcnRzW1wiQHR3aW5kXCJdID0gXCIuL3V0aWxzL3R3aW5kLnRzXCI7XG4gIGltcG9ydE1hcC5pbXBvcnRzW1widHdpbmRcIl0gPSBcImh0dHBzOi8vZXNtLnNoL3R3aW5kQDAuMTYuMTdcIjtcbiAgaW1wb3J0TWFwLmltcG9ydHNbXCJ0d2luZC9cIl0gPSBcImh0dHBzOi8vZXNtLnNoL3R3aW5kQDAuMTYuMTcvXCI7XG59XG5jb25zdCBJTVBPUlRfTUFQX0pTT04gPSBKU09OLnN0cmluZ2lmeShpbXBvcnRNYXAsIG51bGwsIDIpICsgXCJcXG5cIjtcbmF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgam9pbihyZXNvbHZlZERpcmVjdG9yeSwgXCJpbXBvcnRfbWFwLmpzb25cIiksXG4gIElNUE9SVF9NQVBfSlNPTixcbik7XG5cbmxldCBST1VURVNfSU5ERVhfVFNYID0gYC8qKiBAanN4IGggKi9cbmltcG9ydCB7IGggfSBmcm9tIFwicHJlYWN0XCI7XFxuYDtcbmlmICh1c2VUd2luZCkgUk9VVEVTX0lOREVYX1RTWCArPSBgaW1wb3J0IHsgdHcgfSBmcm9tIFwiQHR3aW5kXCI7XFxuYDtcblJPVVRFU19JTkRFWF9UU1ggKz0gYGltcG9ydCBDb3VudGVyIGZyb20gXCIuLi9pc2xhbmRzL0NvdW50ZXIudHN4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEhvbWUoKSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiR7dXNlVHdpbmQgPyBcIiBjbGFzcz17dHdcXGBwLTQgbXgtYXV0byBtYXgtdy1zY3JlZW4tbWRcXGB9XCIgOiBcIlwifT5cbiAgICAgIDxpbWdcbiAgICAgICAgc3JjPVwiL2xvZ28uc3ZnXCJcbiAgICAgICAgaGVpZ2h0PVwiMTAwcHhcIlxuICAgICAgICBhbHQ9XCJ0aGUgZnJlc2ggbG9nbzogYSBzbGljZWQgbGVtb24gZHJpcHBpbmcgd2l0aCBqdWljZVwiXG4gICAgICAvPlxuICAgICAgPHAke3VzZVR3aW5kID8gXCIgY2xhc3M9e3R3XFxgbXktNlxcYH1cIiA6IFwiXCJ9PlxuICAgICAgICBXZWxjb21lIHRvIFxcYGZyZXNoXFxgLiBUcnkgdXBkYXRpbmcgdGhpcyBtZXNzYWdlIGluIHRoZSAuL3JvdXRlcy9pbmRleC50c3hcbiAgICAgICAgZmlsZSwgYW5kIHJlZnJlc2guXG4gICAgICA8L3A+XG4gICAgICA8Q291bnRlciBzdGFydD17M30gLz5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbmA7XG5hd2FpdCBEZW5vLndyaXRlVGV4dEZpbGUoXG4gIGpvaW4ocmVzb2x2ZWREaXJlY3RvcnksIFwicm91dGVzXCIsIFwiaW5kZXgudHN4XCIpLFxuICBST1VURVNfSU5ERVhfVFNYLFxuKTtcblxuY29uc3QgQ09NUE9ORU5UU19CVVRUT05fVFNYID0gYC8qKiBAanN4IGggKi9cbmltcG9ydCB7IGggfSBmcm9tIFwicHJlYWN0XCI7XG5pbXBvcnQgeyBJU19CUk9XU0VSIH0gZnJvbSBcIiRmcmVzaC9ydW50aW1lLnRzXCI7XG4ke3VzZVR3aW5kID8gJ2ltcG9ydCB7IHR3IH0gZnJvbSBcIkB0d2luZFwiO1xcbicgOiBcIlwifVxuZXhwb3J0IGZ1bmN0aW9uIEJ1dHRvbihwcm9wczogaC5KU1guSFRNTEF0dHJpYnV0ZXM8SFRNTEJ1dHRvbkVsZW1lbnQ+KSB7XG4gIHJldHVybiAoXG4gICAgPGJ1dHRvblxuICAgICAgey4uLnByb3BzfVxuICAgICAgZGlzYWJsZWQ9eyFJU19CUk9XU0VSIHx8IHByb3BzLmRpc2FibGVkfVxuICAgICR7XG4gIHVzZVR3aW5kXG4gICAgPyBcIiAgY2xhc3M9e3R3XFxgcHgtMiBweS0xIGJvcmRlcihncmF5LTEwMCAyKSBob3ZlcjpiZy1ncmF5LTIwMFxcYH1cXG4gICAgXCJcbiAgICA6IFwiXCJcbn0vPlxuICApO1xufVxuYDtcbmF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgam9pbihyZXNvbHZlZERpcmVjdG9yeSwgXCJjb21wb25lbnRzXCIsIFwiQnV0dG9uLnRzeFwiKSxcbiAgQ09NUE9ORU5UU19CVVRUT05fVFNYLFxuKTtcblxuY29uc3QgSVNMQU5EU19DT1VOVEVSX1RTWCA9IGAvKiogQGpzeCBoICovXG5pbXBvcnQgeyBoIH0gZnJvbSBcInByZWFjdFwiO1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tIFwicHJlYWN0L2hvb2tzXCI7XG4ke3VzZVR3aW5kID8gJ2ltcG9ydCB7IHR3IH0gZnJvbSBcIkB0d2luZFwiO1xcbicgOiBcIlwifVxuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIi4uL2NvbXBvbmVudHMvQnV0dG9uLnRzeFwiO1xuXG5pbnRlcmZhY2UgQ291bnRlclByb3BzIHtcbiAgc3RhcnQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQ291bnRlcihwcm9wczogQ291bnRlclByb3BzKSB7XG4gIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUocHJvcHMuc3RhcnQpO1xuICByZXR1cm4gKFxuICAgIDxkaXYke3VzZVR3aW5kID8gXCIgY2xhc3M9e3R3XFxgZmxleCBnYXAtMiB3LWZ1bGxcXGB9XCIgOiBcIlwifT5cbiAgICAgIDxwJHtcbiAgdXNlVHdpbmQgPyBcIiBjbGFzcz17dHdcXGBmbGV4LWdyb3ctMSBmb250LWJvbGQgdGV4dC14bFxcYH1cIiA6IFwiXCJcbn0+e2NvdW50fTwvcD5cbiAgICAgIDxCdXR0b24gb25DbGljaz17KCkgPT4gc2V0Q291bnQoY291bnQgLSAxKX0+LTE8L0J1dHRvbj5cbiAgICAgIDxCdXR0b24gb25DbGljaz17KCkgPT4gc2V0Q291bnQoY291bnQgKyAxKX0+KzE8L0J1dHRvbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbmA7XG5cbmF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgam9pbihyZXNvbHZlZERpcmVjdG9yeSwgXCJpc2xhbmRzXCIsIFwiQ291bnRlci50c3hcIiksXG4gIElTTEFORFNfQ09VTlRFUl9UU1gsXG4pO1xuXG5jb25zdCBST1VURVNfR1JFRVRfVFNYID0gYC8qKiBAanN4IGggKi9cbmltcG9ydCB7IGggfSBmcm9tIFwicHJlYWN0XCI7XG5pbXBvcnQgeyBQYWdlUHJvcHMgfSBmcm9tIFwiJGZyZXNoL3NlcnZlci50c1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBHcmVldChwcm9wczogUGFnZVByb3BzKSB7XG4gIHJldHVybiA8ZGl2PkhlbGxvIHtwcm9wcy5wYXJhbXMubmFtZX08L2Rpdj47XG59XG5gO1xuYXdhaXQgRGVuby53cml0ZVRleHRGaWxlKFxuICBqb2luKHJlc29sdmVkRGlyZWN0b3J5LCBcInJvdXRlc1wiLCBcIltuYW1lXS50c3hcIiksXG4gIFJPVVRFU19HUkVFVF9UU1gsXG4pO1xuXG5jb25zdCBST1VURVNfQVBJX0pPS0VfVFMgPSBgaW1wb3J0IHsgSGFuZGxlckNvbnRleHQgfSBmcm9tIFwiJGZyZXNoL3NlcnZlci50c1wiO1xuXG4vLyBKb2tlcyBjb3VydGVzeSBvZiBodHRwczovL3B1bnNhbmRvbmVsaW5lcnMuY29tL3JhbmRvbW5lc3MvcHJvZ3JhbW1lci1qb2tlcy9cbmNvbnN0IEpPS0VTID0gW1xuICBcIldoeSBkbyBKYXZhIGRldmVsb3BlcnMgb2Z0ZW4gd2VhciBnbGFzc2VzPyBUaGV5IGNhbid0IEMjLlwiLFxuICBcIkEgU1FMIHF1ZXJ5IHdhbGtzIGludG8gYSBiYXIsIGdvZXMgdXAgdG8gdHdvIHRhYmxlcyBhbmQgc2F5cyDigJxjYW4gSSBqb2luIHlvdT/igJ1cIixcbiAgXCJXYXNuJ3QgaGFyZCB0byBjcmFjayBGb3JyZXN0IEd1bXAncyBwYXNzd29yZC4gMWZvcnJlc3QxLlwiLFxuICBcIkkgbG92ZSBwcmVzc2luZyB0aGUgRjUga2V5LiBJdCdzIHJlZnJlc2hpbmcuXCIsXG4gIFwiQ2FsbGVkIElUIHN1cHBvcnQgYW5kIGEgY2hhcCBmcm9tIEF1c3RyYWxpYSBjYW1lIHRvIGZpeCBteSBuZXR3b3JrIGNvbm5lY3Rpb24uICBJIGFza2VkIOKAnERvIHlvdSBjb21lIGZyb20gYSBMQU4gZG93biB1bmRlcj/igJ1cIixcbiAgXCJUaGVyZSBhcmUgMTAgdHlwZXMgb2YgcGVvcGxlIGluIHRoZSB3b3JsZC4gVGhvc2Ugd2hvIHVuZGVyc3RhbmQgYmluYXJ5IGFuZCB0aG9zZSB3aG8gZG9uJ3QuXCIsXG4gIFwiV2h5IGFyZSBhc3NlbWJseSBwcm9ncmFtbWVycyBvZnRlbiB3ZXQ/IFRoZXkgd29yayBiZWxvdyBDIGxldmVsLlwiLFxuICBcIk15IGZhdm91cml0ZSBjb21wdXRlciBiYXNlZCBiYW5kIGlzIHRoZSBCbGFjayBJUHMuXCIsXG4gIFwiV2hhdCBwcm9ncmFtbWUgZG8geW91IHVzZSB0byBwcmVkaWN0IHRoZSBtdXNpYyB0YXN0ZXMgb2YgZm9ybWVyIFVTIHByZXNpZGVudGlhbCBjYW5kaWRhdGVzPyBBbiBBbCBHb3JlIFJoeXRobS5cIixcbiAgXCJBbiBTRU8gZXhwZXJ0IHdhbGtlZCBpbnRvIGEgYmFyLCBwdWIsIGlubiwgdGF2ZXJuLCBob3N0ZWxyeSwgcHVibGljIGhvdXNlLlwiLFxuXTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSAoX3JlcTogUmVxdWVzdCwgX2N0eDogSGFuZGxlckNvbnRleHQpOiBSZXNwb25zZSA9PiB7XG4gIGNvbnN0IHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogSk9LRVMubGVuZ3RoKTtcbiAgY29uc3QgYm9keSA9IEpPS0VTW3JhbmRvbUluZGV4XTtcbiAgcmV0dXJuIG5ldyBSZXNwb25zZShib2R5KTtcbn07XG5gO1xuYXdhaXQgRGVuby53cml0ZVRleHRGaWxlKFxuICBqb2luKHJlc29sdmVkRGlyZWN0b3J5LCBcInJvdXRlc1wiLCBcImFwaVwiLCBcImpva2UudHNcIiksXG4gIFJPVVRFU19BUElfSk9LRV9UUyxcbik7XG5cbmNvbnN0IFVUSUxTX1RXSU5EX1RTID0gYGltcG9ydCB7IElTX0JST1dTRVIgfSBmcm9tIFwiJGZyZXNoL3J1bnRpbWUudHNcIjtcbmltcG9ydCB7IENvbmZpZ3VyYXRpb24sIHNldHVwIH0gZnJvbSBcInR3aW5kXCI7XG5leHBvcnQgKiBmcm9tIFwidHdpbmRcIjtcbmV4cG9ydCBjb25zdCBjb25maWc6IENvbmZpZ3VyYXRpb24gPSB7XG4gIGRhcmtNb2RlOiBcImNsYXNzXCIsXG4gIG1vZGU6IFwic2lsZW50XCIsXG59O1xuaWYgKElTX0JST1dTRVIpIHNldHVwKGNvbmZpZyk7XG5gO1xuaWYgKHVzZVR3aW5kKSB7XG4gIGF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgICBqb2luKHJlc29sdmVkRGlyZWN0b3J5LCBcInV0aWxzXCIsIFwidHdpbmQudHNcIiksXG4gICAgVVRJTFNfVFdJTkRfVFMsXG4gICk7XG59XG5cbmNvbnN0IFNUQVRJQ19MT0dPID1cbiAgYDxzdmcgd2lkdGg9XCI0MFwiIGhlaWdodD1cIjQwXCIgZmlsbD1cIm5vbmVcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gIDxwYXRoIGQ9XCJNMzQuMDkyIDguODQ1QzM4LjkyOSAyMC42NTIgMzQuMDkyIDI3IDMwIDMwLjVjMSAzLjUtMi45ODYgNC4yMjItNC41IDIuNS00LjQ1NyAxLjUzNy0xMy41MTIgMS40ODctMjAtNUMyIDI0LjUgNC43MyAxNi43MTQgMTQgMTEuNWM4LTQuNSAxNi03IDIwLjA5Mi0yLjY1NVpcIiBmaWxsPVwiI0ZGREIxRVwiLz5cbiAgPHBhdGggZD1cIk0xNCAxMS41YzYuODQ4LTQuNDk3IDE1LjAyNS02LjM4IDE4LjM2OC0zLjQ3QzM3LjUgMTIuNSAyMS41IDIyLjYxMiAxNS41IDI1Yy02LjUgMi41ODctMyA4LjUtNi41IDguNS0zIDAtMi41LTQtNS4xODMtNy43NUMyLjIzMiAyMy41MzUgNi4xNiAxNi42NDggMTQgMTEuNVpcIiBmaWxsPVwiI2ZmZlwiIHN0cm9rZT1cIiNGRkRCMUVcIi8+XG4gIDxwYXRoIGQ9XCJNMjguNTM1IDguNzcyYzQuNjQ1IDEuMjUtLjM2NSA1LjY5NS00LjMwMyA4LjUzNi0zLjczMiAyLjY5Mi02LjYwNiA0LjIxLTcuOTIzIDQuODMtLjM2Ni4xNzMtMS42MTctMi4yNTItMS42MTctMSAwIC40MTctLjcgMi4yMzgtLjkzNCAyLjMyNi0xLjM2NS41MTItNC4yMjMgMS4yOS01LjgzNSAxLjI5LTMuNDkxIDAtMS45MjMtNC43NTQgMy4wMTQtOS4xMjIuODkyLS43ODkgMS40NzgtLjY0NSAyLjI4My0uNjQ1LS41MzctLjc3My0uNTM0LS45MTcuNDAzLTEuNTQ2QzE3Ljc5IDEwLjY0IDIzIDguNzcgMjUuMjEyIDguNDJjLjM2Ni4wMTQuODIuMzUuODIuNjI5LjQxLS4xNCAyLjA5NS0uMzg4IDIuNTAzLS4yNzhaXCIgZmlsbD1cIiNGRkU2MDBcIi8+XG4gIDxwYXRoIGQ9XCJNMTQuMjk3IDE2LjQ5Yy45ODUtLjc0NyAxLjY0NC0xLjAxIDIuMDk5LTIuNTI2LjU2Ni4xMjEuODQxLS4wOCAxLjI5LS43MDEuMzI0LjQ2NiAxLjY1Ny42MDggMi40NTMuNzAxLS43MTUuNDUxLTEuMDU3Ljg1Mi0xLjQ1MiAyLjEwNi0xLjQ2NC0uNjExLTMuMTY3LS4zMDItNC4zOS40MlpcIiBmaWxsPVwiI2ZmZlwiLz5cbjwvc3ZnPmA7XG5cbmF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgam9pbihyZXNvbHZlZERpcmVjdG9yeSwgXCJzdGF0aWNcIiwgXCJsb2dvLnN2Z1wiKSxcbiAgU1RBVElDX0xPR08sXG4pO1xuXG50cnkge1xuICBjb25zdCBmYXZpY29uQXJyYXlCdWZmZXIgPSBhd2FpdCBmZXRjaChcImh0dHBzOi8vZnJlc2guZGVuby5kZXYvZmF2aWNvbi5pY29cIilcbiAgICAudGhlbigoZCkgPT4gZC5hcnJheUJ1ZmZlcigpKTtcbiAgYXdhaXQgRGVuby53cml0ZUZpbGUoXG4gICAgam9pbihyZXNvbHZlZERpcmVjdG9yeSwgXCJzdGF0aWNcIiwgXCJmYXZpY29uLmljb1wiKSxcbiAgICBuZXcgVWludDhBcnJheShmYXZpY29uQXJyYXlCdWZmZXIpLFxuICApO1xufSBjYXRjaCB7XG4gIC8vIFNraXAgdGhpcyBhbmQgYmUgc2lsZW50IGlmIHRoZXJlIGlzIGEgbmV3b3JrIGlzc3VlLlxufVxuXG5sZXQgTUFJTl9UUyA9IGAvLy8gPHJlZmVyZW5jZSBuby1kZWZhdWx0LWxpYj1cInRydWVcIiAvPlxuLy8vIDxyZWZlcmVuY2UgbGliPVwiZG9tXCIgLz5cbi8vLyA8cmVmZXJlbmNlIGxpYj1cImRvbS5hc3luY2l0ZXJhYmxlXCIgLz5cbi8vLyA8cmVmZXJlbmNlIGxpYj1cImRlbm8ubnNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgbGliPVwiZGVuby51bnN0YWJsZVwiIC8+XG5cbmltcG9ydCB7ICR7XG4gIHVzZVR3aW5kID8gXCJJbm5lclJlbmRlckZ1bmN0aW9uLCBSZW5kZXJDb250ZXh0LCBcIiA6IFwiXCJcbn1zdGFydCB9IGZyb20gXCIkZnJlc2gvc2VydmVyLnRzXCI7XG5pbXBvcnQgbWFuaWZlc3QgZnJvbSBcIi4vZnJlc2guZ2VuLnRzXCI7XG5gO1xuXG5pZiAodXNlVHdpbmQpIHtcbiAgTUFJTl9UUyArPSBgXG5pbXBvcnQgeyBjb25maWcsIHNldHVwIH0gZnJvbSBcIkB0d2luZFwiO1xuaW1wb3J0IHsgdmlydHVhbFNoZWV0IH0gZnJvbSBcInR3aW5kL3NoZWV0c1wiO1xuXG5jb25zdCBzaGVldCA9IHZpcnR1YWxTaGVldCgpO1xuc2hlZXQucmVzZXQoKTtcbnNldHVwKHsgLi4uY29uZmlnLCBzaGVldCB9KTtcblxuZnVuY3Rpb24gcmVuZGVyKGN0eDogUmVuZGVyQ29udGV4dCwgcmVuZGVyOiBJbm5lclJlbmRlckZ1bmN0aW9uKSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gY3R4LnN0YXRlLmdldChcInR3aW5kXCIpIGFzIHVua25vd25bXSB8IG51bGw7XG4gIHNoZWV0LnJlc2V0KHNuYXBzaG90IHx8IHVuZGVmaW5lZCk7XG4gIHJlbmRlcigpO1xuICBjdHguc3R5bGVzLnNwbGljZSgwLCBjdHguc3R5bGVzLmxlbmd0aCwgLi4uKHNoZWV0KS50YXJnZXQpO1xuICBjb25zdCBuZXdTbmFwc2hvdCA9IHNoZWV0LnJlc2V0KCk7XG4gIGN0eC5zdGF0ZS5zZXQoXCJ0d2luZFwiLCBuZXdTbmFwc2hvdCk7XG59XG5cbmA7XG59XG5cbk1BSU5fVFMgKz0gYGF3YWl0IHN0YXJ0KG1hbmlmZXN0JHt1c2VUd2luZCA/IFwiLCB7IHJlbmRlciB9XCIgOiBcIlwifSk7XFxuYDtcbmNvbnN0IE1BSU5fVFNfUEFUSCA9IGpvaW4ocmVzb2x2ZWREaXJlY3RvcnksIFwibWFpbi50c1wiKTtcbmF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShNQUlOX1RTX1BBVEgsIE1BSU5fVFMpO1xuXG5jb25zdCBERVZfVFMgPSBgIyEvdXNyL2Jpbi9lbnYgLVMgZGVubyBydW4gLUEgLS13YXRjaD1zdGF0aWMvLHJvdXRlcy9cblxuaW1wb3J0IGRldiBmcm9tIFwiJGZyZXNoL2Rldi50c1wiO1xuXG5hd2FpdCBkZXYoaW1wb3J0Lm1ldGEudXJsLCBcIi4vbWFpbi50c1wiKTtcbmA7XG5jb25zdCBERVZfVFNfUEFUSCA9IGpvaW4ocmVzb2x2ZWREaXJlY3RvcnksIFwiZGV2LnRzXCIpO1xuYXdhaXQgRGVuby53cml0ZVRleHRGaWxlKERFVl9UU19QQVRILCBERVZfVFMpO1xudHJ5IHtcbiAgYXdhaXQgRGVuby5jaG1vZChERVZfVFNfUEFUSCwgMG83NzcpO1xufSBjYXRjaCB7XG4gIC8vIHRoaXMgdGhyb3dzIG9uIHdpbmRvd3Ncbn1cblxuY29uc3QgY29uZmlnID0ge1xuICB0YXNrczoge1xuICAgIHN0YXJ0OiBcImRlbm8gcnVuIC1BIC0td2F0Y2g9c3RhdGljLyxyb3V0ZXMvIGRldi50c1wiLFxuICB9LFxuICBpbXBvcnRNYXA6IFwiLi9pbXBvcnRfbWFwLmpzb25cIixcbn07XG5jb25zdCBERU5PX0NPTkZJRyA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMikgKyBcIlxcblwiO1xuXG5hd2FpdCBEZW5vLndyaXRlVGV4dEZpbGUoam9pbihyZXNvbHZlZERpcmVjdG9yeSwgXCJkZW5vLmpzb25cIiksIERFTk9fQ09ORklHKTtcblxuY29uc3QgUkVBRE1FX01EID0gYCMgZnJlc2ggcHJvamVjdFxuXG4jIyMgVXNhZ2VcblxuU3RhcnQgdGhlIHByb2plY3Q6XG5cblxcYFxcYFxcYFxuZGVubyB0YXNrIHN0YXJ0XG5cXGBcXGBcXGBcblxuVGhpcyB3aWxsIHdhdGNoIHRoZSBwcm9qZWN0IGRpcmVjdG9yeSBhbmQgcmVzdGFydCBhcyBuZWNlc3NhcnkuXG5gO1xuYXdhaXQgRGVuby53cml0ZVRleHRGaWxlKFxuICBqb2luKHJlc29sdmVkRGlyZWN0b3J5LCBcIlJFQURNRS5tZFwiKSxcbiAgUkVBRE1FX01ELFxuKTtcblxuY29uc3QgdnNjb2RlU2V0dGluZ3MgPSB7XG4gIFwiZGVuby5lbmFibGVcIjogdHJ1ZSxcbiAgXCJkZW5vLmxpbnRcIjogdHJ1ZSxcbiAgXCJlZGl0b3IuZGVmYXVsdEZvcm1hdHRlclwiOiBcImRlbm9sYW5kLnZzY29kZS1kZW5vXCIsXG59O1xuXG5jb25zdCBWU0NPREVfU0VUVElOR1MgPSBKU09OLnN0cmluZ2lmeSh2c2NvZGVTZXR0aW5ncywgbnVsbCwgMikgKyBcIlxcblwiO1xuXG5pZiAodXNlVlNDb2RlKSB7XG4gIGF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgICBqb2luKHJlc29sdmVkRGlyZWN0b3J5LCBcIi52c2NvZGVcIiwgXCJzZXR0aW5ncy5qc29uXCIpLFxuICAgIFZTQ09ERV9TRVRUSU5HUyxcbiAgKTtcbn1cblxuY29uc3QgdnNjb2RlRXh0ZW5zaW9ucyA9IHtcbiAgcmVjb21tZW5kYXRpb25zOiBbXCJkZW5vbGFuZC52c2NvZGUtZGVub1wiXSxcbn07XG5cbmNvbnN0IFZTQ09ERV9FWFRFTlNJT05TID0gSlNPTi5zdHJpbmdpZnkodnNjb2RlRXh0ZW5zaW9ucywgbnVsbCwgMikgKyBcIlxcblwiO1xuXG5pZiAodXNlVlNDb2RlKSB7XG4gIGF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgICBqb2luKHJlc29sdmVkRGlyZWN0b3J5LCBcIi52c2NvZGVcIiwgXCJleHRlbnNpb25zLmpzb25cIiksXG4gICAgVlNDT0RFX0VYVEVOU0lPTlMsXG4gICk7XG59XG5cbmNvbnN0IG1hbmlmZXN0ID0gYXdhaXQgY29sbGVjdChyZXNvbHZlZERpcmVjdG9yeSk7XG5hd2FpdCBnZW5lcmF0ZShyZXNvbHZlZERpcmVjdG9yeSwgbWFuaWZlc3QpO1xuXG4vLyBTcGVjaWZpY2FsbHkgcHJpbnQgdW5yZXNvbHZlZERpcmVjdG9yeSwgcmF0aGVyIHRoYW4gcmVzb2x2ZWREaXJlY3RvcnkgaW4gb3JkZXIgdG9cbi8vIG5vdCBsZWFrIHBlcnNvbmFsIGluZm8gKGUuZy4gYC9Vc2Vycy9NeU5hbWVgKVxuY29uc29sZS5sb2coXCJcXG4lY1Byb2plY3QgY3JlYXRlZCFcIiwgXCJjb2xvcjogZ3JlZW47IGZvbnQtd2VpZ2h0OiBib2xkXCIpO1xuY29uc29sZS5sb2coYFxcbkluIG9yZGVyIHRvIHN0YXJ0IHRoZSBkZXZlbG9wbWVudCBzZXJ2ZXIsIHJ1bjpcXG5gKTtcbmNvbnNvbGUubG9nKGAkIGNkICR7dW5yZXNvbHZlZERpcmVjdG9yeX1gKTtcbmNvbnNvbGUubG9nKFwiJCBkZW5vIHRhc2sgc3RhcnRcIik7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLFFBQVEsbUJBQW1CLENBQUM7QUFDOUQsU0FBUyxLQUFLLFFBQVEsb0JBQW9CLENBQUM7QUFDM0MsU0FBUyxPQUFPLEVBQUUsUUFBUSxRQUFRLGtCQUFrQixDQUFDO0FBRXJELE1BQU0sV0FBVyxHQUFHLFFBQVEsQUFBQztBQUU3QiwrREFBK0Q7QUFDL0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsRUFBRTtJQUN4QyxJQUFJLE9BQU8sR0FDVCxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsK0NBQStDLENBQUMsQUFBQztJQUUvRSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDeEMsT0FBTyxJQUNMLHFGQUFxRixDQUFDO0tBQ3pGLE1BQU07UUFDTCxPQUFPLElBQUksa0NBQWtDLENBQUM7S0FDL0M7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDaEI7QUFFRCxNQUFNLElBQUksR0FBRyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQmQsQ0FBQyxBQUFDO0FBRUYsTUFBTSxxQkFBcUIsR0FDekIsa0dBQWtHLEFBQUM7QUFFckcsTUFBTSxpQkFBaUIsR0FDckIsOERBQThELEFBQUM7QUFFakUsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQUFBQztBQUVqRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtJQUM3QixPQUFPLEVBQUU7UUFBQyxPQUFPO1FBQUUs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