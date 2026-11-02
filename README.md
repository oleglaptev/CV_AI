# CV AI — AI-Powered Summary Analyzer & Mock Interview Coach

CV AI is a full-stack web application that helps job seekers prepare for interviews.
Users register, start a chat dialog, upload their resume (PDF), and then can:

- **Analyze a CV** — the AI (an LLM served via [OpenRouter](https://openrouter.ai/), e.g. DeepSeek) acts as an HR specialist and returns strengths, weaknesses and concrete improvement tips.
- **Run a mock interview** — the AI asks questions based on the skills and experience found in the uploaded resume; the user answers interactively in chat.
- **Detect the target profession** — the AI determines the job title the summary is written for (`check_vacancies`).
- **Manage profile & dialogs** — JWT-based authentication, dialog history, resume attachments per dialog, user settings.

## Architecture

| Component | Tech | Location | Port |
|-----------|------|----------|------|
| Frontend  | Next.js 15 (React 19, Tailwind CSS 4, axios) | `frontend/` | 3000 |
| Backend   | Django 5.2 + Django REST Framework + SimpleJWT, uvicorn ASGI | `backend/CV_AI_Project/` | 8000 |
| Reverse proxy | Nginx (serves static files, proxies `/` → frontend, `/api/` & `/admin/` → backend) | `.nginx/` | 80 (mapped to 8080) |

The whole stack is orchestrated with Docker Compose ([compose.yaml](compose.yaml)).

```
Browser ──> nginx (:8080) ──┬── /        ──> next.js frontend (:3000)
                            ├── /api/    ──> django backend (:8000)
                            └── /admin/  ──> django admin (:8000)
Backend ──> OpenRouter LLM API (DeepSeek)
```

## Features

- Email-based registration / login / password restore with **JWT** auth tokens (`rest_framework_simplejwt`)
- CRUD for chat dialogs and messages per user
- **PDF resume upload** with text extraction via `pdfplumber`; extracted text is injected into the LLM context
- CV analysis, mock-interview mode and vacancy-name detection prompts built into the backend (`CV_AI_app/llm_api.py`)
- Django Admin panel for managing users, dialogs, messages and resumes
- CORS enabled for development

## Requirements

- **Docker + Docker Compose** (recommended way to run the project), or
- **Python 3.13** and **Node.js 22+** for manual/local development
- An **OpenRouter API key** (the app calls `https://openrouter.ai/api/v1/chat/completions`)

## Installation

### Option A — Docker Compose (recommended)

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd CV_AI_project
   ```

2. Create the backend environment file `backend/CV_AI_Project/.env`:

   ```env
   DEEPSEEK_API_KEY=sk-or-v1-your-openrouter-key
   LLM=deepseek/deepseek-chat
   ```

3. Build and start all services (nginx, backend, frontend):

   ```bash
   docker compose up --build
   ```

4. Open **http://localhost:8080** in your browser. The Django admin is available at
   **http://localhost:8080/admin/**.

### Option B — Manual (development)

Backend:

```bash
cd backend/CV_AI_Project
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# create .env with DEEPSEEK_API_KEY and LLM (see above)

python manage.py migrate
python manage.py createsuperuser  # optional, for /admin/
uvicorn CV_AI_Project.asgi:application --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install

# create frontend/.env.local:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

npm run dev                       # http://localhost:3000
```

> Note: the frontend reads the backend address from `NEXT_PUBLIC_API_BASE_URL`, so this
> variable must be defined at build/run time, otherwise API requests will fail.

## Usage

### Web UI

1. Open the app and **register** with email + password (or log in / restore password).
2. Create a new dialog in the sidebar.
3. **Upload a PDF CV** into the dialog — the backend extracts its text.
4. Click **"Проанализируй резюме"** (Analyze CV) to get strengths / weaknesses / recommendations.
5. Start a **mock interview** (`start_mock_interview`) — answer the AI's questions in the input field,
   finish with the "Завершить интервью" ('End interview') button.
6. Edit your name/email in **Settings**; rename or delete dialogs from the sidebar.

### API examples

```bash
# Register
curl -X POST http://localhost:8080/api/register/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret", "first_name": "Ivan", "last_name": "Petrov"}'
# → {"tokens": {"access": "...", "refresh": "..."}, "user": {...}}

# Create a dialog
curl -X POST http://localhost:8080/api/dialogs/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"title": "My first dialog"}'
# → {"dialog_id": 1, "title": "My first dialog"}

# Upload a resume (PDF) to the dialog
curl -X POST http://localhost:8080/api/dialogs/1/attachments/ \
  -H "Authorization: Bearer $ACCESS" \
  -F "file=@resume.pdf"

# Send a message and get the AI response
curl -X POST http://localhost:8080/api/dialogs/1/messages/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"message": "Проанализируй резюме."}'
# → {"user_message": "...", "bot_response": "### Сильные стороны ..."}
```

Main endpoints (all under `/api/`, JWT `Authorization: Bearer <access>` required except auth routes):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register/` | Create account, returns JWT tokens |
| POST | `/api/login/` | Login with email/password |
| POST | `/api/restore-password/` | Reset password by email |
| GET/PUT/PATCH | `/api/user/` | Get / update current user |
| GET/POST | `/api/dialogs/` | List / create dialogs |
| PATCH/DELETE | `/api/dialogs/{id}/` | Rename / delete a dialog |
| GET/POST | `/api/dialogs/{id}/messages/` | History / send message (AI reply) |
| GET/POST | `/api/dialogs/{id}/attachments/` | List / upload resume PDFs |

## Testing & Linting

```bash
# Backend tests (Django)
cd backend/CV_AI_Project && python manage.py test

# Frontend lint
cd frontend && npm run lint
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Project status

This project is a student/course work. Development may slow down after
the course ends — feel free to fork it or reach out if you want to become a maintainer.

## License

[MIT](https://choosealicense.com/licenses/mit/)
