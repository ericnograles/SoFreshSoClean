import { oauth2Client } from 'services/oauth.ts';
export const handler = (_req, _ctx)=>{
    return Response.redirect(oauth2Client.code.getAuthorizationUri());
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvU29GcmVzaENvQ2xlYW4vcm91dGVzL2FwaS9vYXV0aC9sb2dpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBIYW5kbGVyQ29udGV4dCB9IGZyb20gXCIkZnJlc2gvc2VydmVyLnRzXCI7XG5pbXBvcnQgeyBvYXV0aDJDbGllbnQgfSBmcm9tICdzZXJ2aWNlcy9vYXV0aC50cydcblxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IChfcmVxOiBSZXF1ZXN0LCBfY3R4OiBIYW5kbGVyQ29udGV4dCk6IFJlc3BvbnNlID0+IHtcbiAgcmV0dXJuIFJlc3BvbnNlLnJlZGlyZWN0KG9hdXRoMkNsaWVudC5jb2RlLmdldEF1dGhvcml6YXRpb25VcmkoKSk7XG59OyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxTQUFTLFlBQVksUUFBUSxtQkFBbUIsQ0FBQTtBQUdoRCxPQUFPLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBYSxFQUFFLElBQW9CLEdBQWU7SUFDeEUsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO0NBQ25FLENBQUMifQ==