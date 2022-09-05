import { extname, fromFileUrl, router, Status, toFileUrl, typeByExtension, walk } from "./deps.ts";
import { h } from "preact";
import { Bundler } from "./bundle.ts";
import { ALIVE_URL, BUILD_ID, JS_PREFIX, REFRESH_JS_URL } from "./constants.ts";
import DefaultErrorHandler from "./default_error_page.tsx";
import { render as internalRender } from "./render.tsx";
import { SELF } from "../runtime/csp.ts";
import { ASSET_CACHE_BUST_KEY, INTERNAL_PREFIX } from "../runtime/utils.ts";
export class ServerContext {
    #dev;
    #routes;
    #islands;
    #staticFiles;
    #bundler;
    #renderFn;
    #middlewares;
    #app;
    #notFound;
    #error;
    constructor(routes, islands, staticFiles, renderfn, middlewares, app, notFound, error, importMapURL){
        this.#routes = routes;
        this.#islands = islands;
        this.#staticFiles = staticFiles;
        this.#renderFn = renderfn;
        this.#middlewares = middlewares;
        this.#app = app;
        this.#notFound = notFound;
        this.#error = error;
        this.#bundler = new Bundler(this.#islands, importMapURL);
        this.#dev = typeof Deno.env.get("DENO_DEPLOYMENT_ID") !== "string"; // Env var is only set in prod (on Deploy).
    }
    /**
   * Process the manifest into individual components and pages.
   */ static async fromManifest(manifest, opts) {
        // Get the manifest' base URL.
        const baseUrl = new URL("./", manifest.baseUrl).href;
        const importMapURL = new URL("./import_map.json", manifest.baseUrl);
        // Extract all routes, and prepare them into the `Page` structure.
        const routes = [];
        const islands = [];
        const middlewares = [];
        let app = DEFAULT_APP;
        let notFound = DEFAULT_NOT_FOUND;
        let error = DEFAULT_ERROR;
        for (const [self, module] of Object.entries(manifest.routes)){
            const url = new URL(self, baseUrl).href;
            if (!url.startsWith(baseUrl + "routes")) {
                throw new TypeError("Page is not a child of the basepath.");
            }
            const path = url.substring(baseUrl.length).substring("routes".length);
            const baseRoute = path.substring(1, path.length - extname(path).length);
            const name = baseRoute.replace("/", "-");
            const isMiddleware = path.endsWith("/_middleware.tsx") || path.endsWith("/_middleware.ts") || path.endsWith("/_middleware.jsx") || path.endsWith("/_middleware.js");
            if (!path.startsWith("/_") && !isMiddleware) {
                const { default: component , config  } = module;
                let pattern = pathToPattern(baseRoute);
                if (config?.routeOverride) {
                    pattern = String(config.routeOverride);
                }
                let { handler  } = module;
                handler ??= {};
                if (component && typeof handler === "object" && handler.GET === undefined) {
                    handler.GET = (_req, { render  })=>render();
                }
                const route = {
                    pattern,
                    url,
                    name,
                    component,
                    handler,
                    csp: Boolean(config?.csp ?? false)
                };
                routes.push(route);
            } else if (isMiddleware) {
                middlewares.push({
                    ...middlewarePathToPattern(baseRoute),
                    ...module
                });
            } else if (path === "/_app.tsx" || path === "/_app.ts" || path === "/_app.jsx" || path === "/_app.js") {
                app = module;
            } else if (path === "/_404.tsx" || path === "/_404.ts" || path === "/_404.jsx" || path === "/_404.js") {
                const { default: component , config  } = module;
                let { handler  } = module;
                if (component && handler === undefined) {
                    handler = (_req, { render  })=>render();
                }
                notFound = {
                    pattern: pathToPattern(baseRoute),
                    url,
                    name,
                    component,
                    handler: handler ?? ((req)=>router.defaultOtherHandler(req)),
                    csp: Boolean(config?.csp ?? false)
                };
            } else if (path === "/_500.tsx" || path === "/_500.ts" || path === "/_500.jsx" || path === "/_500.js") {
                const { default: component , config  } = module;
                let { handler  } = module;
                if (component && handler === undefined) {
                    handler = (_req, { render  })=>render();
                }
                error = {
                    pattern: pathToPattern(baseRoute),
                    url,
                    name,
                    component,
                    handler: handler ?? ((req, ctx)=>router.defaultErrorHandler(req, ctx, ctx.error)),
                    csp: Boolean(config?.csp ?? false)
                };
            }
        }
        sortRoutes(routes);
        sortRoutes(middlewares);
        for (const [self1, module1] of Object.entries(manifest.islands)){
            const url = new URL(self1, baseUrl).href;
            if (!url.startsWith(baseUrl)) {
                throw new TypeError("Island is not a child of the basepath.");
            }
            const path = url.substring(baseUrl.length).substring("islands".length);
            const baseRoute = path.substring(1, path.length - extname(path).length);
            const name = sanitizeIslandName(baseRoute);
            const id = name.toLowerCase();
            if (typeof module1.default !== "function") {
                throw new TypeError(`Islands must default export a component ('${self1}').`);
            }
            islands.push({
                id,
                name,
                url,
                component: module1.default
            });
        }
        const staticFiles = [];
        try {
            const staticFolder = new URL("./static", manifest.baseUrl);
            // TODO(lucacasonato): remove the extranious Deno.readDir when
            // https://github.com/denoland/deno_std/issues/1310 is fixed.
            for await (const _ of Deno.readDir(fromFileUrl(staticFolder))){
            // do nothing
            }
            const entires = walk(fromFileUrl(staticFolder), {
                includeFiles: true,
                includeDirs: false,
                followSymlinks: false
            });
            const encoder = new TextEncoder();
            for await (const entry of entires){
                const localUrl = toFileUrl(entry.path);
                const path = localUrl.href.substring(staticFolder.href.length);
                const stat = await Deno.stat(localUrl);
                const contentType = typeByExtension(extname(path)) ?? "application/octet-stream";
                const etag = await crypto.subtle.digest("SHA-1", encoder.encode(BUILD_ID + path)).then((hash)=>Array.from(new Uint8Array(hash)).map((byte)=>byte.toString(16).padStart(2, "0")).join(""));
                const staticFile = {
                    localUrl,
                    path,
                    size: stat.size,
                    contentType,
                    etag
                };
                staticFiles.push(staticFile);
            }
        } catch (err) {
            if (err instanceof Deno.errors.NotFound) {
            // Do nothing.
            } else {
                throw err;
            }
        }
        return new ServerContext(routes, islands, staticFiles, opts.render ?? DEFAULT_RENDER_FN, middlewares, app, notFound, error, importMapURL);
    }
    /**
   * This functions returns a request handler that handles all routes required
   * by fresh, including static files.
   */ handler() {
        const inner = router.router(...this.#handlers());
        const withMiddlewares = this.#composeMiddlewares(this.#middlewares);
        return function handler(req, connInfo) {
            // Redirect requests that end with a trailing slash
            // to their non-trailing slash counterpart.
            // Ex: /about/ -> /about
            const url = new URL(req.url);
            if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
                url.pathname = url.pathname.slice(0, -1);
                return Response.redirect(url.href, Status.TemporaryRedirect);
            }
            return withMiddlewares(req, connInfo, inner);
        };
    }
    /**
   * Identify which middlewares should be applied for a request,
   * chain them and return a handler response
   */  #composeMiddlewares(middlewares) {
        return (req, connInfo, inner)=>{
            // identify middlewares to apply, if any.
            // middlewares should be already sorted from deepest to shallow layer
            const mws = selectMiddlewares(req.url, middlewares);
            const handlers = [];
            const ctx = {
                next () {
                    const handler = handlers.shift();
                    return Promise.resolve(handler());
                },
                ...connInfo,
                state: {}
            };
            for (const mw of mws){
                handlers.push(()=>mw.handler(req, ctx));
            }
            handlers.push(()=>inner(req, ctx));
            const handler1 = handlers.shift();
            return handler1();
        };
    }
    /**
   * This function returns all routes required by fresh as an extended
   * path-to-regex, to handler mapping.
   */  #handlers() {
        const routes = {};
        routes[`${INTERNAL_PREFIX}${JS_PREFIX}/${BUILD_ID}/:path*`] = this.#bundleAssetRoute();
        if (this.#dev) {
            routes[REFRESH_JS_URL] = ()=>{
                const js = `let reloading = false; const buildId = "${BUILD_ID}"; new EventSource("${ALIVE_URL}").addEventListener("message", (e) => { if (e.data !== buildId && !reloading) { reloading = true; location.reload(); } });`;
                return new Response(new TextEncoder().encode(js), {
                    headers: {
                        "content-type": "application/javascript; charset=utf-8"
                    }
                });
            };
            routes[ALIVE_URL] = ()=>{
                let timerId = undefined;
                const body = new ReadableStream({
                    start (controller) {
                        controller.enqueue(`data: ${BUILD_ID}\nretry: 100\n\n`);
                        timerId = setInterval(()=>{
                            controller.enqueue(`data: ${BUILD_ID}\n\n`);
                        }, 1000);
                    },
                    cancel () {
                        if (timerId !== undefined) {
                            clearInterval(timerId);
                        }
                    }
                });
                return new Response(body.pipeThrough(new TextEncoderStream()), {
                    headers: {
                        "content-type": "text/event-stream"
                    }
                });
            };
        }
        // Add the static file routes.
        // each files has 2 static routes:
        // - one serving the file at its location without a "cache bursting" mechanism
        // - one containing the BUILD_ID in the path that can be cached
        for (const { localUrl , path , size , contentType , etag  } of this.#staticFiles){
            const route = sanitizePathToRegex(path);
            routes[`GET@${route}`] = this.#staticFileHandler(localUrl, size, contentType, etag);
        }
        const genRender = (route2, status)=>{
            const imports = [];
            if (this.#dev) {
                imports.push(REFRESH_JS_URL);
            }
            return (req, params, error)=>{
                return async (data)=>{
                    if (route2.component === undefined) {
                        throw new Error("This page does not have a component to render.");
                    }
                    if (typeof route2.component === "function" && route2.component.constructor.name === "AsyncFunction") {
                        throw new Error("Async components are not supported. Fetch data inside of a route handler, as described in the docs: https://fresh.deno.dev/docs/getting-started/fetching-data");
                    }
                    const preloads = [];
                    const resp = await internalRender({
                        route: route2,
                        islands: this.#islands,
                        app: this.#app,
                        imports,
                        preloads,
                        renderFn: this.#renderFn,
                        url: new URL(req.url),
                        params,
                        data,
                        error
                    });
                    const headers = {
                        "content-type": "text/html; charset=utf-8"
                    };
                    const [body, csp] = resp;
                    if (csp) {
                        if (this.#dev) {
                            csp.directives.connectSrc = [
                                ...csp.directives.connectSrc ?? [],
                                SELF, 
                            ];
                        }
                        const directive = serializeCSPDirectives(csp.directives);
                        if (csp.reportOnly) {
                            headers["content-security-policy-report-only"] = directive;
                        } else {
                            headers["content-security-policy"] = directive;
                        }
                    }
                    return new Response(body, {
                        status,
                        headers
                    });
                };
            };
        };
        for (const route1 of this.#routes){
            const createRender = genRender(route1, Status.OK);
            if (typeof route1.handler === "function") {
                routes[route1.pattern] = (req, ctx, params)=>route1.handler(req, {
                        ...ctx,
                        params,
                        render: createRender(req, params)
                    });
            } else {
                for (const [method, handler] of Object.entries(route1.handler)){
                    routes[`${method}@${route1.pattern}`] = (req, ctx, params)=>handler(req, {
                            ...ctx,
                            params,
                            render: createRender(req, params)
                        });
                }
            }
        }
        const unknownHandlerRender = genRender(this.#notFound, Status.NotFound);
        const unknownHandler = (req, ctx)=>this.#notFound.handler(req, {
                ...ctx,
                render: unknownHandlerRender(req, {})
            });
        const errorHandlerRender = genRender(this.#error, Status.InternalServerError);
        const errorHandler = (req, ctx, error)=>{
            console.error("%cAn error occurred during route handling or page rendering.", "color:red", error);
            return this.#error.handler(req, {
                ...ctx,
                error,
                render: errorHandlerRender(req, {}, error)
            });
        };
        return [
            routes,
            unknownHandler,
            errorHandler
        ];
    }
     #staticFileHandler(localUrl, size, contentType, etag) {
        return async (req)=>{
            const url = new URL(req.url);
            const key = url.searchParams.get(ASSET_CACHE_BUST_KEY);
            if (key !== null && BUILD_ID !== key) {
                url.searchParams.delete(ASSET_CACHE_BUST_KEY);
                const location = url.pathname + url.search;
                return new Response("", {
                    status: 307,
                    headers: {
                        "content-type": "text/plain",
                        location
                    }
                });
            }
            const headers = new Headers({
                "content-type": contentType,
                etag,
                vary: "If-None-Match"
            });
            if (key !== null) {
                headers.set("Cache-Control", "public, max-age=31536000, immutable");
            }
            const ifNoneMatch = req.headers.get("if-none-match");
            if (ifNoneMatch === etag || ifNoneMatch === "W/" + etag) {
                return new Response(null, {
                    status: 304,
                    headers
                });
            } else {
                const file = await Deno.open(localUrl);
                headers.set("content-length", String(size));
                return new Response(file.readable, {
                    headers
                });
            }
        };
    }
    /**
   * Returns a router that contains all fresh routes. Should be mounted at
   * constants.INTERNAL_PREFIX
   */ #bundleAssetRoute = ()=>{
        return async (_req, _ctx, params)=>{
            const path = `/${params.path}`;
            const file = await this.#bundler.get(path);
            let res;
            if (file) {
                const headers = new Headers({
                    "Cache-Control": "public, max-age=604800, immutable"
                });
                const contentType1 = typeByExtension(extname(path));
                if (contentType1) {
                    headers.set("Content-Type", contentType1);
                }
                res = new Response(file, {
                    status: 200,
                    headers
                });
            }
            return res ?? new Response(null, {
                status: 404
            });
        };
    };
}
const DEFAULT_RENDER_FN = (_ctx, render)=>{
    render();
};
const DEFAULT_APP = {
    default: ({ Component  })=>h(Component, {})
};
const DEFAULT_NOT_FOUND = {
    pattern: "",
    url: "",
    name: "_404",
    handler: (req)=>router.defaultOtherHandler(req),
    csp: false
};
const DEFAULT_ERROR = {
    pattern: "",
    url: "",
    name: "_500",
    component: DefaultErrorHandler,
    handler: (_req, ctx)=>ctx.render(),
    csp: false
};
/**
 * Return a list of middlewares that needs to be applied for request url
 * @param url the request url
 * @param middlewares Array of middlewares handlers and their routes as path-to-regexp style
 */ export function selectMiddlewares(url, middlewares1) {
    const selectedMws = [];
    const reqURL = new URL(url);
    for (const { compiledPattern , handler  } of middlewares1){
        const res = compiledPattern.exec(reqURL);
        if (res) {
            selectedMws.push({
                handler
            });
        }
    }
    return selectedMws;
}
/**
 * Sort pages by their relative routing priority, based on the parts in the
 * route matcher
 */ function sortRoutes(routes) {
    routes.sort((a, b)=>{
        const partsA = a.pattern.split("/");
        const partsB = b.pattern.split("/");
        for(let i = 0; i < Math.max(partsA.length, partsB.length); i++){
            const partA = partsA[i];
            const partB = partsB[i];
            if (partA === undefined) return -1;
            if (partB === undefined) return 1;
            if (partA === partB) continue;
            const priorityA = partA.startsWith(":") ? partA.endsWith("*") ? 0 : 1 : 2;
            const priorityB = partB.startsWith(":") ? partB.endsWith("*") ? 0 : 1 : 2;
            return Math.max(Math.min(priorityB - priorityA, 1), -1);
        }
        return 0;
    });
}
/** Transform a filesystem URL path to a `path-to-regex` style matcher. */ function pathToPattern(path) {
    const parts = path.split("/");
    if (parts[parts.length - 1] === "index") {
        parts.pop();
    }
    const route = "/" + parts.map((part)=>{
        if (part.startsWith("[...") && part.endsWith("]")) {
            return `:${part.slice(4, part.length - 1)}*`;
        }
        if (part.startsWith("[") && part.endsWith("]")) {
            return `:${part.slice(1, part.length - 1)}`;
        }
        return part;
    }).join("/");
    return route;
}
// Normalize a path for use in a URL. Returns null if the path is unparsable.
export function normalizeURLPath(path) {
    try {
        const pathUrl = new URL("file:///");
        pathUrl.pathname = path;
        return pathUrl.pathname;
    } catch  {
        return null;
    }
}
function sanitizePathToRegex(path) {
    return path.replaceAll("\*", "\\*").replaceAll("\+", "\\+").replaceAll("\?", "\\?").replaceAll("\{", "\\{").replaceAll("\}", "\\}").replaceAll("\(", "\\(").replaceAll("\)", "\\)").replaceAll("\:", "\\:");
}
function toPascalCase(text) {
    return text.replace(/(^\w|-\w)/g, (substring)=>substring.replace(/-/, "").toUpperCase());
}
function sanitizeIslandName(name) {
    const fileName = name.replace("/", "");
    return toPascalCase(fileName);
}
function serializeCSPDirectives(csp) {
    return Object.entries(csp).filter(([_key, value])=>value !== undefined).map(([k, v])=>{
        // Turn camel case into snake case.
        const key = k.replace(/[A-Z]/g, (m)=>`-${m.toLowerCase()}`);
        const value = Array.isArray(v) ? v.join(" ") : v;
        return `${key} ${value}`;
    }).join("; ");
}
export function middlewarePathToPattern(baseRoute) {
    baseRoute = baseRoute.slice(0, -"_middleware".length);
    let pattern = pathToPattern(baseRoute);
    if (pattern.endsWith("/")) {
        pattern = pattern.slice(0, -1) + "{/*}?";
    }
    const compiledPattern = new URLPattern({
        pathname: pattern
    });
    return {
        pattern,
        compiledPattern
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4wLjIvc3JjL3NlcnZlci9jb250ZXh0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbm5JbmZvLFxuICBleHRuYW1lLFxuICBmcm9tRmlsZVVybCxcbiAgUmVxdWVzdEhhbmRsZXIsXG4gIHJvdXRlcixcbiAgU3RhdHVzLFxuICB0b0ZpbGVVcmwsXG4gIHR5cGVCeUV4dGVuc2lvbixcbiAgd2Fsayxcbn0gZnJvbSBcIi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgaCB9IGZyb20gXCJwcmVhY3RcIjtcbmltcG9ydCB7IE1hbmlmZXN0IH0gZnJvbSBcIi4vbW9kLnRzXCI7XG5pbXBvcnQgeyBCdW5kbGVyIH0gZnJvbSBcIi4vYnVuZGxlLnRzXCI7XG5pbXBvcnQgeyBBTElWRV9VUkwsIEJVSUxEX0lELCBKU19QUkVGSVgsIFJFRlJFU0hfSlNfVVJMIH0gZnJvbSBcIi4vY29uc3RhbnRzLnRzXCI7XG5pbXBvcnQgRGVmYXVsdEVycm9ySGFuZGxlciBmcm9tIFwiLi9kZWZhdWx0X2Vycm9yX3BhZ2UudHN4XCI7XG5pbXBvcnQge1xuICBBcHBNb2R1bGUsXG4gIEVycm9yUGFnZSxcbiAgRXJyb3JQYWdlTW9kdWxlLFxuICBGcmVzaE9wdGlvbnMsXG4gIEhhbmRsZXIsXG4gIElzbGFuZCxcbiAgTWlkZGxld2FyZSxcbiAgTWlkZGxld2FyZU1vZHVsZSxcbiAgTWlkZGxld2FyZVJvdXRlLFxuICBSZW5kZXJGdW5jdGlvbixcbiAgUm91dGUsXG4gIFJvdXRlTW9kdWxlLFxuICBVbmtub3duUGFnZSxcbiAgVW5rbm93blBhZ2VNb2R1bGUsXG59IGZyb20gXCIuL3R5cGVzLnRzXCI7XG5pbXBvcnQgeyByZW5kZXIgYXMgaW50ZXJuYWxSZW5kZXIgfSBmcm9tIFwiLi9yZW5kZXIudHN4XCI7XG5pbXBvcnQgeyBDb250ZW50U2VjdXJpdHlQb2xpY3lEaXJlY3RpdmVzLCBTRUxGIH0gZnJvbSBcIi4uL3J1bnRpbWUvY3NwLnRzXCI7XG5pbXBvcnQgeyBBU1NFVF9DQUNIRV9CVVNUX0tFWSwgSU5URVJOQUxfUFJFRklYIH0gZnJvbSBcIi4uL3J1bnRpbWUvdXRpbHMudHNcIjtcbmludGVyZmFjZSBSb3V0ZXJTdGF0ZSB7XG4gIHN0YXRlOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuaW50ZXJmYWNlIFN0YXRpY0ZpbGUge1xuICAvKiogVGhlIFVSTCB0byB0aGUgc3RhdGljIGZpbGUgb24gZGlzay4gKi9cbiAgbG9jYWxVcmw6IFVSTDtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoZSBmaWxlIGFzIGl0IHdvdWxkIGJlIGluIHRoZSBpbmNvbWluZyByZXF1ZXN0LiAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKiBUaGUgc2l6ZSBvZiB0aGUgZmlsZS4gKi9cbiAgc2l6ZTogbnVtYmVyO1xuICAvKiogVGhlIGNvbnRlbnQtdHlwZSBvZiB0aGUgZmlsZS4gKi9cbiAgY29udGVudFR5cGU6IHN0cmluZztcbiAgLyoqIEhhc2ggb2YgdGhlIGZpbGUgY29udGVudHMuICovXG4gIGV0YWc6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFNlcnZlckNvbnRleHQge1xuICAjZGV2OiBib29sZWFuO1xuICAjcm91dGVzOiBSb3V0ZVtdO1xuICAjaXNsYW5kczogSXNsYW5kW107XG4gICNzdGF0aWNGaWxlczogU3RhdGljRmlsZVtdO1xuICAjYnVuZGxlcjogQnVuZGxlcjtcbiAgI3JlbmRlckZuOiBSZW5kZXJGdW5jdGlvbjtcbiAgI21pZGRsZXdhcmVzOiBNaWRkbGV3YXJlUm91dGVbXTtcbiAgI2FwcDogQXBwTW9kdWxlO1xuICAjbm90Rm91bmQ6IFVua25vd25QYWdlO1xuICAjZXJyb3I6IEVycm9yUGFnZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICByb3V0ZXM6IFJvdXRlW10sXG4gICAgaXNsYW5kczogSXNsYW5kW10sXG4gICAgc3RhdGljRmlsZXM6IFN0YXRpY0ZpbGVbXSxcbiAgICByZW5kZXJmbjogUmVuZGVyRnVuY3Rpb24sXG4gICAgbWlkZGxld2FyZXM6IE1pZGRsZXdhcmVSb3V0ZVtdLFxuICAgIGFwcDogQXBwTW9kdWxlLFxuICAgIG5vdEZvdW5kOiBVbmtub3duUGFnZSxcbiAgICBlcnJvcjogRXJyb3JQYWdlLFxuICAgIGltcG9ydE1hcFVSTDogVVJMLFxuICApIHtcbiAgICB0aGlzLiNyb3V0ZXMgPSByb3V0ZXM7XG4gICAgdGhpcy4jaXNsYW5kcyA9IGlzbGFuZHM7XG4gICAgdGhpcy4jc3RhdGljRmlsZXMgPSBzdGF0aWNGaWxlcztcbiAgICB0aGlzLiNyZW5kZXJGbiA9IHJlbmRlcmZuO1xuICAgIHRoaXMuI21pZGRsZXdhcmVzID0gbWlkZGxld2FyZXM7XG4gICAgdGhpcy4jYXBwID0gYXBwO1xuICAgIHRoaXMuI25vdEZvdW5kID0gbm90Rm91bmQ7XG4gICAgdGhpcy4jZXJyb3IgPSBlcnJvcjtcbiAgICB0aGlzLiNidW5kbGVyID0gbmV3IEJ1bmRsZXIodGhpcy4jaXNsYW5kcywgaW1wb3J0TWFwVVJMKTtcbiAgICB0aGlzLiNkZXYgPSB0eXBlb2YgRGVuby5lbnYuZ2V0KFwiREVOT19ERVBMT1lNRU5UX0lEXCIpICE9PSBcInN0cmluZ1wiOyAvLyBFbnYgdmFyIGlzIG9ubHkgc2V0IGluIHByb2QgKG9uIERlcGxveSkuXG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyB0aGUgbWFuaWZlc3QgaW50byBpbmRpdmlkdWFsIGNvbXBvbmVudHMgYW5kIHBhZ2VzLlxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGZyb21NYW5pZmVzdChcbiAgICBtYW5pZmVzdDogTWFuaWZlc3QsXG4gICAgb3B0czogRnJlc2hPcHRpb25zLFxuICApOiBQcm9taXNlPFNlcnZlckNvbnRleHQ+IHtcbiAgICAvLyBHZXQgdGhlIG1hbmlmZXN0JyBiYXNlIFVSTC5cbiAgICBjb25zdCBiYXNlVXJsID0gbmV3IFVSTChcIi4vXCIsIG1hbmlmZXN0LmJhc2VVcmwpLmhyZWY7XG4gICAgY29uc3QgaW1wb3J0TWFwVVJMID0gbmV3IFVSTChcIi4vaW1wb3J0X21hcC5qc29uXCIsIG1hbmlmZXN0LmJhc2VVcmwpO1xuXG4gICAgLy8gRXh0cmFjdCBhbGwgcm91dGVzLCBhbmQgcHJlcGFyZSB0aGVtIGludG8gdGhlIGBQYWdlYCBzdHJ1Y3R1cmUuXG4gICAgY29uc3Qgcm91dGVzOiBSb3V0ZVtdID0gW107XG4gICAgY29uc3QgaXNsYW5kczogSXNsYW5kW10gPSBbXTtcbiAgICBjb25zdCBtaWRkbGV3YXJlczogTWlkZGxld2FyZVJvdXRlW10gPSBbXTtcbiAgICBsZXQgYXBwOiBBcHBNb2R1bGUgPSBERUZBVUxUX0FQUDtcbiAgICBsZXQgbm90Rm91bmQ6IFVua25vd25QYWdlID0gREVGQVVMVF9OT1RfRk9VTkQ7XG4gICAgbGV0IGVycm9yOiBFcnJvclBhZ2UgPSBERUZBVUxUX0VSUk9SO1xuICAgIGZvciAoY29uc3QgW3NlbGYsIG1vZHVsZV0gb2YgT2JqZWN0LmVudHJpZXMobWFuaWZlc3Qucm91dGVzKSkge1xuICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChzZWxmLCBiYXNlVXJsKS5ocmVmO1xuICAgICAgaWYgKCF1cmwuc3RhcnRzV2l0aChiYXNlVXJsICsgXCJyb3V0ZXNcIikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlBhZ2UgaXMgbm90IGEgY2hpbGQgb2YgdGhlIGJhc2VwYXRoLlwiKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhdGggPSB1cmwuc3Vic3RyaW5nKGJhc2VVcmwubGVuZ3RoKS5zdWJzdHJpbmcoXCJyb3V0ZXNcIi5sZW5ndGgpO1xuICAgICAgY29uc3QgYmFzZVJvdXRlID0gcGF0aC5zdWJzdHJpbmcoMSwgcGF0aC5sZW5ndGggLSBleHRuYW1lKHBhdGgpLmxlbmd0aCk7XG4gICAgICBjb25zdCBuYW1lID0gYmFzZVJvdXRlLnJlcGxhY2UoXCIvXCIsIFwiLVwiKTtcbiAgICAgIGNvbnN0IGlzTWlkZGxld2FyZSA9IHBhdGguZW5kc1dpdGgoXCIvX21pZGRsZXdhcmUudHN4XCIpIHx8XG4gICAgICAgIHBhdGguZW5kc1dpdGgoXCIvX21pZGRsZXdhcmUudHNcIikgfHwgcGF0aC5lbmRzV2l0aChcIi9fbWlkZGxld2FyZS5qc3hcIikgfHxcbiAgICAgICAgcGF0aC5lbmRzV2l0aChcIi9fbWlkZGxld2FyZS5qc1wiKTtcbiAgICAgIGlmICghcGF0aC5zdGFydHNXaXRoKFwiL19cIikgJiYgIWlzTWlkZGxld2FyZSkge1xuICAgICAgICBjb25zdCB7IGRlZmF1bHQ6IGNvbXBvbmVudCwgY29uZmlnIH0gPSAobW9kdWxlIGFzIFJvdXRlTW9kdWxlKTtcbiAgICAgICAgbGV0IHBhdHRlcm4gPSBwYXRoVG9QYXR0ZXJuKGJhc2VSb3V0ZSk7XG4gICAgICAgIGlmIChjb25maWc/LnJvdXRlT3ZlcnJpZGUpIHtcbiAgICAgICAgICBwYXR0ZXJuID0gU3RyaW5nKGNvbmZpZy5yb3V0ZU92ZXJyaWRlKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgeyBoYW5kbGVyIH0gPSAobW9kdWxlIGFzIFJvdXRlTW9kdWxlKTtcbiAgICAgICAgaGFuZGxlciA/Pz0ge307XG4gICAgICAgIGlmIChcbiAgICAgICAgICBjb21wb25lbnQgJiZcbiAgICAgICAgICB0eXBlb2YgaGFuZGxlciA9PT0gXCJvYmplY3RcIiAmJiBoYW5kbGVyLkdFVCA9PT0gdW5kZWZpbmVkXG4gICAgICAgICkge1xuICAgICAgICAgIGhhbmRsZXIuR0VUID0gKF9yZXEsIHsgcmVuZGVyIH0pID0+IHJlbmRlcigpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJvdXRlOiBSb3V0ZSA9IHtcbiAgICAgICAgICBwYXR0ZXJuLFxuICAgICAgICAgIHVybCxcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIGNvbXBvbmVudCxcbiAgICAgICAgICBoYW5kbGVyLFxuICAgICAgICAgIGNzcDogQm9vbGVhbihjb25maWc/LmNzcCA/PyBmYWxzZSksXG4gICAgICAgIH07XG4gICAgICAgIHJvdXRlcy5wdXNoKHJvdXRlKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNNaWRkbGV3YXJlKSB7XG4gICAgICAgIG1pZGRsZXdhcmVzLnB1c2goe1xuICAgICAgICAgIC4uLm1pZGRsZXdhcmVQYXRoVG9QYXR0ZXJuKGJhc2VSb3V0ZSksXG4gICAgICAgICAgLi4ubW9kdWxlIGFzIE1pZGRsZXdhcmVNb2R1bGUsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgcGF0aCA9PT0gXCIvX2FwcC50c3hcIiB8fCBwYXRoID09PSBcIi9fYXBwLnRzXCIgfHxcbiAgICAgICAgcGF0aCA9PT0gXCIvX2FwcC5qc3hcIiB8fCBwYXRoID09PSBcIi9fYXBwLmpzXCJcbiAgICAgICkge1xuICAgICAgICBhcHAgPSBtb2R1bGUgYXMgQXBwTW9kdWxlO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgcGF0aCA9PT0gXCIvXzQwNC50c3hcIiB8fCBwYXRoID09PSBcIi9fNDA0LnRzXCIgfHxcbiAgICAgICAgcGF0aCA9PT0gXCIvXzQwNC5qc3hcIiB8fCBwYXRoID09PSBcIi9fNDA0LmpzXCJcbiAgICAgICkge1xuICAgICAgICBjb25zdCB7IGRlZmF1bHQ6IGNvbXBvbmVudCwgY29uZmlnIH0gPSAobW9kdWxlIGFzIFVua25vd25QYWdlTW9kdWxlKTtcbiAgICAgICAgbGV0IHsgaGFuZGxlciB9ID0gKG1vZHVsZSBhcyBVbmtub3duUGFnZU1vZHVsZSk7XG4gICAgICAgIGlmIChjb21wb25lbnQgJiYgaGFuZGxlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaGFuZGxlciA9IChfcmVxLCB7IHJlbmRlciB9KSA9PiByZW5kZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5vdEZvdW5kID0ge1xuICAgICAgICAgIHBhdHRlcm46IHBhdGhUb1BhdHRlcm4oYmFzZVJvdXRlKSxcbiAgICAgICAgICB1cmwsXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICBjb21wb25lbnQsXG4gICAgICAgICAgaGFuZGxlcjogaGFuZGxlciA/PyAoKHJlcSkgPT4gcm91dGVyLmRlZmF1bHRPdGhlckhhbmRsZXIocmVxKSksXG4gICAgICAgICAgY3NwOiBCb29sZWFuKGNvbmZpZz8uY3NwID8/IGZhbHNlKSxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHBhdGggPT09IFwiL181MDAudHN4XCIgfHwgcGF0aCA9PT0gXCIvXzUwMC50c1wiIHx8XG4gICAgICAgIHBhdGggPT09IFwiL181MDAuanN4XCIgfHwgcGF0aCA9PT0gXCIvXzUwMC5qc1wiXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgeyBkZWZhdWx0OiBjb21wb25lbnQsIGNvbmZpZyB9ID0gKG1vZHVsZSBhcyBFcnJvclBhZ2VNb2R1bGUpO1xuICAgICAgICBsZXQgeyBoYW5kbGVyIH0gPSAobW9kdWxlIGFzIEVycm9yUGFnZU1vZHVsZSk7XG4gICAgICAgIGlmIChjb21wb25lbnQgJiYgaGFuZGxlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaGFuZGxlciA9IChfcmVxLCB7IHJlbmRlciB9KSA9PiByZW5kZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVycm9yID0ge1xuICAgICAgICAgIHBhdHRlcm46IHBhdGhUb1BhdHRlcm4oYmFzZVJvdXRlKSxcbiAgICAgICAgICB1cmwsXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICBjb21wb25lbnQsXG4gICAgICAgICAgaGFuZGxlcjogaGFuZGxlciA/P1xuICAgICAgICAgICAgKChyZXEsIGN0eCkgPT4gcm91dGVyLmRlZmF1bHRFcnJvckhhbmRsZXIocmVxLCBjdHgsIGN0eC5lcnJvcikpLFxuICAgICAgICAgIGNzcDogQm9vbGVhbihjb25maWc/LmNzcCA/PyBmYWxzZSksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRSb3V0ZXMocm91dGVzKTtcbiAgICBzb3J0Um91dGVzKG1pZGRsZXdhcmVzKTtcblxuICAgIGZvciAoY29uc3QgW3NlbGYsIG1vZHVsZV0gb2YgT2JqZWN0LmVudHJpZXMobWFuaWZlc3QuaXNsYW5kcykpIHtcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoc2VsZiwgYmFzZVVybCkuaHJlZjtcbiAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoYmFzZVVybCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIklzbGFuZCBpcyBub3QgYSBjaGlsZCBvZiB0aGUgYmFzZXBhdGguXCIpO1xuICAgICAgfVxuICAgICAgY29uc3QgcGF0aCA9IHVybC5zdWJzdHJpbmcoYmFzZVVybC5sZW5ndGgpLnN1YnN0cmluZyhcImlzbGFuZHNcIi5sZW5ndGgpO1xuICAgICAgY29uc3QgYmFzZVJvdXRlID0gcGF0aC5zdWJzdHJpbmcoMSwgcGF0aC5sZW5ndGggLSBleHRuYW1lKHBhdGgpLmxlbmd0aCk7XG4gICAgICBjb25zdCBuYW1lID0gc2FuaXRpemVJc2xhbmROYW1lKGJhc2VSb3V0ZSk7XG4gICAgICBjb25zdCBpZCA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmICh0eXBlb2YgbW9kdWxlLmRlZmF1bHQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIGBJc2xhbmRzIG11c3QgZGVmYXVsdCBleHBvcnQgYSBjb21wb25lbnQgKCcke3NlbGZ9JykuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGlzbGFuZHMucHVzaCh7IGlkLCBuYW1lLCB1cmwsIGNvbXBvbmVudDogbW9kdWxlLmRlZmF1bHQgfSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGljRmlsZXM6IFN0YXRpY0ZpbGVbXSA9IFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0aWNGb2xkZXIgPSBuZXcgVVJMKFwiLi9zdGF0aWNcIiwgbWFuaWZlc3QuYmFzZVVybCk7XG4gICAgICAvLyBUT0RPKGx1Y2FjYXNvbmF0byk6IHJlbW92ZSB0aGUgZXh0cmFuaW91cyBEZW5vLnJlYWREaXIgd2hlblxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2Rlbm9sYW5kL2Rlbm9fc3RkL2lzc3Vlcy8xMzEwIGlzIGZpeGVkLlxuICAgICAgZm9yIGF3YWl0IChjb25zdCBfIG9mIERlbm8ucmVhZERpcihmcm9tRmlsZVVybChzdGF0aWNGb2xkZXIpKSkge1xuICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICB9XG4gICAgICBjb25zdCBlbnRpcmVzID0gd2Fsayhmcm9tRmlsZVVybChzdGF0aWNGb2xkZXIpLCB7XG4gICAgICAgIGluY2x1ZGVGaWxlczogdHJ1ZSxcbiAgICAgICAgaW5jbHVkZURpcnM6IGZhbHNlLFxuICAgICAgICBmb2xsb3dTeW1saW5rczogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgICAgIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2YgZW50aXJlcykge1xuICAgICAgICBjb25zdCBsb2NhbFVybCA9IHRvRmlsZVVybChlbnRyeS5wYXRoKTtcbiAgICAgICAgY29uc3QgcGF0aCA9IGxvY2FsVXJsLmhyZWYuc3Vic3RyaW5nKHN0YXRpY0ZvbGRlci5ocmVmLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBEZW5vLnN0YXQobG9jYWxVcmwpO1xuICAgICAgICBjb25zdCBjb250ZW50VHlwZSA9IHR5cGVCeUV4dGVuc2lvbihleHRuYW1lKHBhdGgpKSA/P1xuICAgICAgICAgIFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCI7XG4gICAgICAgIGNvbnN0IGV0YWcgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChcbiAgICAgICAgICBcIlNIQS0xXCIsXG4gICAgICAgICAgZW5jb2Rlci5lbmNvZGUoQlVJTERfSUQgKyBwYXRoKSxcbiAgICAgICAgKS50aGVuKChoYXNoKSA9PlxuICAgICAgICAgIEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoaGFzaCkpXG4gICAgICAgICAgICAubWFwKChieXRlKSA9PiBieXRlLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpXG4gICAgICAgICAgICAuam9pbihcIlwiKVxuICAgICAgICApO1xuICAgICAgICBjb25zdCBzdGF0aWNGaWxlOiBTdGF0aWNGaWxlID0ge1xuICAgICAgICAgIGxvY2FsVXJsLFxuICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgc2l6ZTogc3RhdC5zaXplLFxuICAgICAgICAgIGNvbnRlbnRUeXBlLFxuICAgICAgICAgIGV0YWcsXG4gICAgICAgIH07XG4gICAgICAgIHN0YXRpY0ZpbGVzLnB1c2goc3RhdGljRmlsZSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuTm90Rm91bmQpIHtcbiAgICAgICAgLy8gRG8gbm90aGluZy5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFNlcnZlckNvbnRleHQoXG4gICAgICByb3V0ZXMsXG4gICAgICBpc2xhbmRzLFxuICAgICAgc3RhdGljRmlsZXMsXG4gICAgICBvcHRzLnJlbmRlciA/PyBERUZBVUxUX1JFTkRFUl9GTixcbiAgICAgIG1pZGRsZXdhcmVzLFxuICAgICAgYXBwLFxuICAgICAgbm90Rm91bmQsXG4gICAgICBlcnJvcixcbiAgICAgIGltcG9ydE1hcFVSTCxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgZnVuY3Rpb25zIHJldHVybnMgYSByZXF1ZXN0IGhhbmRsZXIgdGhhdCBoYW5kbGVzIGFsbCByb3V0ZXMgcmVxdWlyZWRcbiAgICogYnkgZnJlc2gsIGluY2x1ZGluZyBzdGF0aWMgZmlsZXMuXG4gICAqL1xuICBoYW5kbGVyKCk6IFJlcXVlc3RIYW5kbGVyIHtcbiAgICBjb25zdCBpbm5lciA9IHJvdXRlci5yb3V0ZXI8Um91dGVyU3RhdGU+KC4uLnRoaXMuI2hhbmRsZXJzKCkpO1xuICAgIGNvbnN0IHdpdGhNaWRkbGV3YXJlcyA9IHRoaXMuI2NvbXBvc2VNaWRkbGV3YXJlcyh0aGlzLiNtaWRkbGV3YXJlcyk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZXIocmVxOiBSZXF1ZXN0LCBjb25uSW5mbzogQ29ubkluZm8pIHtcbiAgICAgIC8vIFJlZGlyZWN0IHJlcXVlc3RzIHRoYXQgZW5kIHdpdGggYSB0cmFpbGluZyBzbGFzaFxuICAgICAgLy8gdG8gdGhlaXIgbm9uLXRyYWlsaW5nIHNsYXNoIGNvdW50ZXJwYXJ0LlxuICAgICAgLy8gRXg6IC9hYm91dC8gLT4gL2Fib3V0XG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwpO1xuICAgICAgaWYgKHVybC5wYXRobmFtZS5sZW5ndGggPiAxICYmIHVybC5wYXRobmFtZS5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgdXJsLnBhdGhuYW1lID0gdXJsLnBhdGhuYW1lLnNsaWNlKDAsIC0xKTtcbiAgICAgICAgcmV0dXJuIFJlc3BvbnNlLnJlZGlyZWN0KHVybC5ocmVmLCBTdGF0dXMuVGVtcG9yYXJ5UmVkaXJlY3QpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHdpdGhNaWRkbGV3YXJlcyhyZXEsIGNvbm5JbmZvLCBpbm5lcik7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZGVudGlmeSB3aGljaCBtaWRkbGV3YXJlcyBzaG91bGQgYmUgYXBwbGllZCBmb3IgYSByZXF1ZXN0LFxuICAgKiBjaGFpbiB0aGVtIGFuZCByZXR1cm4gYSBoYW5kbGVyIHJlc3BvbnNlXG4gICAqL1xuICAjY29tcG9zZU1pZGRsZXdhcmVzKG1pZGRsZXdhcmVzOiBNaWRkbGV3YXJlUm91dGVbXSkge1xuICAgIHJldHVybiAoXG4gICAgICByZXE6IFJlcXVlc3QsXG4gICAgICBjb25uSW5mbzogQ29ubkluZm8sXG4gICAgICBpbm5lcjogcm91dGVyLkhhbmRsZXI8Um91dGVyU3RhdGU+LFxuICAgICkgPT4ge1xuICAgICAgLy8gaWRlbnRpZnkgbWlkZGxld2FyZXMgdG8gYXBwbHksIGlmIGFueS5cbiAgICAgIC8vIG1pZGRsZXdhcmVzIHNob3VsZCBiZSBhbHJlYWR5IHNvcnRlZCBmcm9tIGRlZXBlc3QgdG8gc2hhbGxvdyBsYXllclxuICAgICAgY29uc3QgbXdzID0gc2VsZWN0TWlkZGxld2FyZXMocmVxLnVybCwgbWlkZGxld2FyZXMpO1xuXG4gICAgICBjb25zdCBoYW5kbGVyczogKCgpID0+IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT4pW10gPSBbXTtcblxuICAgICAgY29uc3QgY3R4ID0ge1xuICAgICAgICBuZXh0KCkge1xuICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVycy5zaGlmdCgpITtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGhhbmRsZXIoKSk7XG4gICAgICAgIH0sXG4gICAgICAgIC4uLmNvbm5JbmZvLFxuICAgICAgICBzdGF0ZToge30sXG4gICAgICB9O1xuXG4gICAgICBmb3IgKGNvbnN0IG13IG9mIG13cykge1xuICAgICAgICBoYW5kbGVycy5wdXNoKCgpID0+IG13LmhhbmRsZXIocmVxLCBjdHgpKTtcbiAgICAgIH1cblxuICAgICAgaGFuZGxlcnMucHVzaCgoKSA9PiBpbm5lcihyZXEsIGN0eCkpO1xuXG4gICAgICBjb25zdCBoYW5kbGVyID0gaGFuZGxlcnMuc2hpZnQoKSE7XG4gICAgICByZXR1cm4gaGFuZGxlcigpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBmdW5jdGlvbiByZXR1cm5zIGFsbCByb3V0ZXMgcmVxdWlyZWQgYnkgZnJlc2ggYXMgYW4gZXh0ZW5kZWRcbiAgICogcGF0aC10by1yZWdleCwgdG8gaGFuZGxlciBtYXBwaW5nLlxuICAgKi9cbiAgI2hhbmRsZXJzKCk6IFtcbiAgICByb3V0ZXIuUm91dGVzPFJvdXRlclN0YXRlPixcbiAgICByb3V0ZXIuSGFuZGxlcjxSb3V0ZXJTdGF0ZT4sXG4gICAgcm91dGVyLkVycm9ySGFuZGxlcjxSb3V0ZXJTdGF0ZT4sXG4gIF0ge1xuICAgIGNvbnN0IHJvdXRlczogcm91dGVyLlJvdXRlczxSb3V0ZXJTdGF0ZT4gPSB7fTtcblxuICAgIHJvdXRlc1tgJHtJTlRFUk5BTF9QUkVGSVh9JHtKU19QUkVGSVh9LyR7QlVJTERfSUR9LzpwYXRoKmBdID0gdGhpc1xuICAgICAgLiNidW5kbGVBc3NldFJvdXRlKCk7XG5cbiAgICBpZiAodGhpcy4jZGV2KSB7XG4gICAgICByb3V0ZXNbUkVGUkVTSF9KU19VUkxdID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBqcyA9XG4gICAgICAgICAgYGxldCByZWxvYWRpbmcgPSBmYWxzZTsgY29uc3QgYnVpbGRJZCA9IFwiJHtCVUlMRF9JRH1cIjsgbmV3IEV2ZW50U291cmNlKFwiJHtBTElWRV9VUkx9XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIChlKSA9PiB7IGlmIChlLmRhdGEgIT09IGJ1aWxkSWQgJiYgIXJlbG9hZGluZykgeyByZWxvYWRpbmcgPSB0cnVlOyBsb2NhdGlvbi5yZWxvYWQoKTsgfSB9KTtgO1xuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShqcyksIHtcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcImNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2phdmFzY3JpcHQ7IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICByb3V0ZXNbQUxJVkVfVVJMXSA9ICgpID0+IHtcbiAgICAgICAgbGV0IHRpbWVySWQ6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgYm9keSA9IG5ldyBSZWFkYWJsZVN0cmVhbSh7XG4gICAgICAgICAgc3RhcnQoY29udHJvbGxlcikge1xuICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGBkYXRhOiAke0JVSUxEX0lEfVxcbnJldHJ5OiAxMDBcXG5cXG5gKTtcbiAgICAgICAgICAgIHRpbWVySWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShgZGF0YTogJHtCVUlMRF9JRH1cXG5cXG5gKTtcbiAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY2FuY2VsKCkge1xuICAgICAgICAgICAgaWYgKHRpbWVySWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVySWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKGJvZHkucGlwZVRocm91Z2gobmV3IFRleHRFbmNvZGVyU3RyZWFtKCkpLCB7XG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJjb250ZW50LXR5cGVcIjogXCJ0ZXh0L2V2ZW50LXN0cmVhbVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIHN0YXRpYyBmaWxlIHJvdXRlcy5cbiAgICAvLyBlYWNoIGZpbGVzIGhhcyAyIHN0YXRpYyByb3V0ZXM6XG4gICAgLy8gLSBvbmUgc2VydmluZyB0aGUgZmlsZSBhdCBpdHMgbG9jYXRpb24gd2l0aG91dCBhIFwiY2FjaGUgYnVyc3RpbmdcIiBtZWNoYW5pc21cbiAgICAvLyAtIG9uZSBjb250YWluaW5nIHRoZSBCVUlMRF9JRCBpbiB0aGUgcGF0aCB0aGF0IGNhbiBiZSBjYWNoZWRcbiAgICBmb3IgKFxuICAgICAgY29uc3QgeyBsb2NhbFVybCwgcGF0aCwgc2l6ZSwgY29udGVudFR5cGUsIGV0YWcgfSBvZiB0aGlzLiNzdGF0aWNGaWxlc1xuICAgICkge1xuICAgICAgY29uc3Qgcm91dGUgPSBzYW5pdGl6ZVBhdGhUb1JlZ2V4KHBhdGgpO1xuICAgICAgcm91dGVzW2BHRVRAJHtyb3V0ZX1gXSA9IHRoaXMuI3N0YXRpY0ZpbGVIYW5kbGVyKFxuICAgICAgICBsb2NhbFVybCxcbiAgICAgICAgc2l6ZSxcbiAgICAgICAgY29udGVudFR5cGUsXG4gICAgICAgIGV0YWcsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGdlblJlbmRlciA9IDxEYXRhID0gdW5kZWZpbmVkPihcbiAgICAgIHJvdXRlOiBSb3V0ZTxEYXRhPiB8IFVua25vd25QYWdlIHwgRXJyb3JQYWdlLFxuICAgICAgc3RhdHVzOiBudW1iZXIsXG4gICAgKSA9PiB7XG4gICAgICBjb25zdCBpbXBvcnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgaWYgKHRoaXMuI2Rldikge1xuICAgICAgICBpbXBvcnRzLnB1c2goUkVGUkVTSF9KU19VUkwpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChcbiAgICAgICAgcmVxOiBSZXF1ZXN0LFxuICAgICAgICBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICAgICAgIGVycm9yPzogdW5rbm93bixcbiAgICAgICkgPT4ge1xuICAgICAgICByZXR1cm4gYXN5bmMgKGRhdGE/OiBEYXRhKSA9PiB7XG4gICAgICAgICAgaWYgKHJvdXRlLmNvbXBvbmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHBhZ2UgZG9lcyBub3QgaGF2ZSBhIGNvbXBvbmVudCB0byByZW5kZXIuXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiByb3V0ZS5jb21wb25lbnQgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICAgcm91dGUuY29tcG9uZW50LmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiQXN5bmNGdW5jdGlvblwiXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIFwiQXN5bmMgY29tcG9uZW50cyBhcmUgbm90IHN1cHBvcnRlZC4gRmV0Y2ggZGF0YSBpbnNpZGUgb2YgYSByb3V0ZSBoYW5kbGVyLCBhcyBkZXNjcmliZWQgaW4gdGhlIGRvY3M6IGh0dHBzOi8vZnJlc2guZGVuby5kZXYvZG9jcy9nZXR0aW5nLXN0YXJ0ZWQvZmV0Y2hpbmctZGF0YVwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBwcmVsb2Fkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgaW50ZXJuYWxSZW5kZXIoe1xuICAgICAgICAgICAgcm91dGUsXG4gICAgICAgICAgICBpc2xhbmRzOiB0aGlzLiNpc2xhbmRzLFxuICAgICAgICAgICAgYXBwOiB0aGlzLiNhcHAsXG4gICAgICAgICAgICBpbXBvcnRzLFxuICAgICAgICAgICAgcHJlbG9hZHMsXG4gICAgICAgICAgICByZW5kZXJGbjogdGhpcy4jcmVuZGVyRm4sXG4gICAgICAgICAgICB1cmw6IG5ldyBVUkwocmVxLnVybCksXG4gICAgICAgICAgICBwYXJhbXMsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgICAgXCJjb250ZW50LXR5cGVcIjogXCJ0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgY29uc3QgW2JvZHksIGNzcF0gPSByZXNwO1xuICAgICAgICAgIGlmIChjc3ApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLiNkZXYpIHtcbiAgICAgICAgICAgICAgY3NwLmRpcmVjdGl2ZXMuY29ubmVjdFNyYyA9IFtcbiAgICAgICAgICAgICAgICAuLi4oY3NwLmRpcmVjdGl2ZXMuY29ubmVjdFNyYyA/PyBbXSksXG4gICAgICAgICAgICAgICAgU0VMRixcbiAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHNlcmlhbGl6ZUNTUERpcmVjdGl2ZXMoY3NwLmRpcmVjdGl2ZXMpO1xuICAgICAgICAgICAgaWYgKGNzcC5yZXBvcnRPbmx5KSB7XG4gICAgICAgICAgICAgIGhlYWRlcnNbXCJjb250ZW50LXNlY3VyaXR5LXBvbGljeS1yZXBvcnQtb25seVwiXSA9IGRpcmVjdGl2ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGhlYWRlcnNbXCJjb250ZW50LXNlY3VyaXR5LXBvbGljeVwiXSA9IGRpcmVjdGl2ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShib2R5LCB7IHN0YXR1cywgaGVhZGVycyB9KTtcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGhpcy4jcm91dGVzKSB7XG4gICAgICBjb25zdCBjcmVhdGVSZW5kZXIgPSBnZW5SZW5kZXIocm91dGUsIFN0YXR1cy5PSyk7XG4gICAgICBpZiAodHlwZW9mIHJvdXRlLmhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByb3V0ZXNbcm91dGUucGF0dGVybl0gPSAocmVxLCBjdHgsIHBhcmFtcykgPT5cbiAgICAgICAgICAocm91dGUuaGFuZGxlciBhcyBIYW5kbGVyKShyZXEsIHtcbiAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgIHBhcmFtcyxcbiAgICAgICAgICAgIHJlbmRlcjogY3JlYXRlUmVuZGVyKHJlcSwgcGFyYW1zKSxcbiAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3QgW21ldGhvZCwgaGFuZGxlcl0gb2YgT2JqZWN0LmVudHJpZXMocm91dGUuaGFuZGxlcikpIHtcbiAgICAgICAgICByb3V0ZXNbYCR7bWV0aG9kfUAke3JvdXRlLnBhdHRlcm59YF0gPSAocmVxLCBjdHgsIHBhcmFtcykgPT5cbiAgICAgICAgICAgIGhhbmRsZXIocmVxLCB7XG4gICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgcGFyYW1zLFxuICAgICAgICAgICAgICByZW5kZXI6IGNyZWF0ZVJlbmRlcihyZXEsIHBhcmFtcyksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHVua25vd25IYW5kbGVyUmVuZGVyID0gZ2VuUmVuZGVyKHRoaXMuI25vdEZvdW5kLCBTdGF0dXMuTm90Rm91bmQpO1xuICAgIGNvbnN0IHVua25vd25IYW5kbGVyOiByb3V0ZXIuSGFuZGxlcjxSb3V0ZXJTdGF0ZT4gPSAoXG4gICAgICByZXEsXG4gICAgICBjdHgsXG4gICAgKSA9PlxuICAgICAgdGhpcy4jbm90Rm91bmQuaGFuZGxlcihcbiAgICAgICAgcmVxLFxuICAgICAgICB7XG4gICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgIHJlbmRlcjogdW5rbm93bkhhbmRsZXJSZW5kZXIocmVxLCB7fSksXG4gICAgICAgIH0sXG4gICAgICApO1xuXG4gICAgY29uc3QgZXJyb3JIYW5kbGVyUmVuZGVyID0gZ2VuUmVuZGVyKFxuICAgICAgdGhpcy4jZXJyb3IsXG4gICAgICBTdGF0dXMuSW50ZXJuYWxTZXJ2ZXJFcnJvcixcbiAgICApO1xuICAgIGNvbnN0IGVycm9ySGFuZGxlcjogcm91dGVyLkVycm9ySGFuZGxlcjxSb3V0ZXJTdGF0ZT4gPSAoXG4gICAgICByZXEsXG4gICAgICBjdHgsXG4gICAgICBlcnJvcixcbiAgICApID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiJWNBbiBlcnJvciBvY2N1cnJlZCBkdXJpbmcgcm91dGUgaGFuZGxpbmcgb3IgcGFnZSByZW5kZXJpbmcuXCIsXG4gICAgICAgIFwiY29sb3I6cmVkXCIsXG4gICAgICAgIGVycm9yLFxuICAgICAgKTtcbiAgICAgIHJldHVybiB0aGlzLiNlcnJvci5oYW5kbGVyKFxuICAgICAgICByZXEsXG4gICAgICAgIHtcbiAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgcmVuZGVyOiBlcnJvckhhbmRsZXJSZW5kZXIocmVxLCB7fSwgZXJyb3IpLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFtyb3V0ZXMsIHVua25vd25IYW5kbGVyLCBlcnJvckhhbmRsZXJdO1xuICB9XG5cbiAgI3N0YXRpY0ZpbGVIYW5kbGVyKFxuICAgIGxvY2FsVXJsOiBVUkwsXG4gICAgc2l6ZTogbnVtYmVyLFxuICAgIGNvbnRlbnRUeXBlOiBzdHJpbmcsXG4gICAgZXRhZzogc3RyaW5nLFxuICApOiByb3V0ZXIuTWF0Y2hIYW5kbGVyIHtcbiAgICByZXR1cm4gYXN5bmMgKHJlcTogUmVxdWVzdCkgPT4ge1xuICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsKTtcbiAgICAgIGNvbnN0IGtleSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KEFTU0VUX0NBQ0hFX0JVU1RfS0VZKTtcbiAgICAgIGlmIChrZXkgIT09IG51bGwgJiYgQlVJTERfSUQgIT09IGtleSkge1xuICAgICAgICB1cmwuc2VhcmNoUGFyYW1zLmRlbGV0ZShBU1NFVF9DQUNIRV9CVVNUX0tFWSk7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uID0gdXJsLnBhdGhuYW1lICsgdXJsLnNlYXJjaDtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIlwiLCB7XG4gICAgICAgICAgc3RhdHVzOiAzMDcsXG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJjb250ZW50LXR5cGVcIjogXCJ0ZXh0L3BsYWluXCIsXG4gICAgICAgICAgICBsb2NhdGlvbixcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyh7XG4gICAgICAgIFwiY29udGVudC10eXBlXCI6IGNvbnRlbnRUeXBlLFxuICAgICAgICBldGFnLFxuICAgICAgICB2YXJ5OiBcIklmLU5vbmUtTWF0Y2hcIixcbiAgICAgIH0pO1xuICAgICAgaWYgKGtleSAhPT0gbnVsbCkge1xuICAgICAgICBoZWFkZXJzLnNldChcIkNhY2hlLUNvbnRyb2xcIiwgXCJwdWJsaWMsIG1heC1hZ2U9MzE1MzYwMDAsIGltbXV0YWJsZVwiKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGlmTm9uZU1hdGNoID0gcmVxLmhlYWRlcnMuZ2V0KFwiaWYtbm9uZS1tYXRjaFwiKTtcbiAgICAgIGlmIChpZk5vbmVNYXRjaCA9PT0gZXRhZyB8fCBpZk5vbmVNYXRjaCA9PT0gXCJXL1wiICsgZXRhZykge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHsgc3RhdHVzOiAzMDQsIGhlYWRlcnMgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmaWxlID0gYXdhaXQgRGVuby5vcGVuKGxvY2FsVXJsKTtcbiAgICAgICAgaGVhZGVycy5zZXQoXCJjb250ZW50LWxlbmd0aFwiLCBTdHJpbmcoc2l6ZSkpO1xuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKGZpbGUucmVhZGFibGUsIHsgaGVhZGVycyB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSByb3V0ZXIgdGhhdCBjb250YWlucyBhbGwgZnJlc2ggcm91dGVzLiBTaG91bGQgYmUgbW91bnRlZCBhdFxuICAgKiBjb25zdGFudHMuSU5URVJOQUxfUFJFRklYXG4gICAqL1xuICAjYnVuZGxlQXNzZXRSb3V0ZSA9ICgpOiByb3V0ZXIuTWF0Y2hIYW5kbGVyID0+IHtcbiAgICByZXR1cm4gYXN5bmMgKF9yZXEsIF9jdHgsIHBhcmFtcykgPT4ge1xuICAgICAgY29uc3QgcGF0aCA9IGAvJHtwYXJhbXMucGF0aH1gO1xuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuI2J1bmRsZXIuZ2V0KHBhdGgpO1xuICAgICAgbGV0IHJlcztcbiAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyh7XG4gICAgICAgICAgXCJDYWNoZS1Db250cm9sXCI6IFwicHVibGljLCBtYXgtYWdlPTYwNDgwMCwgaW1tdXRhYmxlXCIsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gdHlwZUJ5RXh0ZW5zaW9uKGV4dG5hbWUocGF0aCkpO1xuICAgICAgICBpZiAoY29udGVudFR5cGUpIHtcbiAgICAgICAgICBoZWFkZXJzLnNldChcIkNvbnRlbnQtVHlwZVwiLCBjb250ZW50VHlwZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXMgPSBuZXcgUmVzcG9uc2UoZmlsZSwge1xuICAgICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzID8/IG5ldyBSZXNwb25zZShudWxsLCB7XG4gICAgICAgIHN0YXR1czogNDA0LFxuICAgICAgfSk7XG4gICAgfTtcbiAgfTtcbn1cblxuY29uc3QgREVGQVVMVF9SRU5ERVJfRk46IFJlbmRlckZ1bmN0aW9uID0gKF9jdHgsIHJlbmRlcikgPT4ge1xuICByZW5kZXIoKTtcbn07XG5cbmNvbnN0IERFRkFVTFRfQVBQOiBBcHBNb2R1bGUgPSB7XG4gIGRlZmF1bHQ6ICh7IENvbXBvbmVudCB9KSA9PiBoKENvbXBvbmVudCwge30pLFxufTtcblxuY29uc3QgREVGQVVMVF9OT1RfRk9VTkQ6IFVua25vd25QYWdlID0ge1xuICBwYXR0ZXJuOiBcIlwiLFxuICB1cmw6IFwiXCIsXG4gIG5hbWU6IFwiXzQwNFwiLFxuICBoYW5kbGVyOiAocmVxKSA9PiByb3V0ZXIuZGVmYXVsdE90aGVySGFuZGxlcihyZXEpLFxuICBjc3A6IGZhbHNlLFxufTtcblxuY29uc3QgREVGQVVMVF9FUlJPUjogRXJyb3JQYWdlID0ge1xuICBwYXR0ZXJuOiBcIlwiLFxuICB1cmw6IFwiXCIsXG4gIG5hbWU6IFwiXzUwMFwiLFxuICBjb21wb25lbnQ6IERlZmF1bHRFcnJvckhhbmRsZXIsXG4gIGhhbmRsZXI6IChfcmVxLCBjdHgpID0+IGN0eC5yZW5kZXIoKSxcbiAgY3NwOiBmYWxzZSxcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgbGlzdCBvZiBtaWRkbGV3YXJlcyB0aGF0IG5lZWRzIHRvIGJlIGFwcGxpZWQgZm9yIHJlcXVlc3QgdXJsXG4gKiBAcGFyYW0gdXJsIHRoZSByZXF1ZXN0IHVybFxuICogQHBhcmFtIG1pZGRsZXdhcmVzIEFycmF5IG9mIG1pZGRsZXdhcmVzIGhhbmRsZXJzIGFuZCB0aGVpciByb3V0ZXMgYXMgcGF0aC10by1yZWdleHAgc3R5bGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlbGVjdE1pZGRsZXdhcmVzKHVybDogc3RyaW5nLCBtaWRkbGV3YXJlczogTWlkZGxld2FyZVJvdXRlW10pIHtcbiAgY29uc3Qgc2VsZWN0ZWRNd3M6IE1pZGRsZXdhcmVbXSA9IFtdO1xuICBjb25zdCByZXFVUkwgPSBuZXcgVVJMKHVybCk7XG5cbiAgZm9yIChjb25zdCB7IGNvbXBpbGVkUGF0dGVybiwgaGFuZGxlciB9IG9mIG1pZGRsZXdhcmVzKSB7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZWRQYXR0ZXJuLmV4ZWMocmVxVVJMKTtcbiAgICBpZiAocmVzKSB7XG4gICAgICBzZWxlY3RlZE13cy5wdXNoKHsgaGFuZGxlciB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2VsZWN0ZWRNd3M7XG59XG5cbi8qKlxuICogU29ydCBwYWdlcyBieSB0aGVpciByZWxhdGl2ZSByb3V0aW5nIHByaW9yaXR5LCBiYXNlZCBvbiB0aGUgcGFydHMgaW4gdGhlXG4gKiByb3V0ZSBtYXRjaGVyXG4gKi9cbmZ1bmN0aW9uIHNvcnRSb3V0ZXM8VCBleHRlbmRzIHsgcGF0dGVybjogc3RyaW5nIH0+KHJvdXRlczogVFtdKSB7XG4gIHJvdXRlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgY29uc3QgcGFydHNBID0gYS5wYXR0ZXJuLnNwbGl0KFwiL1wiKTtcbiAgICBjb25zdCBwYXJ0c0IgPSBiLnBhdHRlcm4uc3BsaXQoXCIvXCIpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5tYXgocGFydHNBLmxlbmd0aCwgcGFydHNCLmxlbmd0aCk7IGkrKykge1xuICAgICAgY29uc3QgcGFydEEgPSBwYXJ0c0FbaV07XG4gICAgICBjb25zdCBwYXJ0QiA9IHBhcnRzQltpXTtcbiAgICAgIGlmIChwYXJ0QSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gLTE7XG4gICAgICBpZiAocGFydEIgPT09IHVuZGVmaW5lZCkgcmV0dXJuIDE7XG4gICAgICBpZiAocGFydEEgPT09IHBhcnRCKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHByaW9yaXR5QSA9IHBhcnRBLnN0YXJ0c1dpdGgoXCI6XCIpID8gcGFydEEuZW5kc1dpdGgoXCIqXCIpID8gMCA6IDEgOiAyO1xuICAgICAgY29uc3QgcHJpb3JpdHlCID0gcGFydEIuc3RhcnRzV2l0aChcIjpcIikgPyBwYXJ0Qi5lbmRzV2l0aChcIipcIikgPyAwIDogMSA6IDI7XG4gICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5taW4ocHJpb3JpdHlCIC0gcHJpb3JpdHlBLCAxKSwgLTEpO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSk7XG59XG5cbi8qKiBUcmFuc2Zvcm0gYSBmaWxlc3lzdGVtIFVSTCBwYXRoIHRvIGEgYHBhdGgtdG8tcmVnZXhgIHN0eWxlIG1hdGNoZXIuICovXG5mdW5jdGlvbiBwYXRoVG9QYXR0ZXJuKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHBhcnRzID0gcGF0aC5zcGxpdChcIi9cIik7XG4gIGlmIChwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSA9PT0gXCJpbmRleFwiKSB7XG4gICAgcGFydHMucG9wKCk7XG4gIH1cbiAgY29uc3Qgcm91dGUgPSBcIi9cIiArIHBhcnRzXG4gICAgLm1hcCgocGFydCkgPT4ge1xuICAgICAgaWYgKHBhcnQuc3RhcnRzV2l0aChcIlsuLi5cIikgJiYgcGFydC5lbmRzV2l0aChcIl1cIikpIHtcbiAgICAgICAgcmV0dXJuIGA6JHtwYXJ0LnNsaWNlKDQsIHBhcnQubGVuZ3RoIC0gMSl9KmA7XG4gICAgICB9XG4gICAgICBpZiAocGFydC5zdGFydHNXaXRoKFwiW1wiKSAmJiBwYXJ0LmVuZHNXaXRoKFwiXVwiKSkge1xuICAgICAgICByZXR1cm4gYDoke3BhcnQuc2xpY2UoMSwgcGFydC5sZW5ndGggLSAxKX1gO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhcnQ7XG4gICAgfSlcbiAgICAuam9pbihcIi9cIik7XG4gIHJldHVybiByb3V0ZTtcbn1cblxuLy8gTm9ybWFsaXplIGEgcGF0aCBmb3IgdXNlIGluIGEgVVJMLiBSZXR1cm5zIG51bGwgaWYgdGhlIHBhdGggaXMgdW5wYXJzYWJsZS5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVVUkxQYXRoKHBhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IHBhdGhVcmwgPSBuZXcgVVJMKFwiZmlsZTovLy9cIik7XG4gICAgcGF0aFVybC5wYXRobmFtZSA9IHBhdGg7XG4gICAgcmV0dXJuIHBhdGhVcmwucGF0aG5hbWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplUGF0aFRvUmVnZXgocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGhcbiAgICAucmVwbGFjZUFsbChcIlxcKlwiLCBcIlxcXFwqXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJcXCtcIiwgXCJcXFxcK1wiKVxuICAgIC5yZXBsYWNlQWxsKFwiXFw/XCIsIFwiXFxcXD9cIilcbiAgICAucmVwbGFjZUFsbChcIlxce1wiLCBcIlxcXFx7XCIpXG4gICAgLnJlcGxhY2VBbGwoXCJcXH1cIiwgXCJcXFxcfVwiKVxuICAgIC5yZXBsYWNlQWxsKFwiXFwoXCIsIFwiXFxcXChcIilcbiAgICAucmVwbGFjZUFsbChcIlxcKVwiLCBcIlxcXFwpXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJcXDpcIiwgXCJcXFxcOlwiKTtcbn1cblxuZnVuY3Rpb24gdG9QYXNjYWxDYXNlKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoXG4gICAgLyheXFx3fC1cXHcpL2csXG4gICAgKHN1YnN0cmluZykgPT4gc3Vic3RyaW5nLnJlcGxhY2UoLy0vLCBcIlwiKS50b1VwcGVyQ2FzZSgpLFxuICApO1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZUlzbGFuZE5hbWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZmlsZU5hbWUgPSBuYW1lLnJlcGxhY2UoXCIvXCIsIFwiXCIpO1xuICByZXR1cm4gdG9QYXNjYWxDYXNlKGZpbGVOYW1lKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplQ1NQRGlyZWN0aXZlcyhjc3A6IENvbnRlbnRTZWN1cml0eVBvbGljeURpcmVjdGl2ZXMpOiBzdHJpbmcge1xuICByZXR1cm4gT2JqZWN0LmVudHJpZXMoY3NwKVxuICAgIC5maWx0ZXIoKFtfa2V5LCB2YWx1ZV0pID0+IHZhbHVlICE9PSB1bmRlZmluZWQpXG4gICAgLm1hcCgoW2ssIHZdOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV0pID0+IHtcbiAgICAgIC8vIFR1cm4gY2FtZWwgY2FzZSBpbnRvIHNuYWtlIGNhc2UuXG4gICAgICBjb25zdCBrZXkgPSBrLnJlcGxhY2UoL1tBLVpdL2csIChtKSA9PiBgLSR7bS50b0xvd2VyQ2FzZSgpfWApO1xuICAgICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHYpID8gdi5qb2luKFwiIFwiKSA6IHY7XG4gICAgICByZXR1cm4gYCR7a2V5fSAke3ZhbHVlfWA7XG4gICAgfSlcbiAgICAuam9pbihcIjsgXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWlkZGxld2FyZVBhdGhUb1BhdHRlcm4oYmFzZVJvdXRlOiBzdHJpbmcpIHtcbiAgYmFzZVJvdXRlID0gYmFzZVJvdXRlLnNsaWNlKDAsIC1cIl9taWRkbGV3YXJlXCIubGVuZ3RoKTtcbiAgbGV0IHBhdHRlcm4gPSBwYXRoVG9QYXR0ZXJuKGJhc2VSb3V0ZSk7XG4gIGlmIChwYXR0ZXJuLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnNsaWNlKDAsIC0xKSArIFwiey8qfT9cIjtcbiAgfVxuICBjb25zdCBjb21waWxlZFBhdHRlcm4gPSBuZXcgVVJMUGF0dGVybih7IHBhdGhuYW1lOiBwYXR0ZXJuIH0pO1xuICByZXR1cm4geyBwYXR0ZXJuLCBjb21waWxlZFBhdHRlcm4gfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUVFLE9BQU8sRUFDUCxXQUFXLEVBRVgsTUFBTSxFQUNOLE1BQU0sRUFDTixTQUFTLEVBQ1QsZUFBZSxFQUNmLElBQUksUUFDQyxXQUFXLENBQUM7QUFDbkIsU0FBUyxDQUFDLFFBQVEsUUFBUSxDQUFDO0FBRTNCLFNBQVMsT0FBTyxRQUFRLGFBQWEsQ0FBQztBQUN0QyxTQUFTLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGNBQWMsUUFBUSxnQkFBZ0IsQ0FBQztBQUNoRixPQUFPLG1CQUFtQixNQUFNLDBCQUEwQixDQUFDO0FBaUIzRCxTQUFTLE1BQU0sSUFBSSxjQUFjLFFBQVEsY0FBYyxDQUFDO0FBQ3hELFNBQTBDLElBQUksUUFBUSxtQkFBbUIsQ0FBQztBQUMxRSxTQUFTLG9CQUFvQixFQUFFLGVBQWUsUUFBUSxxQkFBcUIsQ0FBQztBQWtCNUUsT0FBTyxNQUFNLGFBQWE7SUFDeEIsQ0FBQyxHQUFHLENBQVU7SUFDZCxDQUFDLE1BQU0sQ0FBVTtJQUNqQixDQUFDLE9BQU8sQ0FBVztJQUNuQixDQUFDLFdBQVcsQ0FBZTtJQUMzQixDQUFDLE9BQU8sQ0FBVTtJQUNsQixDQUFDLFFBQVEsQ0FBaUI7SUFDMUIsQ0FBQyxXQUFXLENBQW9CO0lBQ2hDLENBQUMsR0FBRyxDQUFZO0lBQ2hCLENB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