"""The matchmaker API. docs/api-contract.md is the specification; change it first."""
import json
import os
import re
import secrets
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import numpy as np
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from engine import DATA, MODEL_NAME, TOP_N, Engine

STORE = Path(os.environ.get("STORE_PATH", DATA / "guests.json"))
META = json.loads((DATA / "meta.json").read_text())
ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

engine: Engine | None = None
guests: dict[str, dict] = {}  # id -> {"profile": Guest, "vector": [...], "bookmarks": [...]}
lock = Lock()


def save():
    temp = STORE.with_suffix(".tmp")
    temp.write_text(json.dumps(guests, ensure_ascii=False))
    temp.replace(STORE)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def create_guest(profile):
    guest_id = f"g_{secrets.token_urlsafe(5)}"
    guest = {"id": guest_id, "updatedAt": now(), **profile}
    guests[guest_id] = {"profile": guest, "vector": engine.embed_guest(guest).tolist(), "bookmarks": []}
    return guest


@asynccontextmanager
async def lifespan(_app):
    global engine
    engine = Engine()
    if STORE.exists():
        guests.update(json.loads(STORE.read_text()))
    if not guests:
        for sample in META["sampleProfiles"]:
            create_guest(sample["profile"])
        save()
    yield


app = FastAPI(title="Trade Fair AI Matchmaker", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    # Phones and laptops on the demo Wi-Fi.
    allow_origin_regex=r"http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+",
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class ApiError(Exception):
    def __init__(self, status, code, message, details=None):
        self.status, self.code, self.message, self.details = status, code, message, details


def envelope(status, code, message, details=None):
    error = {"code": code, "message": message}
    if details:
        error["details"] = details
    return JSONResponse({"error": error}, status_code=status)


@app.exception_handler(ApiError)
async def on_api_error(_request, exc):
    return envelope(exc.status, exc.code, exc.message, exc.details)


@app.exception_handler(StarletteHTTPException)
async def on_http_error(_request, exc):
    if exc.status_code == 404:
        return envelope(404, "NOT_FOUND", "That address does not exist.")
    return envelope(exc.status_code, "BAD_REQUEST", "That request is not supported.")


@app.exception_handler(RequestValidationError)
async def on_validation_error(_request, _exc):
    return envelope(400, "BAD_REQUEST", "That request could not be read.")


@app.exception_handler(Exception)
async def on_unexpected(_request, exc):
    import traceback

    traceback.print_exception(exc)
    return envelope(500, "INTERNAL_ERROR", "Something went wrong on our side.")


def validate(body):
    if not isinstance(body, dict):
        raise ApiError(400, "BAD_REQUEST", "The request body must be a JSON object.")
    fields = []

    def fail(field, message):
        fields.append({"field": field, "message": message})

    def text(field, label, maximum=80):
        value = body.get(field)
        if not isinstance(value, str) or not value.strip():
            fail(field, f"Please enter your {label}")
            return ""
        if len(value.strip()) > maximum:
            fail(field, f"Please keep your {label} under {maximum} characters")
        return value.strip()

    def choice(field, options, label):
        value = body.get(field)
        if value not in META[options]:
            fail(field, f"Please choose your {label}")
        return value

    profile = {
        "name": text("name", "name"),
        "industry": choice("industry", "industries", "industry"),
        "jobRole": text("jobRole", "job role"),
        "seniority": choice("seniority", "seniorities", "seniority"),
        "companySize": choice("companySize", "companySizes", "company size"),
        "region": choice("region", "regions", "region"),
    }
    interests = body.get("interests")
    if not isinstance(interests, list) or not interests:
        fail("interests", "Pick at least one interest")
    elif len(set(map(str, interests))) != len(interests) or any(i not in META["taxonomy"] for i in interests):
        fail("interests", "Pick interests from the list, without repeats")
    profile["interests"] = interests

    free_text = body.get("freeText")
    if not isinstance(free_text, str):
        fail("freeText", "Free text must be text; send an empty string if there is none")
    elif len(free_text) > 1000:
        fail("freeText", "Please keep this under 1000 characters")
    profile["freeText"] = free_text

    if "optIn" in body:
        if isinstance(body["optIn"], bool):
            profile["optIn"] = body["optIn"]
        else:
            fail("optIn", "Consent must be true or false")

    if fields:
        raise ApiError(400, "VALIDATION_ERROR", "Some profile fields are missing or invalid.", {"fields": fields})
    return profile


async def read_body(request: Request):
    try:
        return json.loads(await request.body())
    except (ValueError, UnicodeDecodeError):
        raise ApiError(400, "BAD_REQUEST", "The request body is not valid JSON.")


def record_of(guest_id):
    record = guests.get(guest_id)
    if not record:
        raise ApiError(404, "GUEST_NOT_FOUND", f"No guest with id {guest_id}")
    return record


def ranking(record):
    if engine is None:
        raise ApiError(503, "ENGINE_UNAVAILABLE", "Matching is starting up. Please try again.")
    return engine.rank(record["profile"], np.array(record["vector"], dtype=np.float32))


@app.get("/api/health")
def health():
    return {"ok": True, "db": STORE.parent.exists(), "model": MODEL_NAME if engine else "loading"}


@app.get("/api/meta")
def meta():
    return META


@app.post("/api/guests", status_code=201)
async def post_guest(request: Request):
    profile = validate(await read_body(request))
    with lock:
        guest = create_guest(profile)
        save()
    return guest


@app.get("/api/guests/{guest_id}")
def get_guest(guest_id: str):
    return record_of(guest_id)["profile"]


@app.put("/api/guests/{guest_id}")
async def put_guest(guest_id: str, request: Request):
    record = record_of(guest_id)
    profile = validate(await read_body(request))
    guest = {"id": guest_id, "updatedAt": now(), **profile}
    with lock:
        # The embedding follows the profile, so the next recommendations reflect the edit.
        record["profile"] = guest
        record["vector"] = engine.embed_guest(guest).tolist()
        save()
    return guest


@app.get("/api/guests/{guest_id}/recommendations")
def recommendations(guest_id: str):
    record = record_of(guest_id)
    started = time.perf_counter()
    ranked = ranking(record)
    return {
        "results": ranked[:TOP_N],
        "latencyMs": round((time.perf_counter() - started) * 1000, 1),
        "total": len(ranked),
    }


@app.get("/api/guests/{guest_id}/bookmarks")
def get_bookmarks(guest_id: str):
    return {"exhibitorIds": record_of(guest_id)["bookmarks"]}


@app.put("/api/guests/{guest_id}/bookmarks/{exhibitor_id}")
def put_bookmark(guest_id: str, exhibitor_id: str):
    record = record_of(guest_id)
    if exhibitor_id not in engine.by_id:
        raise ApiError(404, "EXHIBITOR_NOT_FOUND", f"No exhibitor with id {exhibitor_id}")
    with lock:
        if exhibitor_id not in record["bookmarks"]:
            record["bookmarks"].append(exhibitor_id)
            save()
    return {"exhibitorIds": record["bookmarks"]}


@app.delete("/api/guests/{guest_id}/bookmarks/{exhibitor_id}")
def delete_bookmark(guest_id: str, exhibitor_id: str):
    record = record_of(guest_id)
    with lock:
        if exhibitor_id in record["bookmarks"]:
            record["bookmarks"].remove(exhibitor_id)
            save()
    return {"exhibitorIds": record["bookmarks"]}


def natural(text):
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", text)]


@app.get("/api/guests/{guest_id}/route")
def route(guest_id: str):
    record = record_of(guest_id)
    saved = set(record["bookmarks"])
    stalls = [m for m in ranking(record) if m["exhibitor"]["id"] in saved] if saved else []
    halls: dict[str, list] = {}
    for match in sorted(stalls, key=lambda m: natural(m["exhibitor"]["booth"])):
        halls.setdefault(match["exhibitor"]["hall"], []).append(match)
    return {"halls": [{"hall": hall, "stalls": halls[hall]} for hall in sorted(halls)]}
