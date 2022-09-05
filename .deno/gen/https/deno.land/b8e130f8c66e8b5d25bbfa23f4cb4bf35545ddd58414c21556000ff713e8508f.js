import { INTERNAL_PREFIX } from "../runtime/utils.ts";
export const REFRESH_JS_URL = `${INTERNAL_PREFIX}/refresh.js`;
export const ALIVE_URL = `${INTERNAL_PREFIX}/alive`;
export const BUILD_ID = Deno.env.get("DENO_DEPLOYMENT_ID") || crypto.randomUUID();
export const JS_PREFIX = `/js`;
export const DEBUG = !Deno.env.get("DENO_DEPLOYMENT_ID");
export function bundleAssetUrl(path) {
    return `${INTERNAL_PREFIX}${JS_PREFIX}/${BUILD_ID}${path}`;
}
globalThis.__FRSH_BUILD_ID = BUILD_ID;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4wLjIvc3JjL3NlcnZlci9jb25zdGFudHMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSU5URVJOQUxfUFJFRklYIH0gZnJvbSBcIi4uL3J1bnRpbWUvdXRpbHMudHNcIjtcblxuZXhwb3J0IGNvbnN0IFJFRlJFU0hfSlNfVVJMID0gYCR7SU5URVJOQUxfUFJFRklYfS9yZWZyZXNoLmpzYDtcbmV4cG9ydCBjb25zdCBBTElWRV9VUkwgPSBgJHtJTlRFUk5BTF9QUkVGSVh9L2FsaXZlYDtcbmV4cG9ydCBjb25zdCBCVUlMRF9JRCA9IERlbm8uZW52LmdldChcIkRFTk9fREVQTE9ZTUVOVF9JRFwiKSB8fFxuICBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuZXhwb3J0IGNvbnN0IEpTX1BSRUZJWCA9IGAvanNgO1xuZXhwb3J0IGNvbnN0IERFQlVHID0gIURlbm8uZW52LmdldChcIkRFTk9fREVQTE9ZTUVOVF9JRFwiKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZUFzc2V0VXJsKHBhdGg6IHN0cmluZykge1xuICByZXR1cm4gYCR7SU5URVJOQUxfUFJFRklYfSR7SlNfUFJFRklYfS8ke0JVSUxEX0lEfSR7cGF0aH1gO1xufVxuXG5nbG9iYWxUaGlzLl9fRlJTSF9CVUlMRF9JRCA9IEJVSUxEX0lEO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBDcnlwdG8ge1xuICAgIHJhbmRvbVVVSUQoKTogc3RyaW5nO1xuICB9XG5cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby12YXJcbiAgdmFyIF9fRlJTSF9CVUlMRF9JRDogc3RyaW5nO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsZUFBZSxRQUFRLHFCQUFxQixDQUFDO0FBRXRELE9BQU8sTUFBTSxjQUFjLEdBQUcsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM5RCxPQUFPLE1BQU0sU0FBUyxHQUFHLENBQUMsRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDcEQsT0FBTyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxJQUN4RCxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDdEIsT0FBTyxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9CLE9BQU8sTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBRXpELE9BQU8sU0FBUyxjQUFjLENBQUMsSUFBWSxFQUFFO0lBQzNDLE9BQU8sQ0FBQyxFQUFFLGVBQWUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztDQUM1RDtBQUVELFVBQVUsQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDIn0=