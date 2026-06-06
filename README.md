# Ray Uber App

Ray Uber App is a React frontend for a distributed ride-hailing demo built around Ray-style worker orchestration.

The project demonstrates how a ride order can move through a distributed system: a user creates a ride request, the system assigns and updates the order status, and an admin dashboard observes the cluster, workers, queue pressure, CPU usage, and autoscaling behavior.

## What This Project Does

- Provides a rider UI for creating and tracking ride orders.
- Provides an admin UI for monitoring orders and cluster summary metrics.
- Supports mock data for frontend-only demos and real backend APIs for integration.
- Uses SSE updates for live order and cluster status changes.

## Screens

- `/` - rider app
- `/admin` - Ray admin dashboard

## Rider App

The rider app simulates a user-facing Uber-like flow:

- Enter pickup and destination locations.
- View the current estimated wait time and surge status.
- Choose a ride type.
- Create a ride order.
- Track the order through statuses such as pending, matching, driver assigned, on trip, and completed.

## Admin Dashboard

The admin dashboard is used to observe the distributed system:

- Recent and active orders.
- Alive worker count, per-node and total CPU usage, and pending resource demand.
- Autoscaler cooldown, last action, and scaling history.

## API Modes

The frontend can run in two modes:

| Mode | Purpose | Source |
| --- | --- | --- |
| Mock API | Run and demo the UI without a backend | `src/api/mockApi.js` |
| Real API | Connect to the backend API and SSE server | `src/api/realApi.js` |

The selected mode is controlled by `REACT_APP_USE_MOCK_API`.

## Backend Connection

When using the real API mode, the frontend connects to:

```text
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_SSE_URL=http://localhost:8000/sse
```

The backend API contract is documented in:

```text
docs/uber-api-v3.md
```

Main backend endpoints used by the app:

- `POST /orders` - create a ride order.
- `GET /orders` - fetch orders for the admin dashboard.
- `GET /cluster/eta` - fetch the estimated rider wait time.
- `GET /cluster/status` - fetch worker and cluster metrics.
- `GET /cluster/scaling-history` - fetch recent scale up/down events.
- `GET /sse` - receive live order and cluster updates.

Cluster ETA, status, cooldown, scaling history, and SSE heartbeat are aligned
with backend PR #9.

### Pending Order Cancellation Integration

The matching screen currently has a cancel button, but it only resets the
frontend state. The backend Order Actor continues running because the
cancellation endpoint is not implemented yet.

The required contract is documented in `docs/uber-api-v3.md`:

- `POST /orders/{order_id}/cancel` - cancel an order in `pending` or `matching`.
- Stop the corresponding Ray Order Actor and update its status to `cancelled`.
- Push the resulting `cancelled` status through SSE.

## Project Structure

```text
Ray-app/
├── docs/
│   ├── order-cancellation-integration.md
│   └── uber-api-v3.md
├── public/
├── src/
│   ├── api/
│   │   ├── api.js
│   │   ├── mockApi.js
│   │   └── realApi.js
│   ├── App.js
│   ├── RayAdminApp.jsx
│   ├── RideApp.jsx
│   └── ...
├── .env.development
├── .env.production
├── package.json
├── package-lock.json
└── README.md
```

## Requirements

- Node.js
- npm

## Installation

```bash
npm install
```

## Development

Development mode uses frontend mock data by default. After cloning the project,
run:

```bash
npm install
npm start
```

To connect to the real backend instead, run:

```bash
printf 'REACT_APP_USE_MOCK_API=false\n' > .env.development
npm install
npm start
```

To switch back to frontend mock data, run:

```bash
printf 'REACT_APP_USE_MOCK_API=true\n' > .env.development
npm start
```

Restart `npm start` whenever the API mode changes. Backend URLs remain
configurable through `REACT_APP_API_BASE_URL` and `REACT_APP_SSE_URL`.

Open:

```text
http://localhost:3000
http://localhost:3000/admin
```

## Production Build

```bash
npm run build
```

Production output is generated in:

```text
build/
```

Production mode uses the value configured in `.env.production`.

## Available Scripts

### `npm start`

Runs the app in development mode.

### `npm test`

Runs the test runner.

### `npm run build`

Builds the app for production.

## Branch Note

Current branch:

```text
refactor/app-structure
```

This branch contains the React frontend and API integration structure for the Ray Uber distributed ride-hailing demo.
