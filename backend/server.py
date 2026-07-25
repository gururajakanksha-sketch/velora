"""Velora — AI Life Architecture Platform backend (v0.3)."""
from __future__ import annotations

import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Velora API", version="0.3.0")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("velora")

# Load seed data from external json to keep this file readable
SEED_PATH = ROOT_DIR / "seed.json"
with open(SEED_PATH, "r", encoding="utf-8") as f:
    SEED = json.load(f)

QUOTES = SEED["quotes"]
DREAM_ACHIEVEMENTS = SEED["achievements"]
LIFE_PROMPTS = SEED["life_prompts"]
BOARD_LIBRARY = SEED["board_library"]
SCHOLARSHIPS = SEED["scholarships"]
UNIVERSITIES = SEED["universities"]
HIDDEN_COURSES = SEED["hidden_courses"]
MUNS = SEED["muns"]
COUNTRIES = SEED["countries"]
ARTICLES = SEED["articles"]
STICKERS = SEED["stickers"]
BASE_NEWS = SEED["news"]
CONTACT = SEED["contact"]


# ------------------ MODELS ------------------
class SessionRequest(BaseModel):
    session_token: Optional[str] = None
    session_id: Optional[str] = None


class OnboardingPayload(BaseModel):
    dream_resume: List[str] = []
    custom_achievements: List[str] = []
    life_prompts: List[str] = []
    board_pins: List[dict] = []


class TaskCategory(BaseModel):
    category: str = "general"  # general | daily | monthly | yearly


class TaskCreate(BaseModel):
    title: str
    detail: Optional[str] = None
    kind: str = "task"
    due: Optional[str] = None
    source: Optional[dict] = None
    xp: int = 10
    category: str = "general"
    order: Optional[int] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    detail: Optional[str] = None
    due: Optional[str] = None
    category: Optional[str] = None
    order: Optional[int] = None


class TaskReorder(BaseModel):
    category: str
    ids: List[str]


class CollectionItem(BaseModel):
    kind: str
    ref_id: str
    payload: Optional[dict] = None  # freeform (for news items etc)


class ProfilePic(BaseModel):
    picture_base64: str


class RecommendFilters(BaseModel):
    kind: str  # "countries" | "universities"
    fields: List[str] = []
    max_fees_inr_lakhs: Optional[float] = None
    wants_pr: Optional[bool] = None
    region: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    level: Optional[str] = None
    tags: List[str] = []


class VisionBoardItem(BaseModel):
    id: str
    kind: str  # image | text | sticker
    x: float
    y: float
    w: float
    h: float
    rotation: float = 0
    z: int = 1
    # image
    url: Optional[str] = None
    # text
    text: Optional[str] = None
    font: Optional[str] = None
    color: Optional[str] = None
    fontSize: Optional[int] = None
    # sticker
    sticker: Optional[str] = None


class VisionBoardPayload(BaseModel):
    id: Optional[str] = None
    title: str = "My Vision"
    background: str = "paper"  # paper | warm | cool | dark
    items: List[VisionBoardItem] = []


class PregradSection(BaseModel):
    id: str
    title: str
    entries: List[dict] = []


class PregradPayload(BaseModel):
    mode: str = "fun"  # fun | formal
    header: dict = {}
    photo_base64: Optional[str] = None
    sections: List[PregradSection] = []


# ------------------ AUTH HELPERS ------------------
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[len("Bearer "):].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User missing")
    return user


# ------------------ PUBLIC ------------------
@api.get("/")
async def root():
    return {"app": "Velora", "org": "Mission Velora", "status": "ok"}


@api.get("/quotes")
async def get_quotes():
    return {"quotes": QUOTES}


@api.get("/contact")
async def contact():
    return CONTACT


@api.get("/onboarding/library")
async def onboarding_library():
    return {
        "achievements": DREAM_ACHIEVEMENTS,
        "life_prompts": LIFE_PROMPTS,
        "board_images": BOARD_LIBRARY,
        "stickers": STICKERS,
        "color_stickers": SEED.get("color_stickers", []),
    }


