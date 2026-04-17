import json
from pathlib import Path
from datetime import datetime, timezone


def to_allowed_percent(value):
  try:
    n = int(value)
  except Exception:
    return 0
  if n >= 100:
    return 100
  if n >= 75:
    return 75
  if n >= 50:
    return 50
  if n >= 25:
    return 25
  return 0


def to_allowed_status(value):
  if value in ("red", "yellow", "green", "black"):
    return value
  return "green"


def iso_updated_at(date_str):
  if isinstance(date_str, str) and len(date_str) == 10:
    return f"{date_str}T00:00:00.000Z"
  return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def main():
  root = Path(__file__).resolve().parents[1]
  inp = root / "board (6).json"
  out = root / "board-6-newformat.json"

  data = json.loads(inp.read_text(encoding="utf-8"))
  board = data.get("board") or {}

  project_name = board.get("projectName") or "Imported project"
  start_date = board.get("startDate") or board.get("startIso") or datetime.now(timezone.utc).date().isoformat()
  end_date = board.get("endDate") or board.get("endIso") or start_date

  raw_tasks = data.get("tasks") or []
  by_id = {}
  children = {}
  roots = []

  for t in raw_tasks:
    tid = str(t.get("id") or "")
    if not tid:
      continue
    by_id[tid] = t
    pid = t.get("parentId")
    if pid is None:
      roots.append(tid)
    else:
      pid = str(pid)
      children.setdefault(pid, []).append(tid)

  def task_order(tid):
    t = by_id.get(tid) or {}
    o = t.get("order")
    return o if isinstance(o, int) else 0

  roots.sort(key=task_order)
  for pid, lst in children.items():
    lst.sort(key=task_order)

  ordered_ids = []
  for rid in roots:
    ordered_ids.append(rid)
    for cid in children.get(rid, []):
      ordered_ids.append(cid)

  tasks = []
  cells = []
  order_index = 0
  for tid in ordered_ids:
    t = by_id.get(tid) or {}
    pid = t.get("parentId")
    title = str(t.get("title") or "")
    if pid is not None:
      title = f"↳ {title}"

    tasks.append(
      {
        "id": tid,
        "title": title,
        "owner": str(t.get("owner") or ""),
        "order": order_index,
      }
    )
    order_index += 1

    task_cells = t.get("cells") or {}
    if isinstance(task_cells, dict):
      for date_str, v in task_cells.items():
        if not isinstance(v, dict):
          v = {}
        cells.append(
          {
            "taskId": tid,
            "date": date_str,
            "value": {"percent": to_allowed_percent(v.get("percent")), "status": to_allowed_status(v.get("status"))},
            "updatedAt": iso_updated_at(date_str),
          }
        )

  snapshot = {
    "board": {"id": "imported-board-6", "startDate": start_date, "endDate": end_date, "projectName": project_name},
    "tasks": tasks,
    "cells": cells,
  }

  out.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
  print(f"Wrote {out}")


if __name__ == "__main__":
  main()

