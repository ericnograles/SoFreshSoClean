import { oauth2Client } from 'services/oauth.ts';
export const handler = (_req, _ctx)=>{
    return Response.redirect(oauth2Client.code.getAuthorizationUri());
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9ydW5uZXIvU29GcmVzaFNvQ2xlYW4vcm91dGVzL2xvZ2luLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEhhbmRsZXJDb250ZXh0IH0gZnJvbSBcIiRmcmVzaC9zZXJ2ZXIudHNcIjtcbmltcG9ydCB7IG9hdXRoMkNsaWVudCB9IGZyb20gJ3NlcnZpY2VzL29hdXRoLnRzJ1xuXG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gKF9yZXE6IFJlcXVlc3QsIF9jdHg6IEhhbmRsZXJDb250ZXh0KTogUmVzcG9uc2UgPT4ge1xuICByZXR1cm4gUmVzcG9uc2UucmVkaXJlY3Qob2F1dGgyQ2xpZW50LmNvZGUuZ2V0QXV0aG9yaXphdGlvblVyaSgpKTtcbn07Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLFNBQVMsWUFBWSxRQUFRLG1CQUFtQixDQUFBO0FBR2hELE9BQU8sTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFhLEVBQUUsSUFBb0IsR0FBZTtJQUN4RSxPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUM7Q0FDbkUsQ0FBQyJ9