import { extname, fromFileUrl } from "../deps.ts";
import { mediaTypeToLoader, transformRawIntoContent } from "./shared.ts";
export async function load(url, _options) {
    switch(url.protocol){
        case "http:":
        case "https:":
        case "data:":
            return await loadWithFetch(url);
        case "file:":
            {
                const res = await loadWithReadFile(url);
                res.watchFiles = [
                    fromFileUrl(url.href)
                ];
                return res;
            }
    }
    return null;
}
async function loadWithFetch(specifier) {
    const specifierRaw = specifier.href;
    // TODO(lucacasonato): redirects!
    const resp = await fetch(specifierRaw);
    if (!resp.ok) {
        throw new Error(`Encountered status code ${resp.status} while fetching ${specifierRaw}.`);
    }
    const contentType = resp.headers.get("content-type");
    const mediaType = mapContentType(new URL(resp.url || specifierRaw), contentType);
    const loader = mediaTypeToLoader(mediaType);
    const raw = new Uint8Array(await resp.arrayBuffer());
    const contents = transformRawIntoContent(raw, mediaType);
    return {
        contents,
        loader
    };
}
async function loadWithReadFile(specifier) {
    const path = fromFileUrl(specifier);
    const mediaType = mapContentType(specifier, null);
    const loader = mediaTypeToLoader(mediaType);
    const raw = await Deno.readFile(path);
    const contents = transformRawIntoContent(raw, mediaType);
    return {
        contents,
        loader
    };
}
function mapContentType(specifier, contentType) {
    if (contentType !== null) {
        const contentTypes = contentType.split(";");
        const mediaType = contentTypes[0].toLowerCase();
        switch(mediaType){
            case "application/typescript":
            case "text/typescript":
            case "video/vnd.dlna.mpeg-tts":
            case "video/mp2t":
            case "application/x-typescript":
                return mapJsLikeExtension(specifier, "TypeScript");
            case "application/javascript":
            case "text/javascript":
            case "application/ecmascript":
            case "text/ecmascript":
            case "application/x-javascript":
            case "application/node":
                return mapJsLikeExtension(specifier, "JavaScript");
            case "text/jsx":
                return "JSX";
            case "text/tsx":
                return "TSX";
            case "application/json":
            case "text/json":
                return "Json";
            case "application/wasm":
                return "Wasm";
            case "text/plain":
            case "application/octet-stream":
                return mediaTypeFromSpecifier(specifier);
            default:
                return "Unknown";
        }
    } else {
        return mediaTypeFromSpecifier(specifier);
    }
}
function mapJsLikeExtension(specifier, defaultType) {
    const path = specifier.pathname;
    switch(extname(path)){
        case ".jsx":
            return "JSX";
        case ".mjs":
            return "Mjs";
        case ".cjs":
            return "Cjs";
        case ".tsx":
            return "TSX";
        case ".ts":
            if (path.endsWith(".d.ts")) {
                return "Dts";
            } else {
                return defaultType;
            }
        case ".mts":
            {
                if (path.endsWith(".d.mts")) {
                    return "Dmts";
                } else {
                    return defaultType == "JavaScript" ? "Mjs" : "Mts";
                }
            }
        case ".cts":
            {
                if (path.endsWith(".d.cts")) {
                    return "Dcts";
                } else {
                    return defaultType == "JavaScript" ? "Cjs" : "Cts";
                }
            }
        default:
            return defaultType;
    }
}
function mediaTypeFromSpecifier(specifier) {
    const path = specifier.pathname;
    switch(extname(path)){
        case "":
            if (path.endsWith("/.tsbuildinfo")) {
                return "TsBuildInfo";
            } else {
                return "Unknown";
            }
        case ".ts":
            if (path.endsWith(".d.ts")) {
                return "Dts";
            } else {
                return "TypeScript";
            }
        case ".mts":
            if (path.endsWith(".d.mts")) {
                return "Dmts";
            } else {
                return "Mts";
            }
        case ".cts":
            if (path.endsWith(".d.cts")) {
                return "Dcts";
            } else {
                return "Cts";
            }
        case ".tsx":
            return "TSX";
        case ".js":
            return "JavaScript";
        case ".jsx":
            return "JSX";
        case ".mjs":
            return "Mjs";
        case ".cjs":
            return "Cjs";
        case ".json":
            return "Json";
        case ".wasm":
            return "Wasm";
        case ".tsbuildinfo":
            return "TsBuildInfo";
        case ".map":
            return "SourceMap";
        default:
            return "Unknown";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXNidWlsZF9kZW5vX2xvYWRlckAwLjUuMi9zcmMvcG9ydGFibGVfbG9hZGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGVzYnVpbGQsIGV4dG5hbWUsIGZyb21GaWxlVXJsIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCAqIGFzIGRlbm8gZnJvbSBcIi4vZGVuby50c1wiO1xuaW1wb3J0IHsgbWVkaWFUeXBlVG9Mb2FkZXIsIHRyYW5zZm9ybVJhd0ludG9Db250ZW50IH0gZnJvbSBcIi4vc2hhcmVkLnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZE9wdGlvbnMge1xuICBpbXBvcnRNYXBVUkw/OiBVUkw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkKFxuICB1cmw6IFVSTCxcbiAgX29wdGlvbnM6IExvYWRPcHRpb25zLFxuKTogUHJvbWlzZTxlc2J1aWxkLk9uTG9hZFJlc3VsdCB8IG51bGw+IHtcbiAgc3dpdGNoICh1cmwucHJvdG9jb2wpIHtcbiAgICBjYXNlIFwiaHR0cDpcIjpcbiAgICBjYXNlIFwiaHR0cHM6XCI6XG4gICAgY2FzZSBcImRhdGE6XCI6XG4gICAgICByZXR1cm4gYXdhaXQgbG9hZFdpdGhGZXRjaCh1cmwpO1xuICAgIGNhc2UgXCJmaWxlOlwiOiB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBsb2FkV2l0aFJlYWRGaWxlKHVybCk7XG4gICAgICByZXMud2F0Y2hGaWxlcyA9IFtmcm9tRmlsZVVybCh1cmwuaHJlZildO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRXaXRoRmV0Y2goXG4gIHNwZWNpZmllcjogVVJMLFxuKTogUHJvbWlzZTxlc2J1aWxkLk9uTG9hZFJlc3VsdD4ge1xuICBjb25zdCBzcGVjaWZpZXJSYXcgPSBzcGVjaWZpZXIuaHJlZjtcblxuICAvLyBUT0RPKGx1Y2FjYXNvbmF0byk6IHJlZGlyZWN0cyFcbiAgY29uc3QgcmVzcCA9IGF3YWl0IGZldGNoKHNwZWNpZmllclJhdyk7XG4gIGlmICghcmVzcC5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBFbmNvdW50ZXJlZCBzdGF0dXMgY29kZSAke3Jlc3Auc3RhdHVzfSB3aGlsZSBmZXRjaGluZyAke3NwZWNpZmllclJhd30uYCxcbiAgICApO1xuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSByZXNwLmhlYWRlcnMuZ2V0KFwiY29udGVudC10eXBlXCIpO1xuICBjb25zdCBtZWRpYVR5cGUgPSBtYXBDb250ZW50VHlwZShcbiAgICBuZXcgVVJMKHJlc3AudXJsIHx8IHNwZWNpZmllclJhdyksXG4gICAgY29udGVudFR5cGUsXG4gICk7XG5cbiAgY29uc3QgbG9hZGVyID0gbWVkaWFUeXBlVG9Mb2FkZXIobWVkaWFUeXBlKTtcblxuICBjb25zdCByYXcgPSBuZXcgVWludDhBcnJheShhd2FpdCByZXNwLmFycmF5QnVmZmVyKCkpO1xuICBjb25zdCBjb250ZW50cyA9IHRyYW5zZm9ybVJhd0ludG9Db250ZW50KHJhdywgbWVkaWFUeXBlKTtcblxuICByZXR1cm4geyBjb250ZW50cywgbG9hZGVyIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRXaXRoUmVhZEZpbGUoc3BlY2lmaWVyOiBVUkwpOiBQcm9taXNlPGVzYnVpbGQuT25Mb2FkUmVzdWx0PiB7XG4gIGNvbnN0IHBhdGggPSBmcm9tRmlsZVVybChzcGVjaWZpZXIpO1xuXG4gIGNvbnN0IG1lZGlhVHlwZSA9IG1hcENvbnRlbnRUeXBlKHNwZWNpZmllciwgbnVsbCk7XG4gIGNvbnN0IGxvYWRlciA9IG1lZGlhVHlwZVRvTG9hZGVyKG1lZGlhVHlwZSk7XG5cbiAgY29uc3QgcmF3ID0gYXdhaXQgRGVuby5yZWFkRmlsZShwYXRoKTtcbiAgY29uc3QgY29udGVudHMgPSB0cmFuc2Zvcm1SYXdJbnRvQ29udGVudChyYXcsIG1lZGlhVHlwZSk7XG5cbiAgcmV0dXJuIHsgY29udGVudHMsIGxvYWRlciB9O1xufVxuXG5mdW5jdGlvbiBtYXBDb250ZW50VHlwZShcbiAgc3BlY2lmaWVyOiBVUkwsXG4gIGNvbnRlbnRUeXBlOiBzdHJpbmcgfCBudWxsLFxuKTogZGVuby5NZWRpYVR5cGUge1xuICBpZiAoY29udGVudFR5cGUgIT09IG51bGwpIHtcbiAgICBjb25zdCBjb250ZW50VHlwZXMgPSBjb250ZW50VHlwZS5zcGxpdChcIjtcIik7XG4gICAgY29uc3QgbWVkaWFUeXBlID0gY29udGVudFR5cGVzWzBdLnRvTG93ZXJDYXNlKCk7XG4gICAgc3dpdGNoIChtZWRpYVR5cGUpIHtcbiAgICAgIGNhc2UgXCJhcHBsaWNhdGlvbi90eXBlc2NyaXB0XCI6XG4gICAgICBjYXNlIFwidGV4dC90eXBlc2NyaXB0XCI6XG4gICAgICBjYXNlIFwidmlkZW8vdm5kLmRsbmEubXBlZy10dHNcIjpcbiAgICAgIGNhc2UgXCJ2aWRlby9tcDJ0XCI6XG4gICAgICBjYXNlIFwiYXBwbGljYXRpb24veC10eXBlc2NyaXB0XCI6XG4gICAgICAgIHJldHVybiBtYXBKc0xpa2VFeHRlbnNpb24oc3BlY2lmaWVyLCBcIlR5cGVTY3JpcHRcIik7XG4gICAgICBjYXNlIFwiYXBwbGljYXRpb24vamF2YXNjcmlwdFwiOlxuICAgICAgY2FzZSBcInRleHQvamF2YXNjcmlwdFwiOlxuICAgICAgY2FzZSBcImFwcGxpY2F0aW9uL2VjbWFzY3JpcHRcIjpcbiAgICAgIGNhc2UgXCJ0ZXh0L2VjbWFzY3JpcHRcIjpcbiAgICAgIGNhc2UgXCJhcHBsaWNhdGlvbi94LWphdmFzY3JpcHRcIjpcbiAgICAgIGNhc2UgXCJhcHBsaWNhdGlvbi9ub2RlXCI6XG4gICAgICAgIHJldHVybiBtYXBKc0xpa2VFeHRlbnNpb24oc3BlY2lmaWVyLCBcIkphdmFTY3JpcHRcIik7XG4gICAgICBjYXNlIFwidGV4dC9qc3hcIjpcbiAgICAgICAgcmV0dXJuIFwiSlNYXCI7XG4gICAgICBjYXNlIFwidGV4dC90c3hcIjpcbiAgICAgICAgcmV0dXJuIFwiVFNYXCI7XG4gICAgICBjYXNlIFwiYXBwbGljYXRpb24vanNvblwiOlxuICAgICAgY2FzZSBcInRleHQvanNvblwiOlxuICAgICAgICByZXR1cm4gXCJKc29uXCI7XG4gICAgICBjYXNlIFwiYXBwbGljYXRpb24vd2FzbVwiOlxuICAgICAgICByZXR1cm4gXCJXYXNtXCI7XG4gICAgICBjYXNlIFwidGV4dC9wbGFpblwiOlxuICAgICAgY2FzZSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiOlxuICAgICAgICByZXR1cm4gbWVkaWFUeXBlRnJvbVNwZWNpZmllcihzcGVjaWZpZXIpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFwiVW5rbm93blwiO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbWVkaWFUeXBlRnJvbVNwZWNpZmllcihzcGVjaWZpZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hcEpzTGlrZUV4dGVuc2lvbihcbiAgc3BlY2lmaWVyOiBVUkwsXG4gIGRlZmF1bHRUeXBlOiBkZW5vLk1lZGlhVHlwZSxcbik6IGRlbm8uTWVkaWFUeXBlIHtcbiAgY29uc3QgcGF0aCA9IHNwZWNpZmllci5wYXRobmFtZTtcbiAgc3dpdGNoIChleHRuYW1lKHBhdGgpKSB7XG4gICAgY2FzZSBcIi5qc3hcIjpcbiAgICAgIHJldHVybiBcIkpTWFwiO1xuICAgIGNhc2UgXCIubWpzXCI6XG4gICAgICByZXR1cm4gXCJNanNcIjtcbiAgICBjYXNlIFwiLmNqc1wiOlxuICAgICAgcmV0dXJuIFwiQ2pzXCI7XG4gICAgY2FzZSBcIi50c3hcIjpcbiAgICAgIHJldHVybiBcIlRTWFwiO1xuICAgIGNhc2UgXCIudHNcIjpcbiAgICAgIGlmIChwYXRoLmVuZHNXaXRoKFwiLmQudHNcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiRHRzXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFR5cGU7XG4gICAgICB9XG4gICAgY2FzZSBcIi5tdHNcIjoge1xuICAgICAgaWYgKHBhdGguZW5kc1dpdGgoXCIuZC5tdHNcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiRG10c1wiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRUeXBlID09IFwiSmF2YVNjcmlwdFwiID8gXCJNanNcIiA6IFwiTXRzXCI7XG4gICAgICB9XG4gICAgfVxuICAgIGNhc2UgXCIuY3RzXCI6IHtcbiAgICAgIGlmIChwYXRoLmVuZHNXaXRoKFwiLmQuY3RzXCIpKSB7XG4gICAgICAgIHJldHVybiBcIkRjdHNcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VHlwZSA9PSBcIkphdmFTY3JpcHRcIiA/IFwiQ2pzXCIgOiBcIkN0c1wiO1xuICAgICAgfVxuICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGRlZmF1bHRUeXBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1lZGlhVHlwZUZyb21TcGVjaWZpZXIoc3BlY2lmaWVyOiBVUkwpOiBkZW5vLk1lZGlhVHlwZSB7XG4gIGNvbnN0IHBhdGggPSBzcGVjaWZpZXIucGF0aG5hbWU7XG4gIHN3aXRjaCAoZXh0bmFtZShwYXRoKSkge1xuICAgIGNhc2UgXCJcIjpcbiAgICAgIGlmIChwYXRoLmVuZHNXaXRoKFwiLy50c2J1aWxkaW5mb1wiKSkge1xuICAgICAgICByZXR1cm4gXCJUc0J1aWxkSW5mb1wiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFwiVW5rbm93blwiO1xuICAgICAgfVxuICAgIGNhc2UgXCIudHNcIjpcbiAgICAgIGlmIChwYXRoLmVuZHNXaXRoKFwiLmQudHNcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiRHRzXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJUeXBlU2NyaXB0XCI7XG4gICAgICB9XG4gICAgY2FzZSBcIi5tdHNcIjpcbiAgICAgIGlmIChwYXRoLmVuZHNXaXRoKFwiLmQubXRzXCIpKSB7XG4gICAgICAgIHJldHVybiBcIkRtdHNcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBcIk10c1wiO1xuICAgICAgfVxuICAgIGNhc2UgXCIuY3RzXCI6XG4gICAgICBpZiAocGF0aC5lbmRzV2l0aChcIi5kLmN0c1wiKSkge1xuICAgICAgICByZXR1cm4gXCJEY3RzXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJDdHNcIjtcbiAgICAgIH1cbiAgICBjYXNlIFwiLnRzeFwiOlxuICAgICAgcmV0dXJuIFwiVFNYXCI7XG4gICAgY2FzZSBcIi5qc1wiOlxuICAgICAgcmV0dXJuIFwiSmF2YVNjcmlwdFwiO1xuICAgIGNhc2UgXCIuanN4XCI6XG4gICAgICByZXR1cm4gXCJKU1hcIjtcbiAgICBjYXNlIFwiLm1qc1wiOlxuICAgICAgcmV0dXJuIFwiTWpzXCI7XG4gICAgY2FzZSBcIi5janNcIjpcbiAgICAgIHJldHVybiBcIkNqc1wiO1xuICAgIGNhc2UgXCIuanNvblwiOlxuICAgICAgcmV0dXJuIFwiSnNvblwiO1xuICAgIGNhc2UgXCIud2FzbVwiOlxuICAgICAgcmV0dXJuIFwiV2FzbVwiO1xuICAgIGNhc2UgXCIudHNidWlsZGluZm9cIjpcbiAgICAgIHJldHVybiBcIlRzQnVpbGRJbmZvXCI7XG4gICAgY2FzZSBcIi5tYXBcIjpcbiAgICAgIHJldHVybiBcIlNvdXJjZU1hcFwiO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gXCJVbmtub3duXCI7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFrQixPQUFPLEVBQUUsV0FBVyxRQUFRLFlBQVksQ0FBQztBQUUzRCxTQUFTLGlCQUFpQixFQUFFLHVCQUF1QixRQUFRLGFBQWEsQ0FBQztBQU16RSxPQUFPLGVBQWUsSUFBSSxDQUN4QixHQUFRLEVBQ1IsUUFBcUIsRUFDaUI7SUFDdEMsT0FBUSxHQUFHLENBQUMsUUFBUTtRQUNsQixLQUFLLE9BQU8sQ0FBQztRQUNiLEtBQUssUUFBUSxDQUFDO1FBQ2QsS0FBSyxPQUFPO1lBQ1YsT0FBTyxNQUFNLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxLQUFLLE9BQU87WUFBRTtnQkFDWixNQUFNLEdBQUcsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxBQUFDO2dCQUN4QyxHQUFHLENBQUMsVUFBVSxHQUFHO29CQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2lCQUFDLENBQUM7Z0JBQ3pDLE9BQU8sR0FBRyxDQUFDO2FBQ1o7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFDO0NBQ2I7QUFFRCxlQUFlLGFBQWEsQ0FDMUIsU0FBYyxFQUNpQjtJQUMvQixNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsSUFBSSxBQUFDO0lBRXBDLGlDQUFpQztJQUNqQyxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxZQUFZLENBQUMsQUFBQztJQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUNaLE1BQU0sSUFBSSxLQUFLLENBQ2IsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FDekUsQ0FBQztLQUNIO0lBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEFBQUM7SUFDckQsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUM5QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxFQUNqQyxXQUFXLENBQ1osQUFBQztJQUVGLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxBQUFDO0lBRTVDLE1BQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEFBQUM7SUFDckQsTUFBTSxRQUFRLEdBQUcsdUJBQXVCLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxBQUFDO0lBRXpELE9BQU87UUFBRSxRQUFRO1FBQUUsTUFBTTtLQUFFLENBQUM7Q0FDN0I7QUFFRCxlQUFlLGdCQUFnQixDQUFDLFNBQWMsRUFBaUM7SUFDN0UsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxBQUFDO0lBRXBDLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEFBQUM7SUFDbEQsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEFBQUM7SUFFNUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxBQUFDO0lBQ3RDLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQUFBQztJQUV6RCxPQUFPO1FBQUUsUUFBUTtRQUFFLE1BQU07S0FBRSxDQUFDO0NBQzdCO0FBRUQsU0FBUyxjQUFjLENBQ3JCLFNBQWMsRUFDZCxXQUEwQixFQUNWO0lBQ2hCLElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtRQUN4QixNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxBQUFDO1FBQzVDLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQUFBQztRQUNoRCxPQUFRLFNBQVM7WUFDZixLQUFLLHdCQUF3QixDQUFDO1lBQzlCLEtBQUssaUJBQWlCLENBQUM7WUFDdkIsS0FBSyx5QkFBeUIsQ0FBQztZQUMvQixLQUFLLFlBQVksQ0FBQztZQUNsQixLQUFLLDBCQUEwQjtnQkFDN0IsT0FBTyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDckQsS0FBSyx3QkFBd0IsQ0FBQztZQUM5QixLQUFLLGlCQUFpQixDQUFDO1lBQ3ZCLEtBQUssd0JBQXdCLENBQUM7WUFDOUIsS0FBSyxpQkFBaUIsQ0FBQztZQUN2QixLQUFLLDBCQUEwQixDQUFDO1lBQ2hDLEtBQUssa0JBQWtCO2dCQUNyQixPQUFPLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNyRCxLQUFLLFVBQVU7Z0JBQ2IsT0FBTyxLQUFLLENBQUM7WUFDZixLQUFLLFVBQVU7Z0JBQ2IsT0FBTyxLQUFLLENBQUM7WUFDZixLQUFLLGtCQUFrQixDQUFDO1lBQ3hCLEtBQUssV0FBVztnQkFDZCxPQUFPLE1BQU0sQ0FBQztZQUNoQixLQUFLLGtCQUFrQjtnQkFDckIsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxZQUFZLENBQUM7WUFDbEIsS0FBSywwQkFBMEI7Z0JBQzdCLE9BQU8sc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDM0M7Z0JBQ0UsT0FBTyxTQUFTLENBQUM7U0FDcEI7S0FDRixNQUFNO1FBQ0wsT0FBTyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUMxQztDQUNGO0FBRUQsU0FBUyxrQkFBa0IsQ0FDekIsU0FBYyxFQUNkLFdBQTJCLEVBQ1g7SUFDaEIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFFBQVEsQUFBQztJQUNoQyxPQUFRLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDbkIsS0FBSyxNQUFNO1lBQ1QsT0FBTyxLQUFLLENBQUM7UUFDZixLQUFLLE1BQU07WUFDVCxPQUFPLEtBQUssQ0FBQztRQUNmLEtBQUssTUFBTTtZQUNULE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxNQUFNO1lBQ1QsT0FBTyxLQUFLLENBQUM7UUFDZixLQUFLLEtBQUs7WUFDUixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzFCLE9BQU8sS0FBSyxDQUFDO2FBQ2QsTUFBTTtnQkFDTCxPQUFPLFdBQVcsQ0FBQzthQUNwQjtRQUNILEtBQUssTUFBTTtZQUFFO2dCQUNYLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDM0IsT0FBTyxNQUFNLENBQUM7aUJBQ2YsTUFBTTtvQkFDTCxPQUFPLFdBQVcsSUFBSSxZQUFZLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQztpQkFDcEQ7YUFDRjtRQUNELEtBQUssTUFBTTtZQUFFO2dCQUNYLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDM0IsT0FBTyxNQUFNLENBQUM7aUJBQ2YsTUFBTTtvQkFDTCxPQUFPLFdBQVcsSUFBSSxZQUFZLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQztpQkFDcEQ7YUFDRjtRQUNEO1lBQ0UsT0FBTyxXQUFXLENBQUM7S0FDdEI7Q0FDRjtBQUVELFNBQVMsc0JBQXNCLENBQUMsU0FBYyxFQUFrQjtJQUM5RCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsUUFBUSxBQUFDO0lBQ2hDLE9BQVEsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNuQixLQUFLLEVBQUU7WUFDTCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQ2xDLE9BQU8sYUFBYSxDQUFDO2FBQ3RCLE1BQU07Z0JBQ0wsT0FBTyxTQUFTLENBQUM7YUFDbEI7UUFDSCxLQUFLLEtBQUs7WUFDUixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzFCLE9BQU8sS0FBSyxDQUFDO2FBQ2QsTUFBTTtnQkFDTCxPQUFPLFlBQVksQ0FBQzthQUNyQjtRQUNILEtBQUssTUFBTTtZQUNULElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDM0IsT0FBTyxNQUFNLENBQUM7YUFDZixNQUFNO2dCQUNMLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7UUFDSCxLQUFLLE1BQU07WUFDVCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzNCLE9BQU8sTUFBTSxDQUFDO2FBQ2YsTUFBTTtnQkFDTCxPQUFPLEtBQUssQ0FBQzthQUNkO1FBQ0gsS0FBSyxNQUFNO1lBQ1QsT0FBTyxLQUFLLENBQUM7UUFDZixLQUFLLEtBQUs7WUFDUixPQUFPLFlBQVksQ0FBQztRQUN0QixLQUFLLE1BQU07WUFDVCxPQUFPLEtBQUssQ0FBQztRQUNmLEtBQUssTUFBTTtZQUNULE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxNQUFNO1lBQ1QsT0FBTyxLQUFLLENBQUM7UUFDZixLQUFLLE9BQU87WUFDVixPQUFPLE1BQU0sQ0FBQztRQUNoQixLQUFLLE9BQU87WUFDVixPQUFPLE1BQU0sQ0FBQztRQUNoQixLQUFLLGNBQWM7WUFDakIsT0FBTyxhQUFhLENBQUM7UUFDdkIsS0FBSyxNQUFNO1lBQ1QsT0FBTyxXQUFXLENBQUM7UUFDckI7WUFDRSxPQUFPLFNBQVMsQ0FBQztLQUNwQjtDQUNGIn0=