# ------------------ AUTH ------------------
@api.post("/auth/session")
async def create_session(payload: SessionRequest, request: Request):
    session_token = payload.session_token
    profile: Optional[dict] = None

    if payload.session_id and not session_token:
        async with httpx.AsyncClient(timeout=15) as h:
            r = await h.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_id},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        profile = r.json()
        session_token = profile.get("session_token")

    if not session_token:
        raise HTTPException(status_code=400, detail="session_token or session_id required")

    if profile is None:
        async with httpx.AsyncClient(timeout=15) as h:
            r = await h.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_token},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_token")
        profile = r.json()

    email = (profile.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email on profile")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": profile.get("name") or email.split("@")[0],
            "picture": profile.get("picture"),
            "onboarding_complete": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user}


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@api.put("/profile/picture")
async def update_picture(payload: ProfilePic, user: dict = Depends(get_current_user)):
    # Basic size guard (data URL prefix + base64)
    if len(payload.picture_base64) > 3_500_000:
        raise HTTPException(status_code=413, detail="Picture too large (max ~2.5MB)")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"picture_base64": payload.picture_base64, "picture_updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": fresh}


# ------------------ EXPLORE ------------------
SOURCES = {
    "scholarships": SCHOLARSHIPS,
    "universities": UNIVERSITIES,
    "hidden_courses": HIDDEN_COURSES,
    "muns": MUNS,
    "countries": COUNTRIES,
}


def _filter(
    items: List[dict],
    q: Optional[str],
    tag: Optional[str],
    country: Optional[str] = None,
    state: Optional[str] = None,
    field: Optional[str] = None,
    max_fees: Optional[float] = None,
) -> List[dict]:
    out = items
    if q:
        ql = q.lower()
        def _searchable(x):
            return " ".join([
                str(x.get(k, "")) for k in ("title", "summary", "why", "country", "region", "field", "at", "tags", "state", "city")
            ]).lower()
        out = [i for i in out if ql in _searchable(i)]
    if tag and tag != "all":
        tl = tag.lower()
        def _match(x):
            tags = x.get("tags", []) or []
            return (
                tl in [str(t).lower() for t in tags]
                or tl == str(x.get("country", "")).lower()
                or tl == str(x.get("region", "")).lower()
                or tl == str(x.get("state", "")).lower()
            )
        out = [i for i in out if _match(i)]
    if country:
        cl = country.lower()
        out = [i for i in out if str(i.get("country", "")).lower() == cl]
    if state:
        sl = state.lower()
        out = [i for i in out if str(i.get("state", "")).lower() == sl]
    if field:
        fl = field.lower().strip()
        def _has_field(x):
            majors = [str(m).lower().strip() for m in (x.get("best_majors") or [])]
            field_str = str(x.get("field", "")).lower()
            # split field csv into tokens
            tokens = set(majors) | {t.strip() for t in field_str.split(",") if t.strip()}
            # exact-token or clear phrase match; also allow field substring only if token >= 4 chars
            if fl in tokens:
                return True
            for tk in tokens:
                if fl == tk:
                    return True
                if len(fl) >= 4 and (fl in tk or tk in fl):
                    return True
            return False
        out = [i for i in out if _has_field(i)]
    if max_fees is not None:
        def _ok_fees(x):
            f = x.get("fees_inr_lakhs")
            if f is None or f == "":
                return True  # unknown fees pass
            try:
                return float(f) <= max_fees
            except Exception:
                return True
        out = [i for i in out if _ok_fees(i)]
    return out


@api.get("/explore")
async def explore(
    kind: str,
    q: Optional[str] = None,
    tag: Optional[str] = None,
    country: Optional[str] = None,
    state: Optional[str] = None,
    field: Optional[str] = None,
    max_fees_inr_lakhs: Optional[float] = None,
):
    if kind not in SOURCES:
        raise HTTPException(status_code=404, detail="Unknown kind")
    return {
        "items": _filter(
            SOURCES[kind], q, tag,
            country=country, state=state, field=field, max_fees=max_fees_inr_lakhs,
        )
    }


