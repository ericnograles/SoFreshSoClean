import { oauth2Client, getUserProfile } from 'services/oauth.ts';
import { setSession } from 'repositories/session_repository.ts';
import { setCookie } from "cookie";
export const handler = {
    async GET (req) {
        let oauthResponse = await oauth2Client.code.getToken(req.url);
        let profile = await getUserProfile(oauthResponse.accessToken);
        let sessionId = await setSession(profile.sub, oauthResponse);
        let response = new Response(JSON.stringify({
            ...oauthResponse
        }), {
            headers: {
                "Content-Type": "application/json"
            }
        });
        setCookie(response.headers, {
            name: 'session_id',
            value: sessionId,
            maxAge: 3600
        });
        return response;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvU29GcmVzaFNvQ2xlYW4vcm91dGVzL2FwaS9vYXV0aC9jYWxsYmFjay50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBIYW5kbGVycyB9IGZyb20gXCIkZnJlc2gvc2VydmVyLnRzXCI7XG5pbXBvcnQgeyBvYXV0aDJDbGllbnQsIGdldFVzZXJQcm9maWxlIH0gZnJvbSAnc2VydmljZXMvb2F1dGgudHMnXG5pbXBvcnQgeyBzZXRTZXNzaW9uIH0gZnJvbSAncmVwb3NpdG9yaWVzL3Nlc3Npb25fcmVwb3NpdG9yeS50cyc7XG5pbXBvcnQgeyBzZXRDb29raWUgfSBmcm9tIFwiY29va2llXCI7XG5cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IEhhbmRsZXJzID0ge1xuICBhc3luYyBHRVQocmVxKSB7XG4gICAgbGV0IG9hdXRoUmVzcG9uc2UgPSBhd2FpdCBvYXV0aDJDbGllbnQuY29kZS5nZXRUb2tlbihyZXEudXJsKTtcbiAgICBsZXQgcHJvZmlsZSA9IGF3YWl0IGdldFVzZXJQcm9maWxlKG9hdXRoUmVzcG9uc2UuYWNjZXNzVG9rZW4pO1xuICAgIGxldCBzZXNzaW9uSWQgPSBhd2FpdCBzZXRTZXNzaW9uKHByb2ZpbGUuc3ViLCBvYXV0aFJlc3BvbnNlKTtcbiAgICBsZXQgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyAuLi5vYXV0aFJlc3BvbnNlIH0pLCB7XG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgfSk7XG4gICAgc2V0Q29va2llKHJlc3BvbnNlLmhlYWRlcnMsIHsgbmFtZTogJ3Nlc3Npb25faWQnLCB2YWx1ZTogc2Vzc2lvbklkLCBtYXhBZ2U6IDM2MDAgfSlcbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH0sXG59O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLFNBQVMsWUFBWSxFQUFFLGNBQWMsUUFBUSxtQkFBbUIsQ0FBQTtBQUNoRSxTQUFTLFVBQVUsUUFBUSxvQ0FBb0MsQ0FBQztBQUNoRSxTQUFTLFNBQVMsUUFBUSxRQUFRLENBQUM7QUFHbkMsT0FBTyxNQUFNLE9BQU8sR0FBYTtJQUMvQixNQUFNLEdBQUcsRUFBQyxHQUFHLEVBQUU7UUFDYixJQUFJLGFBQWEsR0FBRyxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQUFBQztRQUM5RCxJQUFJLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEFBQUM7UUFDOUQsSUFBSSxTQUFTLEdBQUcsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQUFBQztRQUM3RCxJQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQUUsR0FBRyxhQUFhO1NBQUUsQ0FBQyxFQUFFO1lBQ2hFLE9BQU8sRUFBRTtnQkFBRSxjQUFjLEVBQUUsa0JBQWtCO2FBQUU7U0FDaEQsQ0FBQyxBQUFDO1FBQ0gsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7WUFBRSxJQUFJLEVBQUUsWUFBWTtZQUFFLEtBQUssRUFBRSxTQUFTO1lBQUUsTUFBTSxFQUFFLElBQUk7U0FBRSxDQUFDO1FBQ25GLE9BQU8sUUFBUSxDQUFDO0tBQ2pCO0NBQ0YsQ0FBQyJ9