"""Migrate pre-tenancy data into the per-user layout.

Before this change there was one shared uploads folder, one FAISS index, and one
mind-map directory for the whole installation, so nothing records who owns what.

Two modes:

  archive (default)  Move legacy data aside into data/legacy_archive/ and leave
                     it untouched. Nothing is deleted; users re-upload. Safe
                     when more than one account exists, because assigning
                     ownership would be a guess.

  assign --user-id N Give every legacy document and mind map to user N, then
                     re-index their documents under that user's own index.

Usage:
    python scripts/migrate_to_user_scoped_storage.py            # dry run
    python scripts/migrate_to_user_scoped_storage.py --apply
    python scripts/migrate_to_user_scoped_storage.py --apply --assign-to 3
"""

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings  # noqa: E402
from app.core.context import UserContext  # noqa: E402
from app.db.auth_db import get_connection, init_db  # noqa: E402
from app.services import document_service as docs  # noqa: E402


def _legacy_paths() -> dict:
    return {
        "uploads": settings.DATA_DIR / "uploads",
        "uploaded_pdfs": settings.DATA_DIR / "uploaded_pdfs",
        "mindmaps": settings.DATA_DIR / "mindmaps",
        "vector_db": Path(settings.VECTOR_DB_PATH),
    }


def survey() -> dict:
    paths = _legacy_paths()
    files = []
    for key in ("uploads", "uploaded_pdfs"):
        directory = paths[key]
        if directory.exists():
            files.extend(p for p in directory.iterdir() if p.is_file())
    maps = (
        [p for p in paths["mindmaps"].iterdir() if p.suffix == ".json"]
        if paths["mindmaps"].exists()
        else []
    )
    with get_connection() as conn:
        users = [dict(r) for r in conn.execute("SELECT id, email FROM users ORDER BY id")]
    return {
        "documents": files,
        "mindmaps": maps,
        "has_index": paths["vector_db"].exists(),
        "users": users,
    }


def archive(apply: bool) -> None:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destination = settings.DATA_DIR / "legacy_archive" / stamp
    print(f"\nArchive target: {destination}")
    for name, path in _legacy_paths().items():
        if not path.exists():
            continue
        print(f"  move {path.name}/ -> legacy_archive/{stamp}/{name}")
        if apply:
            destination.mkdir(parents=True, exist_ok=True)
            shutil.move(str(path), str(destination / name))
    if apply:
        print("\nArchived. Nothing was deleted; users re-upload their material.")



def purge(apply: bool) -> None:
    """Delete legacy data outright. Irreversible."""
    print("\nPURGE - legacy data will be deleted permanently")
    for _name, path in _legacy_paths().items():
        if not path.exists():
            continue
        print(f"  delete {path}")
        if apply:
            shutil.rmtree(path, ignore_errors=True)
    if apply:
        print("\nLegacy documents, mind maps and the shared index are gone.")
        print("User accounts and chat history were NOT touched.")


def assign(user_id: int, apply: bool) -> None:
    with get_connection() as conn:
        row = conn.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise SystemExit(f"No user with id {user_id}")

    ctx = UserContext(user_id=int(row["id"]), email=row["email"])
    ctx.storage.ensure()
    data = survey()

    print(f"\nAssigning legacy data to user {user_id} ({row['email']})")

    for source in data["documents"]:
        target = ctx.storage.uploads_dir / source.name
        print(f"  document {source.name} -> users/{user_id}/uploads/")
        if not apply:
            continue
        shutil.copy2(source, target)
        record = docs.create_document(
            ctx,
            original_name=source.name,
            stored_name=source.name,
            byte_size=target.stat().st_size,
            content_hash=None,
        )
        # Left queued deliberately: the shared index cannot be split by user, so
        # each document is re-embedded into its owner's own index.
        docs.set_status(record["id"], "queued")

    for path in data["mindmaps"]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            print(f"  SKIP unreadable mind map {path.name}")
            continue
        print(f"  mind map {payload.get('title', path.stem)!r} -> user {user_id}")
        if not apply:
            continue
        with get_connection() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO mind_maps
                    (id, user_id, title, source_label, mode, tree_json, created_at)
                VALUES (?, ?, ?, ?, 'full', ?, ?)
                """,
                (
                    payload.get("id", path.stem),
                    user_id,
                    payload.get("title", "Untitled"),
                    payload.get("source", "Imported"),
                    json.dumps(payload.get("mindmap", {}), ensure_ascii=False),
                    payload.get("created_at", datetime.now(timezone.utc).isoformat()),
                ),
            )
            conn.commit()

    if apply:
        archive(apply=True)
        print(
            "\nDocuments are queued. Re-index them from the Library, or restart "
            "the server and use Retry — the shared index is not reusable per user."
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="perform changes (default: dry run)")
    parser.add_argument("--assign-to", type=int, help="user id to receive legacy data")
    parser.add_argument("--purge", action="store_true", help="delete legacy data permanently")
    args = parser.parse_args()

    init_db()
    data = survey()

    print("Legacy data found")
    print(f"  documents : {len(data['documents'])}")
    for path in data["documents"]:
        print(f"      {path.name}  ({path.stat().st_size / 1024:.0f} KB)")
    print(f"  mind maps : {len(data['mindmaps'])}")
    print(f"  shared idx: {'yes' if data['has_index'] else 'no'}")
    print(f"  accounts  : {len(data['users'])}")
    for user in data["users"]:
        print(f"      {user['id']}: {user['email']}")

    if not args.apply:
        print("\nDRY RUN — nothing changed. Re-run with --apply.")

    if args.purge:
        purge(args.apply)
    elif args.assign_to:
        assign(args.assign_to, args.apply)
    else:
        if len(data["users"]) > 1:
            print(
                "\nMore than one account exists, so ownership of the legacy data is "
                "ambiguous. Defaulting to archive. Use --assign-to <user_id> to "
                "give it to a specific account instead."
            )
        archive(args.apply)


if __name__ == "__main__":
    main()