@api.get("/explore/filters/options")
async def explore_filter_options(kind: str):
    """Return available filter values for a kind. Used by the UI dropdowns."""
    if kind not in SOURCES:
        raise HTTPException(status_code=404, detail="Unknown kind")
    items = SOURCES[kind]
    countries = sorted({str(i.get("country", "")).strip() for i in items if i.get("country")})
    # states are keyed by country for nested filtering
    states_by_country: dict[str, set[str]] = {}
    for i in items:
        c = str(i.get("country", "")).strip()
        s = str(i.get("state", "")).strip()
        if c and s:
            states_by_country.setdefault(c, set()).add(s)
    fields = set()
    for i in items:
        for m in (i.get("best_majors") or []):
            if m:
                fields.add(str(m).strip())
        # scholarship items use "field" as CSV string
        f = i.get("field")
        if isinstance(f, str):
            for x in f.split(","):
                x = x.strip()
                if x:
                    fields.add(x)
        elif isinstance(f, list):
            for x in f:
                if x:
                    fields.add(str(x).strip())
    return {
        "countries": countries,
        "states_by_country": {k: sorted(v) for k, v in states_by_country.items()},
        "fields": sorted(fields),
        "budget_buckets_inr_lakhs": [1, 2, 3, 5, 10, 20, 50, 100],
    }


@api.get("/explore/{kind}/{item_id}")
async def explore_detail(kind: str, item_id: str):
    if kind not in SOURCES:
        raise HTTPException(status_code=404, detail="Unknown kind")
    for item in SOURCES[kind]:
        if item.get("id") == item_id:
            return item
    raise HTTPException(status_code=404, detail="Not found")


@api.post("/explore/recommend")
async def recommend(payload: RecommendFilters):
    """Filter countries or universities by requirements and rank."""
    if payload.kind not in ("countries", "universities"):
        raise HTTPException(status_code=400, detail="kind must be countries or universities")
    items = SOURCES[payload.kind]
    scored = []
    for it in items:
        score = 0
        reasons = []
        if payload.max_fees_inr_lakhs is not None:
            f = it.get("fees_inr_lakhs")
            if isinstance(f, (int, float)) and f <= payload.max_fees_inr_lakhs:
                score += 3
                reasons.append(f"within your budget (~₹{f}L/yr)")
        if payload.wants_pr:
            if it.get("pr_friendly"):
                score += 3
                reasons.append("PR-friendly")
        if payload.region and str(it.get("region", "")).lower() == payload.region.lower():
            score += 2
        if payload.country and str(it.get("country", "")).lower() == payload.country.lower():
            score += 2
        if payload.state and str(it.get("state", "")).lower() == payload.state.lower():
            score += 3
        if payload.level and payload.level.lower() in str(it.get("level", "")).lower():
            score += 1
        if payload.fields:
            majors = " ".join([str(x) for x in (it.get("best_majors") or it.get("field") or [])]).lower()
            for m in payload.fields:
                if m.lower() in majors:
                    score += 2
                    reasons.append(f"strong in {m}")
        if payload.tags:
            itags = [str(t).lower() for t in it.get("tags", []) or []]
            for t in payload.tags:
                if t.lower() in itags:
                    score += 1
                    reasons.append(f"matches '{t}'")
        if score > 0:
            scored.append({"item": it, "score": score, "reasons": reasons[:3]})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"items": scored[:25]}


