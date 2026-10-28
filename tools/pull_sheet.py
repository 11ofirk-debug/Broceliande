"""Pull the game data from the published Google Sheet into data/*.csv (M2j §5).

Reads data/sheet_sources.json, downloads every tab's published CSV and writes it to
data/<tab>.csv. Python 3, standard library only. Touches no other files. If any tab fails,
nothing is written, so data/ never ends up half old and half new.

Run from anywhere:  python tools/pull_sheet.py   (or double-click tools/pull_sheet.bat)
Google can take a few minutes to refresh the published data after an edit.
"""

import csv
import io
import json
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
URL = "https://docs.google.com/spreadsheets/d/e/{published_id}/pub?gid={gid}&single=true&output=csv"


def download(url):
    with urllib.request.urlopen(url, timeout=30) as res:
        text = res.read().decode("utf-8-sig")
    # An unpublished sheet answers with a sign-in page rather than an HTTP error.
    if text.lstrip().startswith("<"):
        raise ValueError("got a web page, not CSV")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def data_rows(text):
    # Rows after the header, skipping blank rows (as the game does).
    rows = list(csv.reader(io.StringIO(text)))[1:]
    return sum(1 for r in rows if any(cell.strip() for cell in r))


def main():
    try:
        sources = json.loads((DATA / "sheet_sources.json").read_text(encoding="utf-8"))
        published_id = sources["publishedId"]
        tabs = sources["tabs"]
    except (OSError, ValueError, KeyError) as err:
        print(f"Could not read data/sheet_sources.json: {err}")
        return 1

    pulled, failed = {}, []
    for tab, gid in tabs.items():
        name = f"{tab}.csv"
        try:
            text = download(URL.format(published_id=published_id, gid=gid))
        except Exception as err:  # network, HTTP or content error: report it and carry on
            print(f"{name:<16} ✗  {err}")
            failed.append(tab)
            continue
        pulled[tab] = text
        print(f"{name:<16} ✓  {data_rows(text)} rows")

    if failed:
        print()
        print(f"Failed: {', '.join(failed)}. Nothing was written.")
        print("Check that the sheet is published (File > Share > Publish to web) and that the")
        print("tab gids in data/sheet_sources.json match the sheet's tabs.")
        return 1

    for tab, text in pulled.items():
        (DATA / f"{tab}.csv").write_text(text, encoding="utf-8", newline="\n")
    print()
    print(f"Wrote {len(pulled)} tabs to data/. Commit them when you're happy.")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # the ✓ / ✗ marks in a Windows console
    sys.exit(main())
