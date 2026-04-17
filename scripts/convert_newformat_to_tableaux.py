import json
import re
from pathlib import Path


FORBIDDEN = re.compile(r"[.,\s:|]")


def safe_project_name(name: str) -> str:
  name = (name or "").strip()
  if not name:
    return "Imported_project"
  name = FORBIDDEN.sub("_", name)
  name = re.sub(r"_+", "_", name)
  return name.strip("_") or "Imported_project"


def main() -> None:
  root = Path(__file__).resolve().parents[1]
  inp = root / "board-6-newformat.json"
  out = root / "board-6-tableaux.json"

  src = json.loads(inp.read_text(encoding="utf-8"))
  board = src.get("board") or {}
  tasks = src.get("tasks") or []
  cells = src.get("cells") or []

  project_name = safe_project_name(board.get("projectName") or "Imported project")
  start_date = board.get("startDate")
  end_date = board.get("endDate")

  cell_map = {}
  for c in cells:
    task_id = str(c.get("taskId") or "")
    date = str(c.get("date") or "")
    if not task_id or not date:
      continue
    value = c.get("value") or {}
    key = f"{task_id}::{date}"
    cell_map[key] = {
      "percent": value.get("percent", 0),
      "status": value.get("status", "green"),
    }

  dst = {
    "board": {
      "projectName": project_name,
      "startDate": start_date,
      "endDate": end_date,
    },
    "tasks": tasks,
    "cells": cell_map,
  }

  out.write_text(json.dumps(dst, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
  print(f"Wrote {out}")


if __name__ == "__main__":
  main()

