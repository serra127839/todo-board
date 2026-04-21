from __future__ import annotations

import argparse
from pathlib import Path


def extract_json_object(text: str, start: int) -> str:
    if start >= len(text) or text[start] != "{":
        raise ValueError("JSON inválido: no empieza por '{'.")
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
                continue
            if ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue

        if ch == '"':
            in_str = True
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    raise ValueError("JSON inválido: no se encontró el cierre '}'.")


def extract_embedded_payload(html: str) -> str:
    marker = '<script id="tableaux-embedded" type="application/json">'
    start = 0
    found: str | None = None
    while True:
        i = html.find(marker, start)
        if i == -1:
            if found is None:
                raise ValueError("No se encontró el payload JSON embebido (tableaux-embedded).")
            return found
        j = i + len(marker)
        while j < len(html) and html[j] in " \t\r\n":
            j += 1
        if j < len(html) and html[j] == "{":
            found = extract_json_object(html, j)
        start = j


def inject_before_body_close(html: str, tag: str) -> str:
    needle = "</body>"
    idx = html.lower().rfind(needle)
    if idx == -1:
        raise ValueError("No se encontró </body> en la plantilla.")
    return html[:idx] + tag + "\n" + html[idx:]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--saved", required=True, help="HTML guardado que contiene el estado (tableaux_*.html).")
    ap.add_argument("--base", required=True, help="Plantilla base (por ejemplo tableaux2.html).")
    ap.add_argument("--out", required=True, help="Ruta de salida (por ejemplo tableaux_YYYYMMDD_HHMMSS.html).")
    args = ap.parse_args()

    saved_html = Path(args.saved).read_text(encoding="utf-8")
    payload = extract_embedded_payload(saved_html)
    script_tag = f'<script id="tableaux-embedded" type="application/json">{payload}</script>'

    base_html = Path(args.base).read_text(encoding="utf-8")
    out_html = inject_before_body_close(base_html, script_tag)

    Path(args.out).write_text(out_html, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
