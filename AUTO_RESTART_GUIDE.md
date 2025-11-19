# Auto-Restart Scripts

Three scripts have been added to prevent services from staying down:

## `start-frontend.sh`
Monitors and auto-restarts the frontend if it crashes. Run with:
```bash
./start-frontend.sh
```

## `start-backend.sh`
Monitors and auto-restarts the backend if it crashes. Run with:
```bash
./start-backend.sh
```

## `start-all.sh`
Starts both frontend and backend with auto-restart enabled:
```bash
./start-all.sh
```

The frontend is currently running. To use auto-restart from now on:
1. Stop current frontend (Ctrl+C in its terminal)
2. Run `./start-frontend.sh` instead

These scripts will automatically restart if the process crashes (but not if you stop them with Ctrl+C).
