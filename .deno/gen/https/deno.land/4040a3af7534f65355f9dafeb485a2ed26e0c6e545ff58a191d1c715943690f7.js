import { fromFileUrl } from "../deps.ts";
import * as deno from "./deno.ts";
import { mediaTypeToLoader, transformRawIntoContent } from "./shared.ts";
export async function load(infoCache, url, options) {
    switch(url.protocol){
        case "http:":
        case "https:":
        case "data:":
            return await loadFromCLI(infoCache, url, options);
        case "file:":
            {
                const res = await loadFromCLI(infoCache, url, options);
                res.watchFiles = [
                    fromFileUrl(url.href)
                ];
                return res;
            }
    }
    return null;
}
async function loadFromCLI(infoCache, specifier, options) {
    const specifierRaw = specifier.href;
    if (!infoCache.has(specifierRaw)) {
        const { modules , redirects  } = await deno.info(specifier, {
            importMap: options.importMapURL?.href
        });
        for (const module of modules){
            infoCache.set(module.specifier, module);
        }
        for (const [specifier1, redirect] of Object.entries(redirects)){
            const redirected = infoCache.get(redirect);
            if (!redirected) {
                throw new TypeError("Unreachable.");
            }
            infoCache.set(specifier1, redirected);
        }
    }
    const module = infoCache.get(specifierRaw);
    if (!module) {
        throw new TypeError("Unreachable.");
    }
    if (module.error) throw new Error(module.error);
    if (!module.local) throw new Error("Module not downloaded yet.");
    const mediaType = module.mediaType ?? "Unknown";
    const loader = mediaTypeToLoader(mediaType);
    const raw = await Deno.readFile(module.local);
    const contents = transformRawIntoContent(raw, mediaType);
    return {
        contents,
        loader
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXNidWlsZF9kZW5vX2xvYWRlckAwLjUuMi9zcmMvbmF0aXZlX2xvYWRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlc2J1aWxkLCBmcm9tRmlsZVVybCB9IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5pbXBvcnQgKiBhcyBkZW5vIGZyb20gXCIuL2Rlbm8udHNcIjtcbmltcG9ydCB7IG1lZGlhVHlwZVRvTG9hZGVyLCB0cmFuc2Zvcm1SYXdJbnRvQ29udGVudCB9IGZyb20gXCIuL3NoYXJlZC50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvYWRPcHRpb25zIHtcbiAgaW1wb3J0TWFwVVJMPzogVVJMO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZChcbiAgaW5mb0NhY2hlOiBNYXA8c3RyaW5nLCBkZW5vLk1vZHVsZUVudHJ5PixcbiAgdXJsOiBVUkwsXG4gIG9wdGlvbnM6IExvYWRPcHRpb25zLFxuKTogUHJvbWlzZTxlc2J1aWxkLk9uTG9hZFJlc3VsdCB8IG51bGw+IHtcbiAgc3dpdGNoICh1cmwucHJvdG9jb2wpIHtcbiAgICBjYXNlIFwiaHR0cDpcIjpcbiAgICBjYXNlIFwiaHR0cHM6XCI6XG4gICAgY2FzZSBcImRhdGE6XCI6XG4gICAgICByZXR1cm4gYXdhaXQgbG9hZEZyb21DTEkoaW5mb0NhY2hlLCB1cmwsIG9wdGlvbnMpO1xuICAgIGNhc2UgXCJmaWxlOlwiOiB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBsb2FkRnJvbUNMSShpbmZvQ2FjaGUsIHVybCwgb3B0aW9ucyk7XG4gICAgICByZXMud2F0Y2hGaWxlcyA9IFtmcm9tRmlsZVVybCh1cmwuaHJlZildO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRGcm9tQ0xJKFxuICBpbmZvQ2FjaGU6IE1hcDxzdHJpbmcsIGRlbm8uTW9kdWxlRW50cnk+LFxuICBzcGVjaWZpZXI6IFVSTCxcbiAgb3B0aW9uczogTG9hZE9wdGlvbnMsXG4pOiBQcm9taXNlPGVzYnVpbGQuT25Mb2FkUmVzdWx0PiB7XG4gIGNvbnN0IHNwZWNpZmllclJhdyA9IHNwZWNpZmllci5ocmVmO1xuICBpZiAoIWluZm9DYWNoZS5oYXMoc3BlY2lmaWVyUmF3KSkge1xuICAgIGNvbnN0IHsgbW9kdWxlcywgcmVkaXJlY3RzIH0gPSBhd2FpdCBkZW5vLmluZm8oc3BlY2lmaWVyLCB7XG4gICAgICBpbXBvcnRNYXA6IG9wdGlvbnMuaW1wb3J0TWFwVVJMPy5ocmVmLFxuICAgIH0pO1xuICAgIGZvciAoY29uc3QgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgIGluZm9DYWNoZS5zZXQobW9kdWxlLnNwZWNpZmllciwgbW9kdWxlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbc3BlY2lmaWVyLCByZWRpcmVjdF0gb2YgT2JqZWN0LmVudHJpZXMocmVkaXJlY3RzKSkge1xuICAgICAgY29uc3QgcmVkaXJlY3RlZCA9IGluZm9DYWNoZS5nZXQocmVkaXJlY3QpO1xuICAgICAgaWYgKCFyZWRpcmVjdGVkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJVbnJlYWNoYWJsZS5cIik7XG4gICAgICB9XG4gICAgICBpbmZvQ2FjaGUuc2V0KHNwZWNpZmllciwgcmVkaXJlY3RlZCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbW9kdWxlID0gaW5mb0NhY2hlLmdldChzcGVjaWZpZXJSYXcpO1xuICBpZiAoIW1vZHVsZSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJVbnJlYWNoYWJsZS5cIik7XG4gIH1cblxuICBpZiAobW9kdWxlLmVycm9yKSB0aHJvdyBuZXcgRXJyb3IobW9kdWxlLmVycm9yKTtcbiAgaWYgKCFtb2R1bGUubG9jYWwpIHRocm93IG5ldyBFcnJvcihcIk1vZHVsZSBub3QgZG93bmxvYWRlZCB5ZXQuXCIpO1xuICBjb25zdCBtZWRpYVR5cGUgPSBtb2R1bGUubWVkaWFUeXBlID8/IFwiVW5rbm93blwiO1xuXG4gIGNvbnN0IGxvYWRlciA9IG1lZGlhVHlwZVRvTG9hZGVyKG1lZGlhVHlwZSk7XG5cbiAgY29uc3QgcmF3ID0gYXdhaXQgRGVuby5yZWFkRmlsZShtb2R1bGUubG9jYWwpO1xuICBjb25zdCBjb250ZW50cyA9IHRyYW5zZm9ybVJhd0ludG9Db250ZW50KHJhdywgbWVkaWFUeXBlKTtcblxuICByZXR1cm4geyBjb250ZW50cywgbG9hZGVyIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBa0IsV0FBVyxRQUFRLFlBQVksQ0FBQztBQUNsRCxZQUFZLElBQUksTUFBTSxXQUFXLENBQUM7QUFDbEMsU0FBUyxpQkFBaUIsRUFBRSx1QkFBdUIsUUFBUSxhQUFhLENBQUM7QUFNekUsT0FBTyxlQUFlLElBQUksQ0FDeEIsU0FBd0MsRUFDeEMsR0FBUSxFQUNSLE9BQW9CLEVBQ2tCO0lBQ3RDLE9BQVEsR0FBRyxDQUFDLFFBQVE7UUFDbEIsS0FBSyxPQUFPLENBQUM7UUFDYixLQUFLLFFBQVEsQ0FBQztRQUNkLEtBQUssT0FBTztZQUNWLE9BQU8sTUFBTSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxLQUFLLE9BQU87WUFBRTtnQkFDWixNQUFNLEdBQUcsR0FBRyxNQUFNLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxBQUFDO2dCQUN2RCxHQUFHLENBQUMsVUFBVSxHQUFHO29CQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2lCQUFDLENBQUM7Z0JBQ3pDLE9BQU8sR0FBRyxDQUFDO2FBQ1o7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFDO0NBQ2I7QUFFRCxlQUFlLFdBQVcsQ0FDeEIsU0FBd0MsRUFDeEMsU0FBYyxFQUNkLE9BQW9CLEVBQ1c7SUFDL0IsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLElBQUksQUFBQztJQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUNoQyxNQUFNLEVBQUUsT0FBTyxDQUFBLEVBQUUsU0FBUyxDQUFBLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ3hELFNBQVMsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUk7U0FDdEMsQ0FBQyxBQUFDO1FBQ0gsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLENBQUU7WUFDNUIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3pDO1FBQ0QsS0FBSyxNQUFNLENBQUMsVUFBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUU7WUFDN0QsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQUFBQztZQUMzQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE1BQU0sSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7YUFDckM7WUFDRCxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztTQUN0QztLQUNGO0lBRUQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQUFBQztJQUMzQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxJQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztLQUNyQztJQUVELElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDakUsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsSUFBSSxTQUFTLEFBQUM7SUFFaEQsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEFBQUM7SUFFNUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQUFBQztJQUM5QyxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLEFBQUM7SUFFekQsT0FBTztRQUFFLFFBQVE7UUFBRSxNQUFNO0tBQUUsQ0FBQztDQUM3QiJ9