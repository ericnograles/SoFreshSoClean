import { OAuth2GrantBase } from "./grant_base.ts";
/**
 * Implements the OAuth 2.0 refresh token grant.
 *
 * See https://tools.ietf.org/html/rfc6749#section-6
 */ export class RefreshTokenGrant extends OAuth2GrantBase {
    constructor(client){
        super(client);
    }
    /** Request new tokens from the authorization server using the given refresh token. */ async refresh(refreshToken, options = {}) {
        const body = {
            "grant_type": "refresh_token",
            "refresh_token": refreshToken
        };
        if (typeof options?.scope === "string") {
            body.scope = options.scope;
        } else if (Array.isArray(options?.scope)) {
            body.scope = options.scope.join(" ");
        }
        const headers = {};
        if (typeof this.client.config.clientSecret === "string") {
            // Note: RFC 6749 doesn't really say how a non-confidential client should
            // prove its identity when making a refresh token request, so we just don't
            // do anything and let the user deal with that (e.g. using the  requestOptions)
            const { clientId , clientSecret  } = this.client.config;
            headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
        }
        const req = this.buildRequest(this.client.config.tokenUri, {
            method: "POST",
            body,
            headers
        }, options.requestOptions);
        const accessTokenResponse = await fetch(req);
        return this.parseTokenResponse(accessTokenResponse);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2F1dGgyQHYwLjIuNi9zcmMvcmVmcmVzaF90b2tlbl9ncmFudC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZXF1ZXN0T3B0aW9ucywgVG9rZW5zIH0gZnJvbSBcIi4vdHlwZXMudHNcIjtcbmltcG9ydCB7IE9BdXRoMkNsaWVudCB9IGZyb20gXCIuL29hdXRoMl9jbGllbnQudHNcIjtcbmltcG9ydCB7IE9BdXRoMkdyYW50QmFzZSB9IGZyb20gXCIuL2dyYW50X2Jhc2UudHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBSZWZyZXNoVG9rZW5PcHRpb25zIHtcbiAgc2NvcGU/OiBzdHJpbmcgfCBzdHJpbmdbXTtcbiAgcmVxdWVzdE9wdGlvbnM/OiBSZXF1ZXN0T3B0aW9ucztcbn1cblxuLyoqXG4gKiBJbXBsZW1lbnRzIHRoZSBPQXV0aCAyLjAgcmVmcmVzaCB0b2tlbiBncmFudC5cbiAqXG4gKiBTZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY3NDkjc2VjdGlvbi02XG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZyZXNoVG9rZW5HcmFudCBleHRlbmRzIE9BdXRoMkdyYW50QmFzZSB7XG4gIGNvbnN0cnVjdG9yKGNsaWVudDogT0F1dGgyQ2xpZW50KSB7XG4gICAgc3VwZXIoY2xpZW50KTtcbiAgfVxuXG4gIC8qKiBSZXF1ZXN0IG5ldyB0b2tlbnMgZnJvbSB0aGUgYXV0aG9yaXphdGlvbiBzZXJ2ZXIgdXNpbmcgdGhlIGdpdmVuIHJlZnJlc2ggdG9rZW4uICovXG4gIGFzeW5jIHJlZnJlc2goXG4gICAgcmVmcmVzaFRva2VuOiBzdHJpbmcsXG4gICAgb3B0aW9uczogUmVmcmVzaFRva2VuT3B0aW9ucyA9IHt9LFxuICApOiBQcm9taXNlPFRva2Vucz4ge1xuICAgIGNvbnN0IGJvZHk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICBcImdyYW50X3R5cGVcIjogXCJyZWZyZXNoX3Rva2VuXCIsXG4gICAgICBcInJlZnJlc2hfdG9rZW5cIjogcmVmcmVzaFRva2VuLFxuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIChvcHRpb25zPy5zY29wZSkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGJvZHkuc2NvcGUgPSBvcHRpb25zLnNjb3BlO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zPy5zY29wZSkpIHtcbiAgICAgIGJvZHkuc2NvcGUgPSBvcHRpb25zLnNjb3BlLmpvaW4oXCIgXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAodHlwZW9mIHRoaXMuY2xpZW50LmNvbmZpZy5jbGllbnRTZWNyZXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIC8vIE5vdGU6IFJGQyA2NzQ5IGRvZXNuJ3QgcmVhbGx5IHNheSBob3cgYSBub24tY29uZmlkZW50aWFsIGNsaWVudCBzaG91bGRcbiAgICAgIC8vIHByb3ZlIGl0cyBpZGVudGl0eSB3aGVuIG1ha2luZyBhIHJlZnJlc2ggdG9rZW4gcmVxdWVzdCwgc28gd2UganVzdCBkb24ndFxuICAgICAgLy8gZG8gYW55dGhpbmcgYW5kIGxldCB0aGUgdXNlciBkZWFsIHdpdGggdGhhdCAoZS5nLiB1c2luZyB0aGUgIHJlcXVlc3RPcHRpb25zKVxuICAgICAgY29uc3QgeyBjbGllbnRJZCwgY2xpZW50U2VjcmV0IH0gPSB0aGlzLmNsaWVudC5jb25maWc7XG4gICAgICBoZWFkZXJzLkF1dGhvcml6YXRpb24gPSBgQmFzaWMgJHtidG9hKGAke2NsaWVudElkfToke2NsaWVudFNlY3JldH1gKX1gO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcSA9IHRoaXMuYnVpbGRSZXF1ZXN0KHRoaXMuY2xpZW50LmNvbmZpZy50b2tlblVyaSwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGJvZHksXG4gICAgICBoZWFkZXJzLFxuICAgIH0sIG9wdGlvbnMucmVxdWVzdE9wdGlvbnMpO1xuXG4gICAgY29uc3QgYWNjZXNzVG9rZW5SZXNwb25zZSA9IGF3YWl0IGZldGNoKHJlcSk7XG5cbiAgICByZXR1cm4gdGhpcy5wYXJzZVRva2VuUmVzcG9uc2UoYWNjZXNzVG9rZW5SZXNwb25zZSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxTQUFTLGVBQWUsUUFBUSxpQkFBaUIsQ0FBQztBQU9sRDs7OztHQUlHLENBQ0gsT0FBTyxNQUFNLGlCQUFpQixTQUFTLGVBQWU7SUFDcEQsWUFBWSxNQUFvQixDQUFFO1FBQ2hDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUNmO0lBRUQsc0ZBQXNGLENBQ3RGLE1BQU0sT0FBTyxDQUNYLFlBQW9CLEVBQ3BCLE9BQTRCLEdBQUcsRUFBRSxFQUNoQjtRQUNqQixNQUFNLElBQUksR0FBMkI7WUFDbkMsWUFBWSxFQUFFLGVBQWU7WUFDN0IsZUFBZSxFQUFFLFlBQVk7U0FDOUIsQUFBQztRQUVGLElBQUksT0FBUSxPQUFPLEVBQUUsS0FBSyxBQUFDLEtBQUssUUFBUSxFQUFFO1lBQ3hDLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDeEMsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN0QztRQUVELE1BQU0sT0FBTyxHQUEyQixFQUFFLEFBQUM7UUFDM0MsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksS0FBSyxRQUFRLEVBQUU7WUFDdkQseUVBQXlFO1lBQ3pFLDJFQUEyRTtZQUMzRSwrRUFBK0U7WUFDL0UsTUFBTSxFQUFFLFFBQVEsQ0FBQSxFQUFFLFlBQVksQ0FBQSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEFBQUM7WUFDdEQsT0FBTyxDQUFDLGFBQWEsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN4RTtRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ3pELE1BQU0sRUFBRSxNQUFNO1lBQ2QsSUFBSTtZQUNKLE9BQU87U0FDUixFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQUFBQztRQUUzQixNQUFNLG1CQUFtQixHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxBQUFDO1FBRTdDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUM7S0FDckQ7Q0FDRiJ9