# Restaurant Carbs Finder (Node Standalone)

This app runs as a local Node server and saves admin/user publish state to:

- `data/app-state.json`

## 1) Prerequisites

- Node.js 18+ (Node 20 recommended)

Check your version:

```bash
node -v
```

## 2) Open the project folder

```bash
cd /path/to/RestaurantCarbs
```

## 3) Start the app

```bash
npm start
```

If `npm start` is unavailable in your environment, this does the same thing:

```bash
node server.js
```

You should see:

```text
RestaurantCarbs running on http://0.0.0.0:4173
```

## 4) Open it in a browser

### On your computer

- User page: `http://localhost:4173/user.html`
- Admin page: `http://localhost:4173/admin.html`

### On your phone (same Wi-Fi)

1. Find your computer's local IP address (for example `192.168.1.25`).
2. Keep the server running.
3. Open on phone:
   - User page: `http://<YOUR_IP>:4173/user.html`
   - Admin page: `http://<YOUR_IP>:4173/admin.html`

Example:

- `http://192.168.1.25:4173/user.html`

## 5) Admin flow (first-time setup)

1. Open `admin.html`.
2. Load a MenuStat dataset:
   - **Option A**: Paste dataset URL and click **Load Dataset from URL**.
   - **Option B**: Download the file and upload it in **Upload Dataset File**.
3. Check the restaurants you want to publish.
4. Click **Publish Selection**.
5. Open `user.html` to verify published restaurants are visible.

## 6) Where data is saved

All app state is persisted in:

- `data/app-state.json`

This includes:

- dataset URL source,
- parsed catalog,
- selected restaurant IDs,
- published restaurant catalog for user page.

## 7) Reset app data (optional)

If you want a clean state:

```bash
cat > data/app-state.json <<'JSON'
{
  "dataSource": {
    "datasetUrl": "https://www.menustat.org/uploads/1/4/1/6/141624194/ms_annual_data_2022.xls"
  },
  "catalog": [],
  "selectedIds": [],
  "publishedCatalog": []
}
JSON
```

Then restart server:

```bash
npm start
```


## If you see `npm ERR! enoent ... package.json`

This means npm cannot find `package.json` in your current folder.

Run these checks:

```bash
pwd
ls
```

You should see `package.json`, `server.js`, `user.html`, etc.

If not, either:

1. `cd` into the correct repo folder, or
2. pull the latest code that includes `package.json`:

```bash
git pull
```

Then start again:

```bash
npm start
```

If npm still fails, run the app directly without npm:

```bash
node server.js
```

Or use the helper script (works even if your shell is in a different folder):

```bash
/path/to/RestaurantCarbs/run-local.sh
```

## 8) Common issues

- **Port already in use**: stop the old process or run with another port:
  ```bash
  PORT=5000 npm start
  ```
- **URL load fails for MenuStat**: use manual download + upload from admin page.
- **Phone cannot connect**: verify same network and that firewall allows incoming TCP on port `4173`.


## 9) Run as a container on Linux

### Prerequisites

- Docker Engine installed on Linux
- Current user can run Docker commands (`docker ps` works)

### Build image

From the repo root:

```bash
docker build -t restaurant-carbs:latest .
```

### Run container (single command)

```bash
docker run -d   --name restaurant-carbs   -p 4173:4173   -v "$(pwd)/data:/app/data"   --restart unless-stopped   restaurant-carbs:latest
```

What this does:

- maps app port to host: `4173:4173`
- persists state file by mounting host `./data` into container `/app/data`
- auto-restarts on reboot/crash (`unless-stopped`)

### Verify container is healthy

```bash
docker ps --filter name=restaurant-carbs
curl -s http://localhost:4173/api/state | head
```

### Open in browser

- On server itself: `http://localhost:4173/user.html`
- From another device on same network: `http://<LINUX_HOST_IP>:4173/user.html`

### View logs

```bash
docker logs -f restaurant-carbs
```

### Stop / start / remove

```bash
docker stop restaurant-carbs
docker start restaurant-carbs
docker rm -f restaurant-carbs
```

### Update after code changes

```bash
docker rm -f restaurant-carbs
docker build -t restaurant-carbs:latest .
docker run -d   --name restaurant-carbs   -p 4173:4173   -v "$(pwd)/data:/app/data"   --restart unless-stopped   restaurant-carbs:latest
```

### Common Linux container issues

- **Port already in use**: change host port (`-p 5000:4173`) and open `http://<host>:5000/user.html`.
- **Permission denied writing `/app/data`**: fix host folder permissions:
  ```bash
  sudo chown -R $USER:$USER ./data
  ```
- **Cannot access from phone**: open firewall for TCP 4173 (or your mapped host port).
