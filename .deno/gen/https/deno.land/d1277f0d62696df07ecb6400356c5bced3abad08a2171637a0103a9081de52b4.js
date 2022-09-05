import { BUILD_ID } from "./constants.ts";
import { denoPlugin, esbuild, toFileUrl } from "./deps.ts";
let esbuildInitialized = false;
async function ensureEsbuildInitialized() {
    if (esbuildInitialized === false) {
        if (Deno.run === undefined) {
            esbuildInitialized = esbuild.initialize({
                wasmURL: "https://unpkg.com/esbuild-wasm@0.14.51/esbuild.wasm",
                worker: false
            });
        } else {
            esbuild.initialize({});
        }
        await esbuildInitialized;
        esbuildInitialized = true;
    } else if (esbuildInitialized instanceof Promise) {
        await esbuildInitialized;
    }
}
export class Bundler {
    #importMapURL;
    #islands;
    #cache = undefined;
    constructor(islands, importMapURL){
        this.#islands = islands;
        this.#importMapURL = importMapURL;
    }
    async bundle() {
        const entryPoints = {
            "main": new URL("../../src/runtime/main.ts", import.meta.url).href
        };
        for (const island of this.#islands){
            entryPoints[`island-${island.id}`] = island.url;
        }
        const absWorkingDir = Deno.cwd();
        await ensureEsbuildInitialized();
        const bundle = await esbuild.build({
            bundle: true,
            define: {
                __FRSH_BUILD_ID: `"${BUILD_ID}"`
            },
            entryPoints,
            format: "esm",
            metafile: true,
            minify: true,
            outdir: ".",
            // This is requried to ensure the format of the outputFiles path is the same
            // between windows and linux
            absWorkingDir,
            outfile: "",
            platform: "neutral",
            plugins: [
                denoPlugin({
                    importMapURL: this.#importMapURL
                })
            ],
            splitting: true,
            target: [
                "chrome99",
                "firefox99",
                "safari15"
            ],
            treeShaking: true,
            write: false
        });
        // const metafileOutputs = bundle.metafile!.outputs;
        // for (const path in metafileOutputs) {
        //   const meta = metafileOutputs[path];
        //   const imports = meta.imports
        //     .filter(({ kind }) => kind === "import-statement")
        //     .map(({ path }) => `/${path}`);
        //   this.#preloads.set(`/${path}`, imports);
        // }
        const cache = new Map();
        const absDirUrlLength = toFileUrl(absWorkingDir).href.length;
        for (const file of bundle.outputFiles){
            cache.set(toFileUrl(file.path).href.substring(absDirUrlLength), file.contents);
        }
        this.#cache = cache;
        return;
    }
    async cache() {
        if (this.#cache === undefined) {
            this.#cache = this.bundle();
        }
        if (this.#cache instanceof Promise) {
            await this.#cache;
        }
        return this.#cache;
    }
    async get(path) {
        const cache = await this.cache();
        return cache.get(path) ?? null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4wLjIvc3JjL3NlcnZlci9idW5kbGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQlVJTERfSUQgfSBmcm9tIFwiLi9jb25zdGFudHMudHNcIjtcbmltcG9ydCB7IGRlbm9QbHVnaW4sIGVzYnVpbGQsIHRvRmlsZVVybCB9IGZyb20gXCIuL2RlcHMudHNcIjtcbmltcG9ydCB7IElzbGFuZCB9IGZyb20gXCIuL3R5cGVzLnRzXCI7XG5cbmxldCBlc2J1aWxkSW5pdGlhbGl6ZWQ6IGJvb2xlYW4gfCBQcm9taXNlPHZvaWQ+ID0gZmFsc2U7XG5hc3luYyBmdW5jdGlvbiBlbnN1cmVFc2J1aWxkSW5pdGlhbGl6ZWQoKSB7XG4gIGlmIChlc2J1aWxkSW5pdGlhbGl6ZWQgPT09IGZhbHNlKSB7XG4gICAgaWYgKERlbm8ucnVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVzYnVpbGRJbml0aWFsaXplZCA9IGVzYnVpbGQuaW5pdGlhbGl6ZSh7XG4gICAgICAgIHdhc21VUkw6IFwiaHR0cHM6Ly91bnBrZy5jb20vZXNidWlsZC13YXNtQDAuMTQuNTEvZXNidWlsZC53YXNtXCIsXG4gICAgICAgIHdvcmtlcjogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXNidWlsZC5pbml0aWFsaXplKHt9KTtcbiAgICB9XG4gICAgYXdhaXQgZXNidWlsZEluaXRpYWxpemVkO1xuICAgIGVzYnVpbGRJbml0aWFsaXplZCA9IHRydWU7XG4gIH0gZWxzZSBpZiAoZXNidWlsZEluaXRpYWxpemVkIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgIGF3YWl0IGVzYnVpbGRJbml0aWFsaXplZDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQnVuZGxlciB7XG4gICNpbXBvcnRNYXBVUkw6IFVSTDtcbiAgI2lzbGFuZHM6IElzbGFuZFtdO1xuICAjY2FjaGU6IE1hcDxzdHJpbmcsIFVpbnQ4QXJyYXk+IHwgUHJvbWlzZTx2b2lkPiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3Rvcihpc2xhbmRzOiBJc2xhbmRbXSwgaW1wb3J0TWFwVVJMOiBVUkwpIHtcbiAgICB0aGlzLiNpc2xhbmRzID0gaXNsYW5kcztcbiAgICB0aGlzLiNpbXBvcnRNYXBVUkwgPSBpbXBvcnRNYXBVUkw7XG4gIH1cblxuICBhc3luYyBidW5kbGUoKSB7XG4gICAgY29uc3QgZW50cnlQb2ludHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICBcIm1haW5cIjogbmV3IFVSTChcIi4uLy4uL3NyYy9ydW50aW1lL21haW4udHNcIiwgaW1wb3J0Lm1ldGEudXJsKS5ocmVmLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGlzbGFuZCBvZiB0aGlzLiNpc2xhbmRzKSB7XG4gICAgICBlbnRyeVBvaW50c1tgaXNsYW5kLSR7aXNsYW5kLmlkfWBdID0gaXNsYW5kLnVybDtcbiAgICB9XG5cbiAgICBjb25zdCBhYnNXb3JraW5nRGlyID0gRGVuby5jd2QoKTtcbiAgICBhd2FpdCBlbnN1cmVFc2J1aWxkSW5pdGlhbGl6ZWQoKTtcbiAgICBjb25zdCBidW5kbGUgPSBhd2FpdCBlc2J1aWxkLmJ1aWxkKHtcbiAgICAgIGJ1bmRsZTogdHJ1ZSxcbiAgICAgIGRlZmluZTogeyBfX0ZSU0hfQlVJTERfSUQ6IGBcIiR7QlVJTERfSUR9XCJgIH0sXG4gICAgICBlbnRyeVBvaW50cyxcbiAgICAgIGZvcm1hdDogXCJlc21cIixcbiAgICAgIG1ldGFmaWxlOiB0cnVlLFxuICAgICAgbWluaWZ5OiB0cnVlLFxuICAgICAgb3V0ZGlyOiBcIi5cIixcbiAgICAgIC8vIFRoaXMgaXMgcmVxdXJpZWQgdG8gZW5zdXJlIHRoZSBmb3JtYXQgb2YgdGhlIG91dHB1dEZpbGVzIHBhdGggaXMgdGhlIHNhbWVcbiAgICAgIC8vIGJldHdlZW4gd2luZG93cyBhbmQgbGludXhcbiAgICAgIGFic1dvcmtpbmdEaXIsXG4gICAgICBvdXRmaWxlOiBcIlwiLFxuICAgICAgcGxhdGZvcm06IFwibmV1dHJhbFwiLFxuICAgICAgcGx1Z2luczogW2Rlbm9QbHVnaW4oeyBpbXBvcnRNYXBVUkw6IHRoaXMuI2ltcG9ydE1hcFVSTCB9KV0sXG4gICAgICBzcGxpdHRpbmc6IHRydWUsXG4gICAgICB0YXJnZXQ6IFtcImNocm9tZTk5XCIsIFwiZmlyZWZveDk5XCIsIFwic2FmYXJpMTVcIl0sXG4gICAgICB0cmVlU2hha2luZzogdHJ1ZSxcbiAgICAgIHdyaXRlOiBmYWxzZSxcbiAgICB9KTtcbiAgICAvLyBjb25zdCBtZXRhZmlsZU91dHB1dHMgPSBidW5kbGUubWV0YWZpbGUhLm91dHB1dHM7XG5cbiAgICAvLyBmb3IgKGNvbnN0IHBhdGggaW4gbWV0YWZpbGVPdXRwdXRzKSB7XG4gICAgLy8gICBjb25zdCBtZXRhID0gbWV0YWZpbGVPdXRwdXRzW3BhdGhdO1xuICAgIC8vICAgY29uc3QgaW1wb3J0cyA9IG1ldGEuaW1wb3J0c1xuICAgIC8vICAgICAuZmlsdGVyKCh7IGtpbmQgfSkgPT4ga2luZCA9PT0gXCJpbXBvcnQtc3RhdGVtZW50XCIpXG4gICAgLy8gICAgIC5tYXAoKHsgcGF0aCB9KSA9PiBgLyR7cGF0aH1gKTtcbiAgICAvLyAgIHRoaXMuI3ByZWxvYWRzLnNldChgLyR7cGF0aH1gLCBpbXBvcnRzKTtcbiAgICAvLyB9XG5cbiAgICBjb25zdCBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBVaW50OEFycmF5PigpO1xuICAgIGNvbnN0IGFic0RpclVybExlbmd0aCA9IHRvRmlsZVVybChhYnNXb3JraW5nRGlyKS5ocmVmLmxlbmd0aDtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgYnVuZGxlLm91dHB1dEZpbGVzKSB7XG4gICAgICBjYWNoZS5zZXQoXG4gICAgICAgIHRvRmlsZVVybChmaWxlLnBhdGgpLmhyZWYuc3Vic3RyaW5nKGFic0RpclVybExlbmd0aCksXG4gICAgICAgIGZpbGUuY29udGVudHMsXG4gICAgICApO1xuICAgIH1cbiAgICB0aGlzLiNjYWNoZSA9IGNhY2hlO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgYXN5bmMgY2FjaGUoKTogUHJvbWlzZTxNYXA8c3RyaW5nLCBVaW50OEFycmF5Pj4ge1xuICAgIGlmICh0aGlzLiNjYWNoZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLiNjYWNoZSA9IHRoaXMuYnVuZGxlKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLiNjYWNoZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgIGF3YWl0IHRoaXMuI2NhY2hlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4jY2FjaGUgYXMgTWFwPHN0cmluZywgVWludDhBcnJheT47XG4gIH1cblxuICBhc3luYyBnZXQocGF0aDogc3RyaW5nKTogUHJvbWlzZTxVaW50OEFycmF5IHwgbnVsbD4ge1xuICAgIGNvbnN0IGNhY2hlID0gYXdhaXQgdGhpcy5jYWNoZSgpO1xuICAgIHJldHVybiBjYWNoZS5nZXQocGF0aCkgPz8gbnVsbDtcbiAgfVxuXG4gIC8vIGdldFByZWxvYWRzKHBhdGg6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgLy8gICByZXR1cm4gdGhpcy4jcHJlbG9hZHMuZ2V0KHBhdGgpID8/IFtdO1xuICAvLyB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxRQUFRLFFBQVEsZ0JBQWdCLENBQUM7QUFDMUMsU0FBUyxVQUFVLEVBQUUsT0FBTyxFQUFFLFNBQVMsUUFBUSxXQUFXLENBQUM7QUFHM0QsSUFBSSxrQkFBa0IsR0FBNEIsS0FBSyxBQUFDO0FBQ3hELGVBQWUsd0JBQXdCLEdBQUc7SUFDeEMsSUFBSSxrQkFBa0IsS0FBSyxLQUFLLEVBQUU7UUFDaEMsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLFNBQVMsRUFBRTtZQUMxQixrQkFBa0IsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO2dCQUN0QyxPQUFPLEVBQUUscURBQXFEO2dCQUM5RCxNQUFNLEVBQUUsS0FBSzthQUNkLENBQUMsQ0FBQztT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