# Farma Consulta — Monorepo (React + NestJS)

Migração da versão Streamlit original para:
- **frontend/** — React + Vite + TypeScript
- **backend/** — NestJS + Prisma + PostgreSQL + JWT

## Como rodar

### 1. Backend

```bash
cd backend
cp .env.example .env        # ajuste DATABASE_URL e JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run start:dev           # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env        # ajuste VITE_API_URL se precisar
npm install
npm run dev                 # http://localhost:5173
```

## Mapeamento da versão antiga -> nova

| Streamlit                          | Novo                                              |
|-------------------------------------|----------------------------------------------------|
| `config.py`                         | `backend/src/config/app.config.ts` + `frontend/src/config.ts` |
| `database/db.py` (xlsx)             | `backend/prisma/schema.prisma` (Postgres) + services |
| `auth/login.py`                     | `backend/src/auth/*` + `frontend/src/pages/LoginPage.tsx` |
| `components/sidebar.py`             | `frontend/src/components/TopNav.tsx`               |
| `Cliente/*.py`                      | `frontend/src/pages/cliente/*`                     |
| `Farmaceutico/*.py`                 | `frontend/src/pages/farmaceutico/*`                |
| `home.py`                           | `frontend/src/pages/HomePage.tsx`                  |
| `components/video_call.py`          | `frontend/src/pages/farmaceutico/ConsultaOnlinePage.tsx` |

Senhas agora são armazenadas com hash (bcrypt) — no original ficavam em texto puro no Excel.
