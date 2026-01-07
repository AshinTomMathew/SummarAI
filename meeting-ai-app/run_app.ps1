# Run MeetingAI in Production Mode
$env:NODE_ENV="production"
npm run build
npx electron .
