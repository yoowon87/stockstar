# StockStar

Personal stock research dashboard MVP based on the included product spec.

## Scope

- React frontend for `Dashboard`, `News`, and `Stock Detail`
- FastAPI backend with mock data APIs
- SQLite persistence seeded from local JSON files
- Live semiconductor news sync from Google News RSS
- Semiconductor-first watchlist and industry mapping
- Report-style AI insight placeholders rather than chat UX

## Run

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and expects backend at `http://localhost:8000`.

On first backend startup, `backend/storage/stockstar.db` is created and seeded from the JSON files in [`data/`](/c:/my%20projects/stockstar/data).

## Deploy

Recommended hosted setup for the current stack:

- Frontend: Firebase Hosting or Vercel
- Backend: Google Cloud Run or Railway
- Database: move away from local SQLite for real persistence

Frontend reads API base URL from `VITE_API_BASE_URL`.

### Firebase Hosting (frontend)

```bash
cd frontend
npm install
npm run build

cd ..
cp .firebaserc.example .firebaserc
# edit project id in .firebaserc
firebase deploy --only hosting
```

### Cloud Run / container backend

```bash
cd backend
docker build -t stockstar-api .
```

Environment variables for backend:

- `ALLOWED_ORIGINS=https://your-frontend-domain`
- `STOCKSTAR_DB_PATH=/data/stockstar.db`

Note: the current app still uses SQLite. For a truly reliable internet-facing deployment, replace it with a managed database or attach persistent storage.

## Current interactions

- `Generate morning briefing`: recalculates dashboard summary and top/risk industries from recent stored news
- `Sync live news`: fetches up to 10 recent live items from Google News RSS and inserts only new articles
- `Analyze this news` / `Re-analyze stock`: updates stored analysis state in SQLite

## Next steps

1. Replace mock data service with real news and market data collectors.
2. Move rule base and stock mapping fully into structured JSON or DB models.
3. Add persistence for event analyses and stock reports.
4. Replace placeholder chart bars with a real charting library.
