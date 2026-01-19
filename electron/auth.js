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

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Access Granted | MeetingAI</title>
                            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap" rel="stylesheet">
                            <style>
                                :root {
                                    --primary: #46ec13;
                                    --bg: #050804;
                                    --surface: rgba(26, 37, 22, 0.7);
                                }
                                body {
                                    background-color: var(--bg);
                                    color: white;
                                    font-family: 'Outfit', sans-serif;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100vh;
                                    margin: 0;
                                    overflow: hidden;
                                    background: radial-gradient(circle at center, #1a2c15 0%, #050804 100%);
                                }
                                .glass-card {
                                    padding: 3rem;
                                    border-radius: 2.5rem;
                                    background: var(--surface);
                                    backdrop-filter: blur(20px);
                                    border: 1px solid rgba(70, 236, 19, 0.2);
                                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                                    max-width: 440px;
                                    text-align: center;
                                    transform: translateY(20px);
                                    animation: floatIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                                }
                                @keyframes floatIn {
                                    to { transform: translateY(0); opacity: 1; }
                                    from { transform: translateY(40px); opacity: 0; }
                                }
                                .success-ring {
                                    display: inline-flex;
                                    align-items: center;
                                    justify-content: center;
                                    width: 80px;
                                    height: 80px;
                                    border-radius: 50%;
                                    background: rgba(70, 236, 19, 0.1);
                                    border: 2px solid var(--primary);
                                    margin-bottom: 2rem;
                                    position: relative;
                                }
                                .checkmark {
                                    width: 40px;
                                    height: 40px;
                                    border-radius: 50%;
                                    display: block;
                                    stroke-width: 5;
                                    stroke: var(--primary);
                                    stroke-miterlimit: 10;
                                    box-shadow: inset 0px 0px 0px var(--primary);
                                    animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
                                }
                                .checkmark__circle {
                                    stroke-dasharray: 166;
                                    stroke-dashoffset: 166;
                                    stroke-width: 5;
                                    stroke-miterlimit: 10;
                                    stroke: var(--primary);
                                    fill: none;
                                    animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                                }
                                .checkmark__check {
                                    transform-origin: 50% 50%;
                                    stroke-dasharray: 48;
                                    stroke-dashoffset: 48;
                                    animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
                                }
                                @keyframes stroke {
                                    100% { stroke-dashoffset: 0; }
                                }
                                @keyframes scale {
                                    0%, 100% { transform: none; }
                                    50% { transform: scale3d(1.1, 1.1, 1); }
                                }
                                h1 { 
                                    margin: 0 0 1rem 0; 
                                    font-size: 2rem; 
                                    font-weight: 700;
                                    background: linear-gradient(to right, #fff, var(--primary));
                                    -webkit-background-clip: text;
                                    -webkit-text-fill-color: transparent;
                                }
                                p { color: #9fc992; line-height: 1.6; margin-bottom: 2rem; font-size: 1.1rem; }
                                .close-btn {
                                    background: var(--primary);
                                    color: #050804;
                                    padding: 1rem 2.5rem;
                                    border-radius: 1rem;
                                    font-weight: 700;
                                    text-decoration: none;
                                    display: inline-block;
                                    transition: all 0.3s ease;
                                    border: none;
                                    cursor: pointer;
                                    font-size: 1rem;
                                    box-shadow: 0 10px 20px rgba(70, 236, 19, 0.2);
                                }
                                .close-btn:hover { 
                                    transform: translateY(-2px);
                                    box-shadow: 0 15px 25px rgba(70, 236, 19, 0.4);
                                    background: #5fff2b;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="glass-card">
                                <div class="success-ring">
                                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                        <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                                        <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                    </svg>
                                </div>
                                <h1>Success!</h1>
                                <p>Your identity has been verified. Secure session established.</p>
                                <p>Return to App</p>
                                
                                <p style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.5;">If it stays open, you can close this tab safely.</p>
                            </div>
                            <script>
                                let seconds = 3;
                                const status = document.getElementById('status');
                                const countdown = setInterval(() => {
                                    seconds--;
                                    if (seconds <= 0) {
                                        clearInterval(countdown);
                                        window.close();
                                    } else {
                                        status.innerText = 'This window will close automatically in ' + seconds + ' seconds...';
                                    }
                                }, 1000);
                            </script>
                        </body>
                        </html>
                    `);

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
