#!/bin/bash
# EcoTrack AI Backend Runner
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"
export PYTHONPATH="$SCRIPT_DIR"
./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
