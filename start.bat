@echo off
setlocal

cd /d "%~dp0"

if not exist "server\.env" (
  copy "server\.env.example" "server\.env" >nul
  echo Created server\.env from template. Review it before exposing the app publicly.
)

echo If you do not use Qdrant yet, set RAG_ENABLED=false in server\.env for easier first run.
pnpm dev
