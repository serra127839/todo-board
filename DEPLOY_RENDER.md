# Deploy to Render (free tier)

This app can run as a single public URL (frontend + REST API + WebSocket) from the same Express server/port.

## 1) Prepare a Git repository

- Create a GitHub repository and push this project to it.

## 2) Create a Render Web Service

- Go to https://render.com/
- New → Web Service
- Connect your GitHub repo

### Settings

- **Environment**: Node
- **Build command**:
  - `npm install && npm run build`
- **Start command**:
  - `npm run start`

### Environment variables

- `SIMPLE_PASSWORD`: set your shared password
- (Optional) `NODE_ENV`: Render sets this for you, but if needed set it to `production`

Render will automatically inject `PORT` (required by this server).

## 3) Use it

- Open the public URL Render gives you.
- Users will see a password screen and then the shared board.

## Notes about the free tier

- Free tier services can sleep when idle (first request after inactivity may be slow).
- The SQLite file is stored on the instance filesystem. If Render restarts/redeploys the service, data may be lost unless you add a persistent disk (may require a paid plan). Use **Export** regularly as backup.