# ------------------ ONBOARDING + BLUEPRINT ------------------
def _tags_from_onboarding(payload: OnboardingPayload) -> List[str]:
    tags: list[str] = []
    id_to_ach = {a["id"]: a for a in DREAM_ACHIEVEMENTS}
    id_to_life = {p["id"]: p for p in LIFE_PROMPTS}
    id_to_board = {i.get("id"): i.get("tags", "") for i in BOARD_LIBRARY}
    for a in payload.dream_resume:
        if a in id_to_ach:
            tags.append(id_to_ach[a]["tag"])
    for l in payload.life_prompts:
        if l in id_to_life:
            tags.append(id_to_life[l]["label"].lower())
    for pin in payload.board_pins:
        t = pin.get("tags") or id_to_board.get(pin.get("id", ""), "")
        if t:
            tags.extend([x.strip() for x in str(t).split(",") if x.strip()])
    return tags


async def _generate_blueprint(user: dict, payload: OnboardingPayload) -> dict:
    tags = _tags_from_onboarding(payload)
    custom = payload.custom_achievements
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system = (
            "You are Velora's Future Blueprint engine. You help teenagers (14-19) "
            "explore possible futures. You NEVER assign personality labels or claim certainty. "
            "You surface unusual, interdisciplinary opportunities, not obvious ones. "
            "Return STRICT compact JSON only, no prose, no code fences."
        )
        prompt = f"""Given a teenager's future signals, produce a compact JSON object with these keys exactly:

{{
  "themes": [3-5 short lowercase-hyphenated theme strings extracted from the signals],
  "one_line_summary": "a warm, non-pushy 1-line reflection of their interests (no labels)",
  "career_seeds": [ 3 items, each: {{"title": "", "why": "one sentence tying to their signals", "first_step": "concrete tiny thing to try this week"}} ],
  "hidden_paths": [ 3 items, each: {{"title": "unusual interdisciplinary path", "why": "", "first_step": ""}} ],
  "recommended_scholarship_ids": [3 ids from this pool: {[s['id'] for s in SCHOLARSHIPS[:20]]}],
  "recommended_university_ids": [3 ids from this pool: {[u['id'] for u in UNIVERSITIES[:20]]}],
  "recommended_hidden_course_ids": [3 ids from this pool: {[h['id'] for h in HIDDEN_COURSES[:20]]}],
  "recommended_country_ids": [3 ids from this pool: {[c['id'] for c in COUNTRIES[:20]]}],
  "recommended_mun_ids": [2 ids from this pool: {[m['id'] for m in MUNS[:20]]}],
  "side_quests": [ 3 items, each: {{"title": "short, adventurous", "detail": "one sentence", "xp": 20 }} ]
}}

Signals:
- Selected achievement tags: {tags}
- Custom stated dreams: {custom}
- Total board pins: {len(payload.board_pins)}
"""
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"blueprint-{user['user_id']}-{datetime.now(timezone.utc).timestamp()}",
            system_message=system,
        ).with_model("gemini", "gemini-3.1-pro-preview")
        resp = await chat.send_message(UserMessage(text=prompt))
        text = (resp or "").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        blueprint = json.loads(text)
        blueprint["_source"] = "gemini-3.1-pro-preview"
    except Exception as e:
        log.exception("AI blueprint failed, using fallback: %s", e)
        top = sorted(set(tags), key=lambda x: tags.count(x), reverse=True)[:5]
        blueprint = {
            "themes": top or ["curiosity", "exploration"],
            "one_line_summary": "You lean toward building things across fields — let's play with a few directions.",
            "career_seeds": [
                {"title": "Behavioural product designer", "why": "You picked design + people-focused things.", "first_step": "Redesign one screen of your favourite app this week."},
                {"title": "Climate technologist", "why": "Your board touches sustainability + tech.", "first_step": "Read one recent article from Canary Media."},
                {"title": "Global storyteller", "why": "You value travel and impact.", "first_step": "Photograph one unnoticed thing where you live today."},
            ],
            "hidden_paths": [
                {"title": "Computational biology", "why": "Blends code and life sciences.", "first_step": "Watch a 10-min YouTube on protein folding."},
                {"title": "Space law", "why": "A tiny, fast-growing field.", "first_step": "Read the Wikipedia page on the Outer Space Treaty."},
                {"title": "Digital anthropology", "why": "Combines humans + technology.", "first_step": "Journal one observation about how people use phones today."},
            ],
            "recommended_scholarship_ids": [s["id"] for s in SCHOLARSHIPS[:3]],
            "recommended_university_ids": [u["id"] for u in UNIVERSITIES[:3]],
            "recommended_hidden_course_ids": [h["id"] for h in HIDDEN_COURSES[:3]],
            "recommended_country_ids": [c["id"] for c in COUNTRIES[:3]],
            "recommended_mun_ids": [m["id"] for m in MUNS[:2]],
            "side_quests": [
                {"title": "Design your gap-year map", "detail": "Sketch one country per continent you'd visit and why.", "xp": 20},
                {"title": "The 20-minute rabbit hole", "detail": "Pick a hidden course and read about it for 20 minutes.", "xp": 15},
                {"title": "Portfolio zero", "detail": "Create one Notion/Docs page listing three things you've made.", "xp": 25},
            ],
            "_source": "fallback",
        }
    blueprint["generated_at"] = datetime.now(timezone.utc).isoformat()
    return blueprint


