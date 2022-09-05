// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/** Provides utility functions for media types.
 *
 * This API is inspired by the GoLang [`mime`](https://pkg.go.dev/mime) package
 * and [jshttp/mime-types](https://github.com/jshttp/mime-types).
 *
 * @module
 */ import db from "./vendor/mime-db.v1.52.0.ts";
import { consumeMediaParam, decode2331Encoding, isIterator, isToken, needsEncoding } from "./_util.ts";
/** A map of extensions for a given media type. */ export const extensions = new Map();
/** A map of the media type for a given extension */ export const types = new Map();
/** Internal function to populate the maps based on the Mime DB. */ (function populateMaps() {
    const preference = [
        "nginx",
        "apache",
        undefined,
        "iana"
    ];
    for (const type of Object.keys(db)){
        const mime = db[type];
        const exts = mime.extensions;
        if (!exts || !exts.length) {
            continue;
        }
        // @ts-ignore work around denoland/dnt#148
        extensions.set(type, exts);
        for (const ext of exts){
            const current = types.get(ext);
            if (current) {
                const from = preference.indexOf(db[current].source);
                const to = preference.indexOf(mime.source);
                if (current !== "application/octet-stream" && (from > to || // @ts-ignore work around denoland/dnt#148
                (from === to && current.startsWith("application/")))) {
                    continue;
                }
            }
            types.set(ext, type);
        }
    }
})();
/** Given an extension or media type, return a full `Content-Type` or
 * `Content-Disposition` header value.
 *
 * The function will treat the `extensionOrType` as a media type when it
 * contains a `/`, otherwise it will process it as an extension, with or without
 * the leading `.`.
 *
 * Returns `undefined` if unable to resolve the media type.
 *
 * ### Examples
 *
 * ```ts
 * import { contentType } from "https://deno.land/std@$STD_VERSION/media_types/mod.ts";
 *
 * contentType(".json"); // `application/json; charset=UTF-8`
 * contentType("text/html"); // `text/html; charset=UTF-8`
 * contentType("text/html; charset=UTF-8"); // `text/html; charset=UTF-8`
 * contentType("txt"); // `text/plain; charset=UTF-8`
 * contentType("foo"); // undefined
 * contentType("file.json"); // undefined
 * ```
 */ export function contentType(extensionOrType) {
    try {
        const [mediaType, params = {}] = extensionOrType.includes("/") ? parseMediaType(extensionOrType) : [
            typeByExtension(extensionOrType),
            undefined
        ];
        if (!mediaType) {
            return undefined;
        }
        if (!("charset" in params)) {
            const charset = getCharset(mediaType);
            if (charset) {
                params.charset = charset;
            }
        }
        return formatMediaType(mediaType, params);
    } catch  {
    // just swallow returning undefined
    }
    return undefined;
}
/** For a given media type, return the most relevant extension, or `undefined`
 * if no extension can be found.
 *
 * Extensions are returned without a leading `.`.
 *
 * ### Examples
 *
 * ```ts
 * import { extension } from "https://deno.land/std@$STD_VERSION/media_types/mod.ts";
 *
 * extension("text/plain"); // `txt`
 * extension("application/json"); // `json`
 * extension("text/html; charset=UTF-8"); // `html`
 * extension("application/foo"); // undefined
 * ```
 */ export function extension(type) {
    const exts = extensionsByType(type);
    if (exts) {
        return exts[0];
    }
    return undefined;
}
/** Returns the extensions known to be associated with the media type `type`.
 * The returned extensions will each begin with a leading dot, as in `.html`.
 *
 * When `type` has no associated extensions, the function returns `undefined`.
 *
 * Extensions are returned without a leading `.`.
 *
 * ### Examples
 *
 * ```ts
 * import { extensionsByType } from "https://deno.land/std@$STD_VERSION/media_types/mod.ts";
 *
 * extensionsByType("application/json"); // ["js", "mjs"]
 * extensionsByType("text/html; charset=UTF-8"); // ["html", "htm", "shtml"]
 * extensionsByType("application/foo"); // undefined
 * ```
 */ export function extensionsByType(type) {
    try {
        const [mediaType] = parseMediaType(type);
        return extensions.get(mediaType);
    } catch  {
    // just swallow errors, returning undefined
    }
}
/** Serializes the media type and the optional parameters as a media type
 * conforming to RFC 2045 and RFC 2616.
 *
 * The type and parameter names are written in lower-case.
 *
 * When any of the arguments results in a standard violation then the return
 * value will be an empty string (`""`).
 *
 * ### Example
 *
 * ```ts
 * import { formatMediaType } from "https://deno.land/std@$STD_VERSION/media_types/mod.ts";
 *
 * formatMediaType("text/plain", { charset: "UTF-8" }); // `text/plain; charset=UTF-8`
 * ```
 */ export function formatMediaType(type, param) {
    let b = "";
    const [major, sub] = type.split("/");
    if (!sub) {
        if (!isToken(type)) {
            return "";
        }
        b += type.toLowerCase();
    } else {
        if (!isToken(major) || !isToken(sub)) {
            return "";
        }
        b += `${major.toLowerCase()}/${sub.toLowerCase()}`;
    }
    if (param) {
        param = isIterator(param) ? Object.fromEntries(param) : param;
        const attrs = Object.keys(param);
        attrs.sort();
        for (const attribute of attrs){
            if (!isToken(attribute)) {
                return "";
            }
            const value = param[attribute];
            b += `; ${attribute.toLowerCase()}`;
            const needEnc = needsEncoding(value);
            if (needEnc) {
                b += "*";
            }
            b += "=";
            if (needEnc) {
                b += `utf-8''${encodeURIComponent(value)}`;
                continue;
            }
            if (isToken(value)) {
                b += value;
                continue;
            }
            b += `"${value.replace(/["\\]/gi, (m)=>`\\${m}`)}"`;
        }
    }
    return b;
}
/** Given a media type or header value, identify the encoding charset. If the
 * charset cannot be determined, the function returns `undefined`.
 *
 * ### Examples
 *
 * ```ts
 * import { getCharset } from "https://deno.land/std@$STD_VERSION/media_types/mod.ts";
 *
 * getCharset("text/plain"); // `UTF-8`
 * getCharset("application/foo"); // undefined
 * getCharset("application/news-checkgroups"); // `US-ASCII`
 * getCharset("application/news-checkgroups; charset=UTF-8"); // `UTF-8`
 * ```
 */ export function getCharset(type) {
    try {
        const [mediaType, params] = parseMediaType(type);
        if (params && params["charset"]) {
            return params["charset"];
        }
        const entry = db[mediaType];
        if (entry && entry.charset) {
            return entry.charset;
        }
        if (mediaType.startsWith("text/")) {
            return "UTF-8";
        }
    } catch  {
    // just swallow errors, returning undefined
    }
    return undefined;
}
/** Parses the media type and any optional parameters, per
 * [RFC 1521](https://datatracker.ietf.org/doc/html/rfc1521). Media types are
 * the values in `Content-Type` and `Content-Disposition` headers. On success
 * the function returns a tuple where the first element is the media type and
 * the second element is the optional parameters or `undefined` if there are
 * none.
 *
 * The function will throw if the parsed value is invalid.
 *
 * The returned media type will be normalized to be lower case, and returned
 * params keys will be normalized to lower case, but preserves the casing of
 * the value.
 *
 * ### Examples
 *
 * ```ts
 * import { parseMediaType } from "https://deno.land/std@$STD_VERSION/media_types/mod.ts";
 * import { assertEquals } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * assertEquals(
 *   parseMediaType("application/JSON"),
 *   [
 *     "application/json",
 *     undefined
 *   ]
 * );
 *
 * assertEquals(
 *   parseMediaType("text/html; charset=UTF-8"),
 *   [
 *     "application/json",
 *     { charset: "UTF-8" },
 *   ]
 * );
 * ```
 */ export function parseMediaType(v) {
    const [base] = v.split(";");
    const mediaType = base.toLowerCase().trim();
    const params = {};
    // Map of base parameter name -> parameter name -> value
    // for parameters containing a '*' character.
    const continuation = new Map();
    v = v.slice(base.length);
    while(v.length){
        v = v.trimStart();
        if (v.length === 0) {
            break;
        }
        const [key, value, rest] = consumeMediaParam(v);
        if (!key) {
            if (rest.trim() === ";") {
                break;
            }
            throw new TypeError("Invalid media parameter.");
        }
        let pmap = params;
        const [baseName, rest2] = key.split("*");
        if (baseName && rest2 != null) {
            if (!continuation.has(baseName)) {
                continuation.set(baseName, {});
            }
            pmap = continuation.get(baseName);
        }
        if (key in pmap) {
            throw new TypeError("Duplicate key parsed.");
        }
        pmap[key] = value;
        v = rest;
    }
    // Stitch together any continuations or things with stars
    // (i.e. RFC 2231 things with stars: "foo*0" or "foo*")
    let str = "";
    for (const [key, pieceMap] of continuation){
        const singlePartKey = `${key}*`;
        const v = pieceMap[singlePartKey];
        if (v) {
            const decv = decode2331Encoding(v);
            if (decv) {
                params[key] = decv;
            }
            continue;
        }
        str = "";
        let valid = false;
        for(let n = 0;; n++){
            const simplePart = `${key}*${n}`;
            let v = pieceMap[simplePart];
            if (v) {
                valid = true;
                str += v;
                continue;
            }
            const encodedPart = `${simplePart}*`;
            v = pieceMap[encodedPart];
            if (!v) {
                break;
            }
            valid = true;
            if (n === 0) {
                const decv = decode2331Encoding(v);
                if (decv) {
                    str += decv;
                }
            } else {
                const decv = decodeURI(v);
                str += decv;
            }
        }
        if (valid) {
            params[key] = str;
        }
    }
    return Object.keys(params).length ? [
        mediaType,
        params
    ] : [
        mediaType,
        undefined
    ];
}
/** Returns the media type associated with the file extension. Values are
 * normalized to lower case and matched irrespective of a leading `.`.
 *
 * When `extension` has no associated type, the function returns `undefined`.
 *
 * ### Examples
 *
 * ```ts
 * import { typeByExtension } from "https://deno.land/std@$STD_VERSION/media_types/mod.ts";
 *
 * typeByExtension("js"); // `application/json`
 * typeByExtension(".HTML"); // `text/html`
 * typeByExtension("foo"); // undefined
 * typeByExtension("file.json"); // undefined
 * ```
 */ export function typeByExtension(extension1) {
    extension1 = extension1.startsWith(".") ? extension1.slice(1) : extension1;
    // @ts-ignore workaround around denoland/dnt#148
    return types.get(extension1.toLowerCase());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE1MC4wL21lZGlhX3R5cGVzL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIyIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG4vKiogUHJvdmlkZXMgdXRpbGl0eSBmdW5jdGlvbnMgZm9yIG1lZGlhIHR5cGVzLlxuICpcbiAqIFRoaXMgQVBJIGlzIGluc3BpcmVkIGJ5IHRoZSBHb0xhbmcgW2BtaW1lYF0oaHR0cHM6Ly9wa2cuZ28uZGV2L21pbWUpIHBhY2thZ2VcbiAqIGFuZCBbanNodHRwL21pbWUtdHlwZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9qc2h0dHAvbWltZS10eXBlcykuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCBkYiBmcm9tIFwiLi92ZW5kb3IvbWltZS1kYi52MS41Mi4wLnRzXCI7XG5pbXBvcnQge1xuICBjb25zdW1lTWVkaWFQYXJhbSxcbiAgZGVjb2RlMjMzMUVuY29kaW5nLFxuICBpc0l0ZXJhdG9yLFxuICBpc1Rva2VuLFxuICBuZWVkc0VuY29kaW5nLFxufSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuXG50eXBlIERCID0gdHlwZW9mIGRiO1xudHlwZSBDb250ZW50VHlwZVRvRXh0ZW5zaW9uID0ge1xuICBbSyBpbiBrZXlvZiBEQl06IERCW0tdIGV4dGVuZHMgeyBcImV4dGVuc2lvbnNcIjogcmVhZG9ubHkgc3RyaW5nW10gfVxuICAgID8gREJbS11bXCJleHRlbnNpb25zXCJdW251bWJlcl1cbiAgICA6IG5ldmVyO1xufTtcbnR5cGUgS25vd25FeHRlbnNpb25PclR5cGUgPVxuICB8IGtleW9mIENvbnRlbnRUeXBlVG9FeHRlbnNpb25cbiAgfCBDb250ZW50VHlwZVRvRXh0ZW5zaW9uW2tleW9mIENvbnRlbnRUeXBlVG9FeHRlbnNpb25dXG4gIHwgYC4ke0NvbnRlbnRUeXBlVG9FeHRlbnNpb25ba2V5b2YgQ29udGVudFR5cGVUb0V4dGVuc2lvbl19YDtcblxuaW50ZXJmYWNlIERCRW50cnkge1xuICBzb3VyY2U6IHN0cmluZztcbiAgY29tcHJlc3NpYmxlPzogYm9vbGVhbjtcbiAgY2hhcnNldD86IHN0cmluZztcbiAgZXh0ZW5zaW9ucz86IHN0cmluZ1tdO1xufVxuXG50eXBlIEtleU9mRGIgPSBrZXlvZiB0eXBlb2YgZGI7XG5cbi8qKiBBIG1hcCBvZiBleHRlbnNpb25zIGZvciBhIGdpdmVuIG1lZGlhIHR5cGUuICovXG5leHBvcnQgY29uc3QgZXh0ZW5zaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcblxuLyoqIEEgbWFwIG9mIHRoZSBtZWRpYSB0eXBlIGZvciBhIGdpdmVuIGV4dGVuc2lvbiAqL1xuZXhwb3J0IGNvbnN0IHR5cGVzID0gbmV3IE1hcDxzdHJpbmcsIEtleU9mRGI+KCk7XG5cbi8qKiBJbnRlcm5hbCBmdW5jdGlvbiB0byBwb3B1bGF0ZSB0aGUgbWFwcyBiYXNlZCBvbiB0aGUgTWltZSBEQi4gKi9cbihmdW5jdGlvbiBwb3B1bGF0ZU1hcHMoKTogdm9pZCB7XG4gIGNvbnN0IHByZWZlcmVuY2UgPSBbXCJuZ2lueFwiLCBcImFwYWNoZVwiLCB1bmRlZmluZWQsIFwiaWFuYVwiXTtcblxuICBmb3IgKGNvbnN0IHR5cGUgb2YgT2JqZWN0LmtleXMoZGIpIGFzIEtleU9mRGJbXSkge1xuICAgIGNvbnN0IG1pbWUgPSBkYlt0eXBlXSBhcyBEQkVudHJ5O1xuICAgIGNvbnN0IGV4dHMgPSBtaW1lLmV4dGVuc2lvbnM7XG5cbiAgICBpZiAoIWV4dHMgfHwgIWV4dHMubGVuZ3RoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBAdHMtaWdub3JlIHdvcmsgYXJvdW5kIGRlbm9sYW5kL2RudCMxNDhcbiAgICBleHRlbnNpb25zLnNldCh0eXBlLCBleHRzKTtcblxuICAgIGZvciAoY29uc3QgZXh0IG9mIGV4dHMpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSB0eXBlcy5nZXQoZXh0KTtcbiAgICAgIGlmIChjdXJyZW50KSB7XG4gICAgICAgIGNvbnN0IGZyb20gPSBwcmVmZXJlbmNlLmluZGV4T2YoKGRiW2N1cnJlbnRdIGFzIERCRW50cnkpLnNvdXJjZSk7XG4gICAgICAgIGNvbnN0IHRvID0gcHJlZmVyZW5jZS5pbmRleE9mKG1pbWUuc291cmNlKTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgY3VycmVudCAhPT0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIiAmJlxuICAgICAgICAgIChmcm9tID4gdG8gfHxcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgd29yayBhcm91bmQgZGVub2xhbmQvZG50IzE0OFxuICAgICAgICAgICAgKGZyb20gPT09IHRvICYmIGN1cnJlbnQuc3RhcnRzV2l0aChcImFwcGxpY2F0aW9uL1wiKSkpXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHR5cGVzLnNldChleHQsIHR5cGUpO1xuICAgIH1cbiAgfVxufSkoKTtcblxuLyoqIEdpdmVuIGFuIGV4dGVuc2lvbiBvciBtZWRpYSB0eXBlLCByZXR1cm4gYSBmdWxsIGBDb250ZW50LVR5cGVgIG9yXG4gKiBgQ29udGVudC1EaXNwb3NpdGlvbmAgaGVhZGVyIHZhbHVlLlxuICpcbiAqIFRoZSBmdW5jdGlvbiB3aWxsIHRyZWF0IHRoZSBgZXh0ZW5zaW9uT3JUeXBlYCBhcyBhIG1lZGlhIHR5cGUgd2hlbiBpdFxuICogY29udGFpbnMgYSBgL2AsIG90aGVyd2lzZSBpdCB3aWxsIHByb2Nlc3MgaXQgYXMgYW4gZXh0ZW5zaW9uLCB3aXRoIG9yIHdpdGhvdXRcbiAqIHRoZSBsZWFkaW5nIGAuYC5cbiAqXG4gKiBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIHVuYWJsZSB0byByZXNvbHZlIHRoZSBtZWRpYSB0eXBlLlxuICpcbiAqICMjIyBFeGFtcGxlc1xuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjb250ZW50VHlwZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL21lZGlhX3R5cGVzL21vZC50c1wiO1xuICpcbiAqIGNvbnRlbnRUeXBlKFwiLmpzb25cIik7IC8vIGBhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04YFxuICogY29udGVudFR5cGUoXCJ0ZXh0L2h0bWxcIik7IC8vIGB0ZXh0L2h0bWw7IGNoYXJzZXQ9VVRGLThgXG4gKiBjb250ZW50VHlwZShcInRleHQvaHRtbDsgY2hhcnNldD1VVEYtOFwiKTsgLy8gYHRleHQvaHRtbDsgY2hhcnNldD1VVEYtOGBcbiAqIGNvbnRlbnRUeXBlKFwidHh0XCIpOyAvLyBgdGV4dC9wbGFpbjsgY2hhcnNldD1VVEYtOGBcbiAqIGNvbnRlbnRUeXBlKFwiZm9vXCIpOyAvLyB1bmRlZmluZWRcbiAqIGNvbnRlbnRUeXBlKFwiZmlsZS5qc29uXCIpOyAvLyB1bmRlZmluZWRcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udGVudFR5cGU8XG4gIC8vIFdvcmthcm91bmQgdG8gYXV0b2NvbXBsZXRlIGZvciBwYXJhbWV0ZXJzOiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzI5NzI5I2lzc3VlY29tbWVudC01Njc4NzE5MzlcbiAgLy8gZGVuby1saW50LWlnbm9yZSBiYW4tdHlwZXNcbiAgVCBleHRlbmRzIChzdHJpbmcgJiB7fSkgfCBLbm93bkV4dGVuc2lvbk9yVHlwZSxcbj4oXG4gIGV4dGVuc2lvbk9yVHlwZTogVCxcbik6IExvd2VyY2FzZTxUPiBleHRlbmRzIEtub3duRXh0ZW5zaW9uT3JUeXBlID8gc3RyaW5nIDogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBbbWVkaWFUeXBlLCBwYXJhbXMgPSB7fV0gPSBleHRlbnNpb25PclR5cGUuaW5jbHVkZXMoXCIvXCIpXG4gICAgICA/IHBhcnNlTWVkaWFUeXBlKGV4dGVuc2lvbk9yVHlwZSlcbiAgICAgIDogW3R5cGVCeUV4dGVuc2lvbihleHRlbnNpb25PclR5cGUpLCB1bmRlZmluZWRdO1xuICAgIGlmICghbWVkaWFUeXBlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkIGFzIExvd2VyY2FzZTxUPiBleHRlbmRzIEtub3duRXh0ZW5zaW9uT3JUeXBlID8gc3RyaW5nXG4gICAgICAgIDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAoIShcImNoYXJzZXRcIiBpbiBwYXJhbXMpKSB7XG4gICAgICBjb25zdCBjaGFyc2V0ID0gZ2V0Q2hhcnNldChtZWRpYVR5cGUpO1xuICAgICAgaWYgKGNoYXJzZXQpIHtcbiAgICAgICAgcGFyYW1zLmNoYXJzZXQgPSBjaGFyc2V0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0TWVkaWFUeXBlKG1lZGlhVHlwZSwgcGFyYW1zKTtcbiAgfSBjYXRjaCB7XG4gICAgLy8ganVzdCBzd2FsbG93IHJldHVybmluZyB1bmRlZmluZWRcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkIGFzIExvd2VyY2FzZTxUPiBleHRlbmRzIEtub3duRXh0ZW5zaW9uT3JUeXBlID8gc3RyaW5nXG4gICAgOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5cbi8qKiBGb3IgYSBnaXZlbiBtZWRpYSB0eXBlLCByZXR1cm4gdGhlIG1vc3QgcmVsZXZhbnQgZXh0ZW5zaW9uLCBvciBgdW5kZWZpbmVkYFxuICogaWYgbm8gZXh0ZW5zaW9uIGNhbiBiZSBmb3VuZC5cbiAqXG4gKiBFeHRlbnNpb25zIGFyZSByZXR1cm5lZCB3aXRob3V0IGEgbGVhZGluZyBgLmAuXG4gKlxuICogIyMjIEV4YW1wbGVzXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGV4dGVuc2lvbiB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL21lZGlhX3R5cGVzL21vZC50c1wiO1xuICpcbiAqIGV4dGVuc2lvbihcInRleHQvcGxhaW5cIik7IC8vIGB0eHRgXG4gKiBleHRlbnNpb24oXCJhcHBsaWNhdGlvbi9qc29uXCIpOyAvLyBganNvbmBcbiAqIGV4dGVuc2lvbihcInRleHQvaHRtbDsgY2hhcnNldD1VVEYtOFwiKTsgLy8gYGh0bWxgXG4gKiBleHRlbnNpb24oXCJhcHBsaWNhdGlvbi9mb29cIik7IC8vIHVuZGVmaW5lZFxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRlbnNpb24odHlwZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZXh0cyA9IGV4dGVuc2lvbnNCeVR5cGUodHlwZSk7XG4gIGlmIChleHRzKSB7XG4gICAgcmV0dXJuIGV4dHNbMF07XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqIFJldHVybnMgdGhlIGV4dGVuc2lvbnMga25vd24gdG8gYmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBtZWRpYSB0eXBlIGB0eXBlYC5cbiAqIFRoZSByZXR1cm5lZCBleHRlbnNpb25zIHdpbGwgZWFjaCBiZWdpbiB3aXRoIGEgbGVhZGluZyBkb3QsIGFzIGluIGAuaHRtbGAuXG4gKlxuICogV2hlbiBgdHlwZWAgaGFzIG5vIGFzc29jaWF0ZWQgZXh0ZW5zaW9ucywgdGhlIGZ1bmN0aW9uIHJldHVybnMgYHVuZGVmaW5lZGAuXG4gKlxuICogRXh0ZW5zaW9ucyBhcmUgcmV0dXJuZWQgd2l0aG91dCBhIGxlYWRpbmcgYC5gLlxuICpcbiAqICMjIyBFeGFtcGxlc1xuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBleHRlbnNpb25zQnlUeXBlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vbWVkaWFfdHlwZXMvbW9kLnRzXCI7XG4gKlxuICogZXh0ZW5zaW9uc0J5VHlwZShcImFwcGxpY2F0aW9uL2pzb25cIik7IC8vIFtcImpzXCIsIFwibWpzXCJdXG4gKiBleHRlbnNpb25zQnlUeXBlKFwidGV4dC9odG1sOyBjaGFyc2V0PVVURi04XCIpOyAvLyBbXCJodG1sXCIsIFwiaHRtXCIsIFwic2h0bWxcIl1cbiAqIGV4dGVuc2lvbnNCeVR5cGUoXCJhcHBsaWNhdGlvbi9mb29cIik7IC8vIHVuZGVmaW5lZFxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRlbnNpb25zQnlUeXBlKHR5cGU6IHN0cmluZyk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBbbWVkaWFUeXBlXSA9IHBhcnNlTWVkaWFUeXBlKHR5cGUpO1xuICAgIHJldHVybiBleHRlbnNpb25zLmdldChtZWRpYVR5cGUpO1xuICB9IGNhdGNoIHtcbiAgICAvLyBqdXN0IHN3YWxsb3cgZXJyb3JzLCByZXR1cm5pbmcgdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqIFNlcmlhbGl6ZXMgdGhlIG1lZGlhIHR5cGUgYW5kIHRoZSBvcHRpb25hbCBwYXJhbWV0ZXJzIGFzIGEgbWVkaWEgdHlwZVxuICogY29uZm9ybWluZyB0byBSRkMgMjA0NSBhbmQgUkZDIDI2MTYuXG4gKlxuICogVGhlIHR5cGUgYW5kIHBhcmFtZXRlciBuYW1lcyBhcmUgd3JpdHRlbiBpbiBsb3dlci1jYXNlLlxuICpcbiAqIFdoZW4gYW55IG9mIHRoZSBhcmd1bWVudHMgcmVzdWx0cyBpbiBhIHN0YW5kYXJkIHZpb2xhdGlvbiB0aGVuIHRoZSByZXR1cm5cbiAqIHZhbHVlIHdpbGwgYmUgYW4gZW1wdHkgc3RyaW5nIChgXCJcImApLlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGZvcm1hdE1lZGlhVHlwZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL21lZGlhX3R5cGVzL21vZC50c1wiO1xuICpcbiAqIGZvcm1hdE1lZGlhVHlwZShcInRleHQvcGxhaW5cIiwgeyBjaGFyc2V0OiBcIlVURi04XCIgfSk7IC8vIGB0ZXh0L3BsYWluOyBjaGFyc2V0PVVURi04YFxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRNZWRpYVR5cGUoXG4gIHR5cGU6IHN0cmluZyxcbiAgcGFyYW0/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgSXRlcmFibGU8W3N0cmluZywgc3RyaW5nXT4sXG4pOiBzdHJpbmcge1xuICBsZXQgYiA9IFwiXCI7XG4gIGNvbnN0IFttYWpvciwgc3ViXSA9IHR5cGUuc3BsaXQoXCIvXCIpO1xuICBpZiAoIXN1Yikge1xuICAgIGlmICghaXNUb2tlbih0eXBlKSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuICAgIGIgKz0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuICB9IGVsc2Uge1xuICAgIGlmICghaXNUb2tlbihtYWpvcikgfHwgIWlzVG9rZW4oc3ViKSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuICAgIGIgKz0gYCR7bWFqb3IudG9Mb3dlckNhc2UoKX0vJHtzdWIudG9Mb3dlckNhc2UoKX1gO1xuICB9XG5cbiAgaWYgKHBhcmFtKSB7XG4gICAgcGFyYW0gPSBpc0l0ZXJhdG9yKHBhcmFtKSA/IE9iamVjdC5mcm9tRW50cmllcyhwYXJhbSkgOiBwYXJhbTtcbiAgICBjb25zdCBhdHRycyA9IE9iamVjdC5rZXlzKHBhcmFtKTtcbiAgICBhdHRycy5zb3J0KCk7XG5cbiAgICBmb3IgKGNvbnN0IGF0dHJpYnV0ZSBvZiBhdHRycykge1xuICAgICAgaWYgKCFpc1Rva2VuKGF0dHJpYnV0ZSkpIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZSA9IHBhcmFtW2F0dHJpYnV0ZV07XG4gICAgICBiICs9IGA7ICR7YXR0cmlidXRlLnRvTG93ZXJDYXNlKCl9YDtcblxuICAgICAgY29uc3QgbmVlZEVuYyA9IG5lZWRzRW5jb2RpbmcodmFsdWUpO1xuICAgICAgaWYgKG5lZWRFbmMpIHtcbiAgICAgICAgYiArPSBcIipcIjtcbiAgICAgIH1cbiAgICAgIGIgKz0gXCI9XCI7XG5cbiAgICAgIGlmIChuZWVkRW5jKSB7XG4gICAgICAgIGIgKz0gYHV0Zi04Jycke2VuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSl9YDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc1Rva2VuKHZhbHVlKSkge1xuICAgICAgICBiICs9IHZhbHVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGIgKz0gYFwiJHt2YWx1ZS5yZXBsYWNlKC9bXCJcXFxcXS9naSwgKG0pID0+IGBcXFxcJHttfWApfVwiYDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGI7XG59XG5cbi8qKiBHaXZlbiBhIG1lZGlhIHR5cGUgb3IgaGVhZGVyIHZhbHVlLCBpZGVudGlmeSB0aGUgZW5jb2RpbmcgY2hhcnNldC4gSWYgdGhlXG4gKiBjaGFyc2V0IGNhbm5vdCBiZSBkZXRlcm1pbmVkLCB0aGUgZnVuY3Rpb24gcmV0dXJucyBgdW5kZWZpbmVkYC5cbiAqXG4gKiAjIyMgRXhhbXBsZXNcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZ2V0Q2hhcnNldCB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL21lZGlhX3R5cGVzL21vZC50c1wiO1xuICpcbiAqIGdldENoYXJzZXQoXCJ0ZXh0L3BsYWluXCIpOyAvLyBgVVRGLThgXG4gKiBnZXRDaGFyc2V0KFwiYXBwbGljYXRpb24vZm9vXCIpOyAvLyB1bmRlZmluZWRcbiAqIGdldENoYXJzZXQoXCJhcHBsaWNhdGlvbi9uZXdzLWNoZWNrZ3JvdXBzXCIpOyAvLyBgVVMtQVNDSUlgXG4gKiBnZXRDaGFyc2V0KFwiYXBwbGljYXRpb24vbmV3cy1jaGVja2dyb3VwczsgY2hhcnNldD1VVEYtOFwiKTsgLy8gYFVURi04YFxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDaGFyc2V0KHR5cGU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgW21lZGlhVHlwZSwgcGFyYW1zXSA9IHBhcnNlTWVkaWFUeXBlKHR5cGUpO1xuICAgIGlmIChwYXJhbXMgJiYgcGFyYW1zW1wiY2hhcnNldFwiXSkge1xuICAgICAgcmV0dXJuIHBhcmFtc1tcImNoYXJzZXRcIl07XG4gICAgfVxuICAgIGNvbnN0IGVudHJ5ID0gZGJbbWVkaWFUeXBlIGFzIEtleU9mRGJdIGFzIERCRW50cnk7XG4gICAgaWYgKGVudHJ5ICYmIGVudHJ5LmNoYXJzZXQpIHtcbiAgICAgIHJldHVybiBlbnRyeS5jaGFyc2V0O1xuICAgIH1cbiAgICBpZiAobWVkaWFUeXBlLnN0YXJ0c1dpdGgoXCJ0ZXh0L1wiKSkge1xuICAgICAgcmV0dXJuIFwiVVRGLThcIjtcbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIGp1c3Qgc3dhbGxvdyBlcnJvcnMsIHJldHVybmluZyB1bmRlZmluZWRcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKiogUGFyc2VzIHRoZSBtZWRpYSB0eXBlIGFuZCBhbnkgb3B0aW9uYWwgcGFyYW1ldGVycywgcGVyXG4gKiBbUkZDIDE1MjFdKGh0dHBzOi8vZGF0YXRyYWNrZXIuaWV0Zi5vcmcvZG9jL2h0bWwvcmZjMTUyMSkuIE1lZGlhIHR5cGVzIGFyZVxuICogdGhlIHZhbHVlcyBpbiBgQ29udGVudC1UeXBlYCBhbmQgYENvbnRlbnQtRGlzcG9zaXRpb25gIGhlYWRlcnMuIE9uIHN1Y2Nlc3NcbiAqIHRoZSBmdW5jdGlvbiByZXR1cm5zIGEgdHVwbGUgd2hlcmUgdGhlIGZpcnN0IGVsZW1lbnQgaXMgdGhlIG1lZGlhIHR5cGUgYW5kXG4gKiB0aGUgc2Vjb25kIGVsZW1lbnQgaXMgdGhlIG9wdGlvbmFsIHBhcmFtZXRlcnMgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgYXJlXG4gKiBub25lLlxuICpcbiAqIFRoZSBmdW5jdGlvbiB3aWxsIHRocm93IGlmIHRoZSBwYXJzZWQgdmFsdWUgaXMgaW52YWxpZC5cbiAqXG4gKiBUaGUgcmV0dXJuZWQgbWVkaWEgdHlwZSB3aWxsIGJlIG5vcm1hbGl6ZWQgdG8gYmUgbG93ZXIgY2FzZSwgYW5kIHJldHVybmVkXG4gKiBwYXJhbXMga2V5cyB3aWxsIGJlIG5vcm1hbGl6ZWQgdG8gbG93ZXIgY2FzZSwgYnV0IHByZXNlcnZlcyB0aGUgY2FzaW5nIG9mXG4gKiB0aGUgdmFsdWUuXG4gKlxuICogIyMjIEV4YW1wbGVzXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHBhcnNlTWVkaWFUeXBlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vbWVkaWFfdHlwZXMvbW9kLnRzXCI7XG4gKiBpbXBvcnQgeyBhc3NlcnRFcXVhbHMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcbiAqXG4gKiBhc3NlcnRFcXVhbHMoXG4gKiAgIHBhcnNlTWVkaWFUeXBlKFwiYXBwbGljYXRpb24vSlNPTlwiKSxcbiAqICAgW1xuICogICAgIFwiYXBwbGljYXRpb24vanNvblwiLFxuICogICAgIHVuZGVmaW5lZFxuICogICBdXG4gKiApO1xuICpcbiAqIGFzc2VydEVxdWFscyhcbiAqICAgcGFyc2VNZWRpYVR5cGUoXCJ0ZXh0L2h0bWw7IGNoYXJzZXQ9VVRGLThcIiksXG4gKiAgIFtcbiAqICAgICBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAqICAgICB7IGNoYXJzZXQ6IFwiVVRGLThcIiB9LFxuICogICBdXG4gKiApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhVHlwZShcbiAgdjogc3RyaW5nLFxuKTogW21lZGlhVHlwZTogc3RyaW5nLCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCB1bmRlZmluZWRdIHtcbiAgY29uc3QgW2Jhc2VdID0gdi5zcGxpdChcIjtcIik7XG4gIGNvbnN0IG1lZGlhVHlwZSA9IGJhc2UudG9Mb3dlckNhc2UoKS50cmltKCk7XG5cbiAgY29uc3QgcGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIC8vIE1hcCBvZiBiYXNlIHBhcmFtZXRlciBuYW1lIC0+IHBhcmFtZXRlciBuYW1lIC0+IHZhbHVlXG4gIC8vIGZvciBwYXJhbWV0ZXJzIGNvbnRhaW5pbmcgYSAnKicgY2hhcmFjdGVyLlxuICBjb25zdCBjb250aW51YXRpb24gPSBuZXcgTWFwPHN0cmluZywgUmVjb3JkPHN0cmluZywgc3RyaW5nPj4oKTtcblxuICB2ID0gdi5zbGljZShiYXNlLmxlbmd0aCk7XG4gIHdoaWxlICh2Lmxlbmd0aCkge1xuICAgIHYgPSB2LnRyaW1TdGFydCgpO1xuICAgIGlmICh2Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IFtrZXksIHZhbHVlLCByZXN0XSA9IGNvbnN1bWVNZWRpYVBhcmFtKHYpO1xuICAgIGlmICgha2V5KSB7XG4gICAgICBpZiAocmVzdC50cmltKCkgPT09IFwiO1wiKSB7XG4gICAgICAgIC8vIGlnbm9yZSB0cmFpbGluZyBzZW1pY29sb25zXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgbWVkaWEgcGFyYW1ldGVyLlwiKTtcbiAgICB9XG5cbiAgICBsZXQgcG1hcCA9IHBhcmFtcztcbiAgICBjb25zdCBbYmFzZU5hbWUsIHJlc3QyXSA9IGtleS5zcGxpdChcIipcIik7XG4gICAgaWYgKGJhc2VOYW1lICYmIHJlc3QyICE9IG51bGwpIHtcbiAgICAgIGlmICghY29udGludWF0aW9uLmhhcyhiYXNlTmFtZSkpIHtcbiAgICAgICAgY29udGludWF0aW9uLnNldChiYXNlTmFtZSwge30pO1xuICAgICAgfVxuICAgICAgcG1hcCA9IGNvbnRpbnVhdGlvbi5nZXQoYmFzZU5hbWUpITtcbiAgICB9XG4gICAgaWYgKGtleSBpbiBwbWFwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRHVwbGljYXRlIGtleSBwYXJzZWQuXCIpO1xuICAgIH1cbiAgICBwbWFwW2tleV0gPSB2YWx1ZTtcbiAgICB2ID0gcmVzdDtcbiAgfVxuXG4gIC8vIFN0aXRjaCB0b2dldGhlciBhbnkgY29udGludWF0aW9ucyBvciB0aGluZ3Mgd2l0aCBzdGFyc1xuICAvLyAoaS5lLiBSRkMgMjIzMSB0aGluZ3Mgd2l0aCBzdGFyczogXCJmb28qMFwiIG9yIFwiZm9vKlwiKVxuICBsZXQgc3RyID0gXCJcIjtcbiAgZm9yIChjb25zdCBba2V5LCBwaWVjZU1hcF0gb2YgY29udGludWF0aW9uKSB7XG4gICAgY29uc3Qgc2luZ2xlUGFydEtleSA9IGAke2tleX0qYDtcbiAgICBjb25zdCB2ID0gcGllY2VNYXBbc2luZ2xlUGFydEtleV07XG4gICAgaWYgKHYpIHtcbiAgICAgIGNvbnN0IGRlY3YgPSBkZWNvZGUyMzMxRW5jb2Rpbmcodik7XG4gICAgICBpZiAoZGVjdikge1xuICAgICAgICBwYXJhbXNba2V5XSA9IGRlY3Y7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBzdHIgPSBcIlwiO1xuICAgIGxldCB2YWxpZCA9IGZhbHNlO1xuICAgIGZvciAobGV0IG4gPSAwOzsgbisrKSB7XG4gICAgICBjb25zdCBzaW1wbGVQYXJ0ID0gYCR7a2V5fSoke259YDtcbiAgICAgIGxldCB2ID0gcGllY2VNYXBbc2ltcGxlUGFydF07XG4gICAgICBpZiAodikge1xuICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICAgIHN0ciArPSB2O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGVuY29kZWRQYXJ0ID0gYCR7c2ltcGxlUGFydH0qYDtcbiAgICAgIHYgPSBwaWVjZU1hcFtlbmNvZGVkUGFydF07XG4gICAgICBpZiAoIXYpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB2YWxpZCA9IHRydWU7XG4gICAgICBpZiAobiA9PT0gMCkge1xuICAgICAgICBjb25zdCBkZWN2ID0gZGVjb2RlMjMzMUVuY29kaW5nKHYpO1xuICAgICAgICBpZiAoZGVjdikge1xuICAgICAgICAgIHN0ciArPSBkZWN2O1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBkZWN2ID0gZGVjb2RlVVJJKHYpO1xuICAgICAgICBzdHIgKz0gZGVjdjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHZhbGlkKSB7XG4gICAgICBwYXJhbXNba2V5XSA9IHN0cjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5sZW5ndGhcbiAgICA/IFttZWRpYVR5cGUsIHBhcmFtc11cbiAgICA6IFttZWRpYVR5cGUsIHVuZGVmaW5lZF07XG59XG5cbi8qKiBSZXR1cm5zIHRoZSBtZWRpYSB0eXBlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZmlsZSBleHRlbnNpb24uIFZhbHVlcyBhcmVcbiAqIG5vcm1hbGl6ZWQgdG8gbG93ZXIgY2FzZSBhbmQgbWF0Y2hlZCBpcnJlc3BlY3RpdmUgb2YgYSBsZWFkaW5nIGAuYC5cbiAqXG4gKiBXaGVuIGBleHRlbnNpb25gIGhhcyBubyBhc3NvY2lhdGVkIHR5cGUsIHRoZSBmdW5jdGlvbiByZXR1cm5zIGB1bmRlZmluZWRgLlxuICpcbiAqICMjIyBFeGFtcGxlc1xuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyB0eXBlQnlFeHRlbnNpb24gfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9tZWRpYV90eXBlcy9tb2QudHNcIjtcbiAqXG4gKiB0eXBlQnlFeHRlbnNpb24oXCJqc1wiKTsgLy8gYGFwcGxpY2F0aW9uL2pzb25gXG4gKiB0eXBlQnlFeHRlbnNpb24oXCIuSFRNTFwiKTsgLy8gYHRleHQvaHRtbGBcbiAqIHR5cGVCeUV4dGVuc2lvbihcImZvb1wiKTsgLy8gdW5kZWZpbmVkXG4gKiB0eXBlQnlFeHRlbnNpb24oXCJmaWxlLmpzb25cIik7IC8vIHVuZGVmaW5lZFxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlQnlFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBleHRlbnNpb24gPSBleHRlbnNpb24uc3RhcnRzV2l0aChcIi5cIikgPyBleHRlbnNpb24uc2xpY2UoMSkgOiBleHRlbnNpb247XG4gIC8vIEB0cy1pZ25vcmUgd29ya2Fyb3VuZCBhcm91bmQgZGVub2xhbmQvZG50IzE0OFxuICByZXR1cm4gdHlwZXMuZ2V0KGV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDOzs7Ozs7R0FNRyxDQUVILE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzdDLFNBQ0UsaUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsT0FBTyxFQUNQLGFBQWEsUUFDUixZQUFZLENBQUM7QUFzQnBCLGtEQUFrRCxDQUNsRCxPQUFPLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO0FBRXRELG9EQUFvRCxDQUNwRCxPQUFPLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFDO0FBRWhELG1FQUFtRSxDQUNuRSxDQUFDLFNBQVMsWUFBWSxHQUFTO0lBQzdCLE1BQU0sVUFBVSxHQUFHO1FBQUMsT0FBTztRQUFFLFFBQVE7UUFBRSxTQUFTO1FBQUUsTUFBTTtLQUFDLEFBQUM7SUFFMUQsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFlO1FBQy9DLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQUFBVyxBQUFDO1FBQ2pDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLEFBQUM7UUFFN0IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDekIsU0FBUztTQUNWO1FBRUQsMENBQTBDO1FBQzFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUks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