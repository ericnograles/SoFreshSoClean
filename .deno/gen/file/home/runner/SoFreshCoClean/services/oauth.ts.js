import { OAuth2Client } from "oauth2";
const OAUTH_CLIENT_ID = Deno.env.get('OAUTH_CLIENT_ID');
const OAUTH_CLIENT_SECRET = Deno.env.get('OAUTH_CLIENT_SECRET');
const oauth2Client = new OAuth2Client({
    clientId: OAUTH_CLIENT_ID,
    clientSecret: OAUTH_CLIENT_SECRET,
    authorizationEndpointUri: `https://nograles.us.auth0.com/authorize`,
    tokenUri: "https://nograles.us.auth0.com/oauth/token",
    resourceEndpointHost: "nograles.us.auth0.com",
    redirectUri: "https://sofreshcoclean.grales.repl.co/api/oauth/callback",
    defaults: {
        scope: "openid profile"
    }
});
export { oauth2Client };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvU29GcmVzaENvQ2xlYW4vc2VydmljZXMvb2F1dGgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgT0F1dGgyQ2xpZW50IH0gZnJvbSBcIm9hdXRoMlwiO1xuXG5jb25zdCBPQVVUSF9DTElFTlRfSUQgPSBEZW5vLmVudi5nZXQoJ09BVVRIX0NMSUVOVF9JRCcpO1xuY29uc3QgT0FVVEhfQ0xJRU5UX1NFQ1JFVCA9IERlbm8uZW52LmdldCgnT0FVVEhfQ0xJRU5UX1NFQ1JFVCcpO1xuXG5jb25zdCBvYXV0aDJDbGllbnQgPSBuZXcgT0F1dGgyQ2xpZW50KHtcbiAgY2xpZW50SWQ6IE9BVVRIX0NMSUVOVF9JRCxcbiAgY2xpZW50U2VjcmV0OiBPQVVUSF9DTElFTlRfU0VDUkVULFxuICBhdXRob3JpemF0aW9uRW5kcG9pbnRVcmk6IGBodHRwczovL25vZ3JhbGVzLnVzLmF1dGgwLmNvbS9hdXRob3JpemVgLFxuICB0b2tlblVyaTogXCJodHRwczovL25vZ3JhbGVzLnVzLmF1dGgwLmNvbS9vYXV0aC90b2tlblwiLFxuICByZXNvdXJjZUVuZHBvaW50SG9zdDogXCJub2dyYWxlcy51cy5hdXRoMC5jb21cIixcbiAgcmVkaXJlY3RVcmk6IFwiaHR0cHM6Ly9zb2ZyZXNoY29jbGVhbi5ncmFsZXMucmVwbC5jby9hcGkvb2F1dGgvY2FsbGJhY2tcIixcbiAgZGVmYXVsdHM6IHtcbiAgICBzY29wZTogXCJvcGVuaWQgcHJvZmlsZVwiLFxuICB9LFxufSk7XG5cbmV4cG9ydCB7IG9hdXRoMkNsaWVudCB9OyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLFlBQVksUUFBUSxRQUFRLENBQUM7QUFFdEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQUFBQztBQUN4RCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEFBQUM7QUFFaEUsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUM7SUFDcEMsUUFBUSxFQUFFLGVBQWU7SUFDekIsWUFBWSxFQUFFLG1CQUFtQjtJQUNqQyx3QkFBd0IsRUFBRSxDQUFDLHVDQUF1QyxDQUFDO0lBQ25FLFFBQVEsRUFBRSwyQ0FBMkM7SUFDckQsb0JBQW9CLEVBQUUsdUJBQXVCO0lBQzdDLFdBQVcsRUFBRSwwREFBMEQ7SUFDdkUsUUFBUSxFQUFFO1FBQ1IsS0FBSyxFQUFFLGdCQUFnQjtLQUN4QjtDQUNGLENBQUMsQUFBQztBQUVILFNBQVMsWUFBWSxHQUFHIn0=