@api.post("/onboarding/complete")
async def complete_onboarding(payload: OnboardingPayload, user: dict = Depends(get_current_user)):
    await db.onboarding.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "user_id": user["user_id"],
            "dream_resume": payload.dream_resume,
            "custom_achievements": payload.custom_achievements,
            "life_prompts": payload.life_prompts,
            "board_pins": payload.board_pins,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    blueprint = await _generate_blueprint(user, payload)
    await db.blueprints.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"user_id": user["user_id"], **blueprint}},
        upsert=True,
    )
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"onboarding_complete": True}})
    return {"ok": True, "blueprint": blueprint}


@api.get("/blueprint")
async def get_blueprint(user: dict = Depends(get_current_user)):
    bp = await db.blueprints.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not bp:
        raise HTTPException(status_code=404, detail="No blueprint yet")
    return {"blueprint": bp}


@api.post("/blueprint/reset")
async def reset_blueprint(user: dict = Depends(get_current_user)):
    """Flag the user as needing to redo onboarding. Does NOT touch tasks, saves, pregrad, vision boards."""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"onboarding_complete": False}},
    )
    # We keep the old blueprint around so users can compare after refill.
    await db.blueprints.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"reset_at": datetime.now(timezone.utc).isoformat(), "archived": True}},
    )
    return {"ok": True}


# ------------------ PLANNER ------------------
@api.get("/planner")
async def list_planner(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).sort([("order", 1), ("created_at", -1)]).to_list(1000)
    return {"tasks": tasks}


