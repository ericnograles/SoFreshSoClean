export const osType = (()=>{
    // deno-lint-ignore no-explicit-any
    const { Deno  } = globalThis;
    if (typeof Deno?.build?.os === "string") {
        return Deno.build.os;
    }
    // deno-lint-ignore no-explicit-any
    const { navigator  } = globalThis;
    if (navigator?.appVersion?.includes?.("Win")) {
        return "windows";
    }
    return "linux";
})();
export const isWindows = osType === "windows";
export const isLinux = osType === "linux";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE1MC4wL191dGlsL29zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjIgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmV4cG9ydCB0eXBlIE9TVHlwZSA9IFwid2luZG93c1wiIHwgXCJsaW51eFwiIHwgXCJkYXJ3aW5cIjtcblxuZXhwb3J0IGNvbnN0IG9zVHlwZTogT1NUeXBlID0gKCgpID0+IHtcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgY29uc3QgeyBEZW5vIH0gPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgaWYgKHR5cGVvZiBEZW5vPy5idWlsZD8ub3MgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gRGVuby5idWlsZC5vcztcbiAgfVxuXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIGNvbnN0IHsgbmF2aWdhdG9yIH0gPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgaWYgKG5hdmlnYXRvcj8uYXBwVmVyc2lvbj8uaW5jbHVkZXM/LihcIldpblwiKSkge1xuICAgIHJldHVybiBcIndpbmRvd3NcIjtcbiAgfVxuXG4gIHJldHVybiBcImxpbnV4XCI7XG59KSgpO1xuXG5leHBvcnQgY29uc3QgaXNXaW5kb3dzID0gb3NUeXBlID09PSBcIndpbmRvd3NcIjtcbmV4cG9ydCBjb25zdCBpc0xpbnV4ID0gb3NUeXBlID09PSBcImxpbnV4XCI7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsT0FBTyxNQUFNLE1BQU0sR0FBVyxDQUFDLElBQU07SUFDbkMsbUNBQW1DO0lBQ25DLE1BQU0sRUFBRSxJQUFJLENBQUEsRUFBRSxHQUFHLFVBQVUsQUFBTyxBQUFDO0lBQ25DLElBQUksT0FBTyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsS0FBSyxRQUFRLEVBQUU7UUFDdkMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztLQUN0QjtJQUVELG1DQUFtQztJQUNuQyxNQUFNLEVBQUUsU0FBUyxDQUFBLEVBQUUsR0FBRyxVQUFVLEFBQU8sQUFBQztJQUN4QyxJQUFJLFNBQVMsRUFBRSxVQUFVLEVBQUUsUUFBUSxHQUFHLEtBQUssR0FBRztRQUM1QyxPQUFPLFNBQVMsQ0FBQztLQUNsQjtJQUVELE9BQU8sT0FBTyxDQUFDO0NBQ2hCLENBQUMsRUFBRSxDQUFDO0FBRUwsT0FBTyxNQUFNLFNBQVMsR0FBRyxNQUFNLEtBQUssU0FBUyxDQUFDO0FBQzlDLE9BQU8sTUFBTSxPQUFPLEdBQUcsTUFBTSxLQUFLLE9BQU8sQ0FBQyJ9