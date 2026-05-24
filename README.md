# GHN Booking Meeting Room

Hệ thống đặt phòng họp nội bộ GHN.

## Yêu cầu hệ thống

- Node.js v18+
- PostgreSQL 14+

## Cài đặt & chạy local

### 1. Clone repo

```bash
git clone https://github.com/<username>/<repo-name>.git
cd <repo-name>
```

### 2. Cài Backend

```bash
cd backend
npm install
cp .env.example .env
# Mở .env và điền thông tin PostgreSQL của bạn
```

**Sửa file `backend/.env`:**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ghn_meeting_room_booking
DB_USER=<postgres_username>
DB_PASSWORD=<postgres_password>
JWT_SECRET=any_random_secret_string
PORT=5001
```

**Tạo database:**
```bash
psql -U postgres -c "CREATE DATABASE ghn_meeting_room_booking;"
```

**Chạy backend:**
```bash
node src/server.js
# Server chạy tại http://localhost:5001
```

### 3. Cài Frontend

Mở terminal mới:
```bash
cd frontend
npm install
npm run dev
# App chạy tại http://localhost:5173
```

### 4. Tạo tài khoản admin (lần đầu)

```bash
cd backend
node scripts/seed.js   # hoặc xem QUICK_START.md để seed data
```

## Tài khoản mặc định sau seed

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@ghn.vn | admin123 |

## Cấu trúc project

```
booking_meeting/
├── backend/      # Node.js + Express + Sequelize
└── frontend/     # React + Vite + TailwindCSS
```
# ghn_booking_meeting