@api.post("/planner")
async def create_task(payload: TaskCreate, user: dict = Depends(get_current_user)):
    # Determine order (append to end of category)
    if payload.order is None:
        last = await db.tasks.find({"user_id": user["user_id"], "category": payload.category}, {"_id": 0, "order": 1}).sort("order", -1).limit(1).to_list(1)
        order = (last[0].get("order", 0) if last else 0) + 1
    else:
        order = payload.order
    task = {
        "id": f"t_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "title": payload.title.strip(),
        "detail": (payload.detail or "").strip() or None,
        "kind": payload.kind,
        "status": "todo",
        "due": payload.due,
        "source": payload.source,
        "xp": payload.xp,
        "category": payload.category or "general",
        "order": order,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tasks.insert_one(task.copy())
    return {"task": task}


@api.patch("/planner/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        return {"ok": True}
    if "status" in updates and updates["status"] == "done":
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.tasks.update_one({"id": task_id, "user_id": user["user_id"]}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return {"task": task}


@api.post("/planner/reorder")
async def reorder(payload: TaskReorder, user: dict = Depends(get_current_user)):
    for i, tid in enumerate(payload.ids):
        await db.tasks.update_one(
            {"id": tid, "user_id": user["user_id"]},
            {"$set": {"order": i, "category": payload.category}},
        )
    return {"ok": True}


@api.delete("/planner/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"id": task_id, "user_id": user["user_id"]})
    return {"ok": True}


# ------------------ COLLECTIONS ------------------
@api.get("/collections")
async def list_saves(user: dict = Depends(get_current_user)):
    saves = await db.saves.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {"saves": saves}


@api.post("/collections")
async def add_save(payload: CollectionItem, user: dict = Depends(get_current_user)):
    existing = await db.saves.find_one(
        {"user_id": user["user_id"], "kind": payload.kind, "ref_id": payload.ref_id},
        {"_id": 0},
    )
    if existing:
        return {"save": existing, "existed": True}
    record = {
        "id": f"sv_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "kind": payload.kind,
        "ref_id": payload.ref_id,
        "payload": payload.payload,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.saves.insert_one(record.copy())
    return {"save": record, "existed": False}


@api.delete("/collections/{save_id}")
async def remove_save(save_id: str, user: dict = Depends(get_current_user)):
    await db.saves.delete_one({"id": save_id, "user_id": user["user_id"]})
    return {"ok": True}


# ------------------ DISCOVER (today rotation) ------------------
@api.get("/discover/today")
async def discover_today(user: dict = Depends(get_current_user)):
    seed = int(hashlib.md5((user["user_id"] + datetime.now(timezone.utc).strftime("%Y-%m-%d")).encode()).hexdigest(), 16)
    def pick(lst): return lst[seed % len(lst)]
    return {
        "quote": pick(QUOTES),
        "hidden_course": pick(HIDDEN_COURSES),
        "scholarship": pick(SCHOLARSHIPS),
        "university": pick(UNIVERSITIES),
        "country": pick(COUNTRIES),
        "mun": pick(MUNS),
        "challenge": {
            "title": pick([
                "Spend 15 minutes reading about something outside your field.",
                "Write down three questions you couldn't Google.",
                "Message someone whose work you admire — one honest sentence.",
                "Sketch tomorrow before it happens.",
                "Watch one YouTube in a subject you know nothing about.",
            ]),
            "xp": 15,
        },
    }


# ------------------ NEWS (auto-refreshing via Gemini) ------------------
async def _generate_fresh_news(count: int = 6) -> List[dict]:
    """Ask Gemini for fresh career trend items — cached per day."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"news-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
            system_message=(
                "You are a career-trends editor for teens aged 14-19. You surface REAL, recent, "
                "verifiable trends in emerging careers, education, scholarships, and tech. "
                "Never invent companies. Return STRICT compact JSON only."
            ),
        ).with_model("gemini", "gemini-3.1-pro-preview")

        prompt = f"""Produce EXACTLY {count} news items as a JSON array. Each object has:
{{
  "id": "n-ai-<slug>",
  "kind": "new_career" | "news" | "fact",
  "title": "punchy title, <70 chars",
  "body": "2 sentences, plain teen-friendly language, factual",
  "tags": ["1-3 short tags"],
  "source": "the real publication/org this is based on"
}}
Mix of: 2 emerging careers, 2 pieces of current education/scholarship news, 2 useful facts about future of work.
Return ONLY the JSON array, no code fences."""
        resp = await chat.send_message(UserMessage(text=prompt))
        text = (resp or "").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        arr = json.loads(text)
        if isinstance(arr, list):
            return arr[:count]
    except Exception as e:
        log.warning("AI news generation failed: %s", e)
    return []


@api.get("/news")
async def news(kind: Optional[str] = None, fresh: bool = True):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ai_items: List[dict] = []
    if fresh and EMERGENT_LLM_KEY:
        cached = await db.news_cache.find_one({"day": today}, {"_id": 0})
        if cached and cached.get("items"):
            ai_items = cached["items"]
        else:
            ai_items = await _generate_fresh_news(6)
            if ai_items:
                await db.news_cache.update_one(
                    {"day": today},
                    {"$set": {"day": today, "items": ai_items, "created_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True,
                )
    # Merge fresh + curated (dedupe by id)
    all_items = ai_items + [it for it in BASE_NEWS if it["id"] not in {a.get("id") for a in ai_items}]
    if kind and kind != "all":
        all_items = [n for n in all_items if n.get("kind") == kind]
    # Rotate seed-of-day for stable-per-day mix
    seed = int(hashlib.md5(today.encode()).hexdigest(), 16)
    all_items = all_items[seed % len(all_items):] + all_items[: seed % len(all_items)] if all_items else []
    return {"items": all_items, "fresh_count": len(ai_items), "day": today}


# ------------------ ARTICLES (Digital Ed / Cyber / Civic Tech) ------------------
@api.get("/articles")
async def list_articles(q: Optional[str] = None, category: Optional[str] = None):
    items = ARTICLES
    if category and category != "all":
        items = [a for a in items if a.get("category") == category]
    if q:
        ql = q.lower()
        items = [a for a in items if ql in (a.get("title", "") + " " + a.get("summary", "") + " " + " ".join(a.get("tags", []))).lower()]
    return {"items": items, "categories": sorted({a.get("category", "general") for a in ARTICLES})}


@api.get("/articles/{article_id}")
async def get_article(article_id: str):
    for a in ARTICLES:
        if a.get("id") == article_id:
            return a
    raise HTTPException(status_code=404, detail="Not found")


# ------------------ VISION BOARDS ------------------
@api.get("/vision-boards")
async def list_boards(user: dict = Depends(get_current_user)):
    boards = await db.vision_boards.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return {"boards": boards}


@api.post("/vision-boards")
async def upsert_board(payload: VisionBoardPayload, user: dict = Depends(get_current_user)):
    bid = payload.id or f"vb_{uuid.uuid4().hex[:10]}"
    doc = {
        "id": bid,
        "user_id": user["user_id"],
        "title": payload.title,
        "background": payload.background,
        "items": [i.dict() for i in payload.items],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.vision_boards.update_one(
        {"id": bid, "user_id": user["user_id"]},
        {"$set": doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    fresh = await db.vision_boards.find_one({"id": bid, "user_id": user["user_id"]}, {"_id": 0})
    return {"board": fresh}


@api.get("/vision-boards/{board_id}")
async def get_board(board_id: str, user: dict = Depends(get_current_user)):
    b = await db.vision_boards.find_one({"id": board_id, "user_id": user["user_id"]}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Not found")
    return {"board": b}


@api.delete("/vision-boards/{board_id}")
async def delete_board(board_id: str, user: dict = Depends(get_current_user)):
    await db.vision_boards.delete_one({"id": board_id, "user_id": user["user_id"]})
    return {"ok": True}


# ------------------ PREGRAD RESUMES ------------------
@api.get("/pregrad")
async def get_pregrads(user: dict = Depends(get_current_user)):
    docs = await db.pregrads.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(10)
    return {"pregrads": docs}


@api.put("/pregrad/{mode}")
async def put_pregrad(mode: str, payload: PregradPayload, user: dict = Depends(get_current_user)):
    if mode not in ("fun", "formal"):
        raise HTTPException(status_code=400, detail="mode must be fun or formal")
    doc = {
        "user_id": user["user_id"],
        "mode": mode,
        "header": payload.header,
        "photo_base64": payload.photo_base64,
        "sections": [s.dict() for s in payload.sections],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pregrads.update_one(
        {"user_id": user["user_id"], "mode": mode},
        {"$set": doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    fresh = await db.pregrads.find_one({"user_id": user["user_id"], "mode": mode}, {"_id": 0})
    return {"pregrad": fresh}


# ------------------ MOUNT ------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.tasks.create_index("user_id")
    await db.saves.create_index("user_id")
    await db.vision_boards.create_index("user_id")
    await db.pregrads.create_index([("user_id", 1), ("mode", 1)], unique=True)
    await db.news_cache.create_index("day", unique=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
