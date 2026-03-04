# Restaurant Carbs Finder (Node Standalone)

This app now runs as a standalone Node server and stores admin/published data in:

- `data/app-state.json`

## Run

```bash
node server.js
```

Then open from desktop or mobile browser on the same network:

- `http://<your-machine-ip>:4173/user.html`
- `http://<your-machine-ip>:4173/admin.html`

## Notes

- Admin dataset loading and publish actions write to `data/app-state.json`.
- The user page reads published restaurants from the same server-side data file.
