import { BrowserWindow, shell } from 'electron';
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import url from 'url';

const PORT = 42813;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

export async function googleSignIn(clientId, clientSecret) {
    if (!clientId || !clientSecret) {
        throw new Error('Google Client ID or Secret is missing in .env');
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
    });

    console.log('🔵 Auth URL generated:', authUrl.substring(0, 50) + '...');

    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            console.log(`🔵 Auth server received request: ${req.url}`);
            try {
                if (req.url.startsWith('/callback')) {
                    const qs = new url.URL(req.url, REDIRECT_URI).searchParams;
                    const code = qs.get('code');
                    console.log('🔵 Auth code received');

                    res.end('Authentication successful! You can close this tab.');

                    const { tokens } = await oauth2Client.getToken(code);
                    oauth2Client.setCredentials(tokens);

                    const ticket = await oauth2Client.verifyIdToken({
                        idToken: tokens.id_token,
                        audience: clientId,
                    });
                    const payload = ticket.getPayload();
                    console.log('🔵 Google user payload received');

                    server.close();
                    resolve({
                        success: true,
                        user: {
                            id: payload.sub,
                            name: payload.name,
                            email: payload.email,
                            picture: payload.picture,
                        }
                    });
                } else {
                    res.end('Waiting for callback...');
                }
            } catch (error) {
                console.error('❌ Callback error:', error);
                res.end('Authentication failed.');
                server.close();
                reject(error);
            }
        });

        server.on('error', (err) => {
            console.error('❌ server error:', err);
            if (err.code === 'EADDRINUSE') {
                reject(new Error(`Port ${PORT} is already in use. Please close other applications.`));
            } else {
                reject(err);
            }
        });

        server.listen(PORT, () => {
            console.log(`🔵 Local auth server listening on port ${PORT}`);
            shell.openExternal(authUrl);
        });
    });
}
