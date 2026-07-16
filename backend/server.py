"""Mission Velora — AI Life Architecture Platform backend."""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ------------------------------------------------------------------ DB / APP
mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Mission Velora API", version="0.2.0")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("velora")


# ------------------------------------------------------------------ SEED DATA
QUOTES = [
    "The first step is to try.",
    "Small moves stack into big lives.",
    "You are allowed to change your mind — often.",
    "Curiosity is a compass, not a map.",
    "You don't need to see the whole staircase.",
    "Start ugly. Refine later.",
    "You can do it — and today counts.",
    "Uncertainty is where the interesting stuff lives.",
    "Design a life, not a résumé.",
    "The path shows up as you walk.",
    "Weird interests build rare careers.",
    "Progress > polish.",
]

DREAM_ACHIEVEMENTS = [
    {"id": "a-startup", "title": "Founded a startup", "tag": "entrepreneurship", "emoji_free_icon": "star"},
    {"id": "a-tedx", "title": "Spoke at TEDx", "tag": "speaking", "emoji_free_icon": "mic"},
    {"id": "a-research", "title": "Published research", "tag": "research", "emoji_free_icon": "book"},
    {"id": "a-scholarship", "title": "Won a full scholarship", "tag": "scholarship", "emoji_free_icon": "trophy"},
    {"id": "a-diplomat", "title": "Became a diplomat", "tag": "policy", "emoji_free_icon": "globe"},
    {"id": "a-nonprofit", "title": "Built a nonprofit", "tag": "impact", "emoji_free_icon": "heart"},
    {"id": "a-multilingual", "title": "Became multilingual", "tag": "languages", "emoji_free_icon": "chatbubbles"},
    {"id": "a-antarctica", "title": "Explored Antarctica", "tag": "adventure", "emoji_free_icon": "snow"},
    {"id": "a-book", "title": "Wrote a book", "tag": "writing", "emoji_free_icon": "create"},
    {"id": "a-ai", "title": "Built an AI product", "tag": "tech", "emoji_free_icon": "hardware-chip"},
    {"id": "a-space", "title": "Worked in space tech", "tag": "space", "emoji_free_icon": "planet"},
    {"id": "a-vc", "title": "Became a VC", "tag": "finance", "emoji_free_icon": "trending-up"},
    {"id": "a-formula1", "title": "Worked in Formula One", "tag": "engineering", "emoji_free_icon": "speedometer"},
    {"id": "a-wildlife", "title": "Wildlife photographer", "tag": "photography", "emoji_free_icon": "camera"},
    {"id": "a-designer", "title": "Designed acclaimed products", "tag": "design", "emoji_free_icon": "color-palette"},
    {"id": "a-un", "title": "Served at the UN", "tag": "policy", "emoji_free_icon": "earth"},
    {"id": "a-medicine", "title": "Practiced medicine abroad", "tag": "medicine", "emoji_free_icon": "medkit"},
    {"id": "a-architect", "title": "Designed a landmark building", "tag": "architecture", "emoji_free_icon": "business"},
    {"id": "a-podcast", "title": "Hosted a podcast", "tag": "media", "emoji_free_icon": "headset"},
    {"id": "a-climate", "title": "Led a climate initiative", "tag": "sustainability", "emoji_free_icon": "leaf"},
    {"id": "a-film", "title": "Directed a film", "tag": "film", "emoji_free_icon": "film"},
    {"id": "a-code", "title": "Shipped an open-source library used by millions", "tag": "tech", "emoji_free_icon": "code-slash"},
    {"id": "a-travel", "title": "Lived in three continents", "tag": "travel", "emoji_free_icon": "airplane"},
    {"id": "a-marathon", "title": "Ran an ultra marathon", "tag": "athletics", "emoji_free_icon": "walk"},
    {"id": "a-artist", "title": "Exhibited art internationally", "tag": "art", "emoji_free_icon": "brush"},
    {"id": "a-teacher", "title": "Taught a class of my own", "tag": "education", "emoji_free_icon": "school"},
    {"id": "a-journalist", "title": "Reported from the field", "tag": "media", "emoji_free_icon": "newspaper"},
    {"id": "a-neuroscience", "title": "Ran a neuroscience lab", "tag": "science", "emoji_free_icon": "flask"},
    {"id": "a-fashion", "title": "Launched a fashion label", "tag": "fashion", "emoji_free_icon": "shirt"},
    {"id": "a-restaurant", "title": "Opened a restaurant", "tag": "hospitality", "emoji_free_icon": "restaurant"},
]

LIFE_PROMPTS = [
    {"id": "l-city-tokyo", "group": "cities", "label": "Tokyo"},
    {"id": "l-city-nyc", "group": "cities", "label": "New York"},
    {"id": "l-city-lagos", "group": "cities", "label": "Lagos"},
    {"id": "l-city-london", "group": "cities", "label": "London"},
    {"id": "l-city-berlin", "group": "cities", "label": "Berlin"},
    {"id": "l-city-mumbai", "group": "cities", "label": "Mumbai"},
    {"id": "l-city-sf", "group": "cities", "label": "San Francisco"},
    {"id": "l-city-cape", "group": "cities", "label": "Cape Town"},
    {"id": "l-env-mountain", "group": "environments", "label": "Mountain town"},
    {"id": "l-env-coast", "group": "environments", "label": "Coastal city"},
    {"id": "l-env-metro", "group": "environments", "label": "Dense metropolis"},
    {"id": "l-env-suburb", "group": "environments", "label": "Quiet suburbs"},
    {"id": "l-work-remote", "group": "work_style", "label": "Fully remote"},
    {"id": "l-work-team", "group": "work_style", "label": "Bustling team"},
    {"id": "l-work-solo", "group": "work_style", "label": "Solo deep work"},
    {"id": "l-work-field", "group": "work_style", "label": "Out in the field"},
    {"id": "l-travel-heavy", "group": "travel", "label": "Travel constantly"},
    {"id": "l-travel-light", "group": "travel", "label": "One base, occasional trips"},
    {"id": "l-travel-slow", "group": "travel", "label": "Slow travel & long stays"},
    {"id": "l-bal-hustle", "group": "balance", "label": "High-intensity seasons"},
    {"id": "l-bal-steady", "group": "balance", "label": "Steady, sustainable pace"},
    {"id": "l-bal-flex", "group": "balance", "label": "Flexible & self-directed"},
    {"id": "l-imp-social", "group": "impact", "label": "Social impact first"},
    {"id": "l-imp-creative", "group": "impact", "label": "Creative expression first"},
    {"id": "l-imp-tech", "group": "impact", "label": "Building new tech first"},
    {"id": "l-imp-research", "group": "impact", "label": "Deep research first"},
    {"id": "l-imp-money", "group": "impact", "label": "Financial independence first"},
    {"id": "l-ind-tech", "group": "industries", "label": "Technology"},
    {"id": "l-ind-med", "group": "industries", "label": "Medicine & health"},
    {"id": "l-ind-finance", "group": "industries", "label": "Finance & economics"},
    {"id": "l-ind-arts", "group": "industries", "label": "Arts & culture"},
    {"id": "l-ind-policy", "group": "industries", "label": "Policy & diplomacy"},
    {"id": "l-ind-climate", "group": "industries", "label": "Climate & sustainability"},
    {"id": "l-ind-media", "group": "industries", "label": "Media & storytelling"},
    {"id": "l-ind-space", "group": "industries", "label": "Space & aerospace"},
    {"id": "l-ind-design", "group": "industries", "label": "Design & product"},
    {"id": "l-ind-edu", "group": "industries", "label": "Education"},
]

BOARD_LIBRARY = [
    # id, url, tags (comma sep for filter)
    ("b-arch-1", "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800", "architecture,buildings"),
    ("b-arch-2", "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800", "architecture,modern"),
    ("b-city-1", "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800", "city,skyline"),
    ("b-city-2", "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800", "city,night"),
    ("b-lab-1", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800", "lab,science,research"),
    ("b-lab-2", "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800", "lab,science"),
    ("b-uni-1", "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800", "university,campus"),
    ("b-uni-2", "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800", "university,library"),
    ("b-tech-1", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", "technology,circuits"),
    ("b-tech-2", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800", "technology,code"),
    ("b-design-1", "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800", "design,studio"),
    ("b-design-2", "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800", "design,minimal"),
    ("b-space-1", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", "space,earth"),
    ("b-space-2", "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800", "space,stars"),
    ("b-wildlife-1", "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800", "wildlife,animals"),
    ("b-wildlife-2", "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800", "wildlife,fox"),
    ("b-ocean-1", "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800", "ocean,coast"),
    ("b-mountain-1", "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800", "mountain,adventure"),
    ("b-book-1", "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800", "books,reading"),
    ("b-cafe-1", "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800", "cafe,work"),
    ("b-workspace-1", "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", "workspace,desk"),
    ("b-workspace-2", "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800", "workspace,meeting"),
    ("b-medical-1", "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800", "medicine,healthcare"),
    ("b-finance-1", "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800", "finance,charts"),
    ("b-aviation-1", "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800", "aviation,plane"),
    ("b-sustain-1", "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800", "sustainability,green"),
    ("b-fashion-1", "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800", "fashion,style"),
    ("b-photo-1", "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800", "photography,camera"),
    ("b-robotics-1", "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800", "robotics,ai"),
    ("b-diplomacy-1", "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800", "diplomacy,unitednations"),
    ("b-humanitarian-1", "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800", "humanitarian,community"),
    ("b-podcast-1", "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800", "media,podcast"),
    ("b-art-1", "https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=800", "art,studio"),
    ("b-luxury-1", "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800", "luxury,lifestyle"),
    ("b-startup-1", "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800", "startup,team"),
    ("b-lab-3", "https://images.unsplash.com/photo-1554475901-4538ddfbccc2?w=800", "lab,biology"),
]

SCHOLARSHIPS = [
    {"id": "s-1", "title": "Rhodes Scholarship", "country": "United Kingdom", "level": "postgrad", "deadline": "2026-10-01", "funding": "Full", "field": "Any", "competitiveness": "extreme", "tags": ["prestige", "leadership"], "why_hidden": False, "summary": "Fully-funded postgraduate study at Oxford for outstanding young leaders worldwide."},
    {"id": "s-2", "title": "Chevening Scholarship", "country": "United Kingdom", "level": "postgrad", "deadline": "2026-11-05", "funding": "Full", "field": "Any", "competitiveness": "high", "tags": ["policy", "leadership"], "why_hidden": False, "summary": "UK Government's global scholarship program for future leaders across 160+ countries."},
    {"id": "s-3", "title": "DAAD Scholarships", "country": "Germany", "level": "undergrad,postgrad", "deadline": "2026-10-15", "funding": "Full", "field": "Any", "competitiveness": "medium", "tags": ["research"], "why_hidden": False, "summary": "German academic exchange service — hundreds of programs across every field."},
    {"id": "s-4", "title": "Erasmus Mundus Joint Masters", "country": "European Union", "level": "postgrad", "deadline": "2026-12-01", "funding": "Full", "field": "Any", "competitiveness": "high", "tags": ["mobility"], "why_hidden": False, "summary": "Study across multiple European universities in a single, fully-funded masters."},
    {"id": "s-5", "title": "MEXT Japanese Government", "country": "Japan", "level": "undergrad,postgrad", "deadline": "2026-05-30", "funding": "Full", "field": "Any", "competitiveness": "high", "tags": ["language", "research"], "why_hidden": False, "summary": "Full undergraduate or postgraduate funding to study in Japan, including language prep."},
    {"id": "s-6", "title": "Knight-Hennessy at Stanford", "country": "United States", "level": "postgrad", "deadline": "2026-10-08", "funding": "Full", "field": "Any", "competitiveness": "extreme", "tags": ["leadership"], "why_hidden": False, "summary": "Fully-funded graduate study at Stanford across any Stanford graduate program."},
    {"id": "s-7", "title": "Schwarzman Scholars", "country": "China", "level": "postgrad", "deadline": "2026-09-20", "funding": "Full", "field": "Global affairs", "competitiveness": "extreme", "tags": ["leadership", "asia"], "why_hidden": False, "summary": "One-year masters at Tsinghua University for future global leaders."},
    {"id": "s-8", "title": "Fulbright Foreign Student Program", "country": "United States", "level": "postgrad", "deadline": "2026-05-15", "funding": "Full", "field": "Any", "competitiveness": "high", "tags": ["exchange"], "why_hidden": False, "summary": "US Government scholarship for international students at US universities."},
    {"id": "s-9", "title": "Vanier Canada Graduate Scholarships", "country": "Canada", "level": "postgrad", "deadline": "2026-11-01", "funding": "Full", "field": "STEM,SocialSciences,Humanities", "competitiveness": "high", "tags": ["research"], "why_hidden": False, "summary": "$50,000/year for three years for doctoral students in Canadian universities."},
    {"id": "s-10", "title": "Global Korea Scholarship", "country": "South Korea", "level": "undergrad,postgrad", "deadline": "2026-03-15", "funding": "Full", "field": "Any", "competitiveness": "medium", "tags": ["language", "asia"], "why_hidden": False, "summary": "Korean government scholarship covering tuition, stipend and language training."},
    {"id": "s-11", "title": "African Leadership Academy", "country": "South Africa", "level": "highschool", "deadline": "2026-06-01", "funding": "Full/partial", "field": "Leadership", "competitiveness": "high", "tags": ["africa", "leadership"], "why_hidden": False, "summary": "Pan-African leadership program for young change-makers aged 15-18."},
    {"id": "s-12", "title": "Reach Cambridge", "country": "United Kingdom", "level": "highschool", "deadline": "2026-04-15", "funding": "Merit", "field": "Any", "competitiveness": "medium", "tags": ["summer"], "why_hidden": True, "summary": "Under-the-radar merit funding for Cambridge summer academic programs."},
    {"id": "s-13", "title": "NUS Global Merit Scholarship", "country": "Singapore", "level": "undergrad", "deadline": "2026-03-19", "funding": "Full", "field": "Any", "competitiveness": "high", "tags": ["asia"], "why_hidden": False, "summary": "Full-funded undergraduate scholarship at National University of Singapore."},
    {"id": "s-14", "title": "Sciences Po Emile Boutmy", "country": "France", "level": "undergrad", "deadline": "2026-01-05", "funding": "Partial", "field": "Politics,Economics", "competitiveness": "medium", "tags": ["policy"], "why_hidden": True, "summary": "Rare need + merit funding for international students at Sciences Po."},
    {"id": "s-15", "title": "Türkiye Bursları", "country": "Türkiye", "level": "undergrad,postgrad", "deadline": "2026-02-20", "funding": "Full", "field": "Any", "competitiveness": "medium", "tags": ["cross-cultural"], "why_hidden": True, "summary": "Fully-funded scholarship few students consider — covers tuition, stipend, flights."},
]

UNIVERSITIES = [
    {"id": "u-1", "title": "MIT", "country": "United States", "acceptance": "4%", "field": "STEM,Business", "tags": ["research", "innovation"], "summary": "Legendary research university with unmatched entrepreneurial ecosystem.", "hidden_program": "Media Lab"},
    {"id": "u-2", "title": "Stanford", "country": "United States", "acceptance": "4%", "field": "Any", "tags": ["startups"], "summary": "The startup capital of academia.", "hidden_program": "Symbolic Systems"},
    {"id": "u-3", "title": "ETH Zürich", "country": "Switzerland", "acceptance": "27%", "field": "STEM", "tags": ["research", "affordable"], "summary": "World-class engineering with surprisingly low tuition for internationals.", "hidden_program": "Design-Materials-Fabrication (DMF)"},
    {"id": "u-4", "title": "NUS", "country": "Singapore", "acceptance": "5%", "field": "Any", "tags": ["asia"], "summary": "Asia's leading university with strong industry links.", "hidden_program": "USP: Interdisciplinary Honours College"},
    {"id": "u-5", "title": "Sciences Po", "country": "France", "acceptance": "13%", "field": "Politics,Economics", "tags": ["policy"], "summary": "The training ground for European policymakers.", "hidden_program": "Dual-Degree with Columbia"},
    {"id": "u-6", "title": "UCT (Cape Town)", "country": "South Africa", "acceptance": "15%", "field": "Any", "tags": ["africa"], "summary": "Africa's top-ranked university, right on the water.", "hidden_program": "African Climate & Development Initiative"},
    {"id": "u-7", "title": "Ashoka University", "country": "India", "acceptance": "15%", "field": "Liberal Arts", "tags": ["asia"], "summary": "India's leading liberal-arts experiment.", "hidden_program": "Ashoka Scholars Programme (5th year, fully funded)"},
    {"id": "u-8", "title": "TU Delft", "country": "Netherlands", "acceptance": "35%", "field": "Engineering,Design", "tags": ["design"], "summary": "Europe's best-kept secret for design engineering.", "hidden_program": "Industrial Design Engineering — Design for Interaction"},
    {"id": "u-9", "title": "University of Tokyo", "country": "Japan", "acceptance": "35%", "field": "STEM", "tags": ["asia", "research"], "summary": "Japan's flagship, with a growing English-taught PEAK program.", "hidden_program": "PEAK: Programs in English at Komaba"},
    {"id": "u-10", "title": "Minerva University", "country": "United States (global)", "acceptance": "1%", "field": "Any", "tags": ["global"], "summary": "Live in 7 cities in 4 years — the most unusual undergraduate program on earth.", "hidden_program": "Global Rotation"},
]

HIDDEN_COURSES = [
    {"id": "h-1", "title": "Behavioural Economics", "at": "LSE, Chicago, CMU", "field": "Economics + Psychology", "tags": ["research"], "summary": "Where economics meets how people actually make decisions."},
    {"id": "h-2", "title": "Space Law", "at": "Leiden, McGill, Nebraska", "field": "Law + Space", "tags": ["policy"], "summary": "Yes — space has laws, and this field is booming."},
    {"id": "h-3", "title": "Computational Biology", "at": "MIT, ETH, Oxford", "field": "Biology + CS", "tags": ["research", "tech"], "summary": "Code your way through the human genome."},
    {"id": "h-4", "title": "Design Engineering", "at": "Imperial, TU Delft, Harvard", "field": "Engineering + Design", "tags": ["design"], "summary": "Build like an engineer, think like a designer."},
    {"id": "h-5", "title": "Human-Centred AI", "at": "Stanford, Cambridge", "field": "CS + Ethics", "tags": ["tech", "policy"], "summary": "Building AI that treats humans as more than data points."},
    {"id": "h-6", "title": "Sustainable Architecture", "at": "ETH, TU Delft, MIT", "field": "Architecture + Climate", "tags": ["climate"], "summary": "Design buildings that heal the planet."},
    {"id": "h-7", "title": "Digital Anthropology", "at": "UCL, KCL, Copenhagen", "field": "Anthropology + Tech", "tags": ["research"], "summary": "Study human behaviour in digital worlds."},
    {"id": "h-8", "title": "Climate Finance", "at": "SOAS, Oxford Smith, IE", "field": "Finance + Climate", "tags": ["climate", "finance"], "summary": "The fastest-growing corner of finance."},
    {"id": "h-9", "title": "Neuromorphic Engineering", "at": "ETH, ITU Copenhagen", "field": "Neuro + Hardware", "tags": ["tech"], "summary": "Design chips that think like brains."},
    {"id": "h-10", "title": "Ocean Engineering", "at": "MIT, NUS, Southampton", "field": "Engineering + Oceans", "tags": ["adventure", "climate"], "summary": "Because 70% of the planet is still undesigned-for."},
    {"id": "h-11", "title": "Data Journalism", "at": "Columbia J-School, LSE", "field": "Journalism + Data", "tags": ["media"], "summary": "Modern reporting runs on datasets and design."},
    {"id": "h-12", "title": "Museum Studies + Curation", "at": "NYU, Leicester", "field": "History + Design", "tags": ["art"], "summary": "Design experiences that hold cultural memory."},
]

MUNS = [
    {"id": "m-1", "title": "Harvard Model UN", "country": "United States", "city": "Boston", "date": "2027-01-30", "format": "in-person", "difficulty": "advanced", "fee": "$95", "tags": ["prestige"]},
    {"id": "m-2", "title": "WorldMUN", "country": "Rotating", "city": "Rotating", "date": "2027-03-15", "format": "in-person", "difficulty": "advanced", "fee": "$150", "tags": ["global"]},
    {"id": "m-3", "title": "The Hague International MUN (THIMUN)", "country": "Netherlands", "city": "The Hague", "date": "2027-01-24", "format": "in-person", "difficulty": "advanced", "fee": "€110", "tags": ["diplomacy"]},
    {"id": "m-4", "title": "Oxford International MUN", "country": "United Kingdom", "city": "Oxford", "date": "2026-11-14", "format": "in-person", "difficulty": "advanced", "fee": "£90", "tags": ["prestige"]},
    {"id": "m-5", "title": "Yale MUN India", "country": "India", "city": "Hyderabad", "date": "2026-11-08", "format": "in-person", "difficulty": "intermediate", "fee": "$85", "tags": ["asia"]},
    {"id": "m-6", "title": "MUN Impact Global Conference", "country": "Online", "city": "Online", "date": "2026-10-22", "format": "online", "difficulty": "beginner", "fee": "$25", "tags": ["online", "impact"]},
    {"id": "m-7", "title": "Nairobi Model UN", "country": "Kenya", "city": "Nairobi", "date": "2026-09-13", "format": "in-person", "difficulty": "intermediate", "fee": "KSh 3,500", "tags": ["africa"]},
    {"id": "m-8", "title": "Beijing International MUN", "country": "China", "city": "Beijing", "date": "2026-10-05", "format": "in-person", "difficulty": "intermediate", "fee": "CNY 500", "tags": ["asia"]},
    {"id": "m-9", "title": "London International MUN", "country": "United Kingdom", "city": "London", "date": "2027-02-27", "format": "in-person", "difficulty": "intermediate", "fee": "£85", "tags": ["europe"]},
    {"id": "m-10", "title": "MUN Refugee Challenge", "country": "Online", "city": "Online", "date": "2026-11-30", "format": "online", "difficulty": "beginner", "fee": "Free", "tags": ["online", "humanitarian"]},
]

COUNTRIES = [
    {"id": "c-1", "title": "Germany", "region": "Europe", "tags": ["free-tuition", "engineering"], "why": "Tuition-free public universities, strong engineering + startup ecosystem, generous post-study work rights."},
    {"id": "c-2", "title": "Netherlands", "region": "Europe", "tags": ["design", "english-taught"], "why": "Massive English-taught catalogue, world-leading design & climate research."},
    {"id": "c-3", "title": "Singapore", "region": "Asia", "tags": ["finance", "tech"], "why": "Global finance + tech hub with heavy scholarship budgets for international students."},
    {"id": "c-4", "title": "South Korea", "region": "Asia", "tags": ["design", "gaming", "media"], "why": "Rising creative economy, scholarships aplenty, dominant in K-industries."},
    {"id": "c-5", "title": "Kenya", "region": "Africa", "tags": ["tech", "climate"], "why": "African tech capital ('Silicon Savannah') and a growing climate leadership hub."},
    {"id": "c-6", "title": "Canada", "region": "N. America", "tags": ["research", "immigration-friendly"], "why": "Strong research funding + straight pathway to permanent residency for grads."},
    {"id": "c-7", "title": "Estonia", "region": "Europe", "tags": ["digital-society", "e-residency"], "why": "The most digital country on earth. Also affordable & English-friendly."},
    {"id": "c-8", "title": "United Arab Emirates", "region": "Middle East", "tags": ["business", "space"], "why": "Fast-growing space + AI sectors, tax-free income, English-first."},
    {"id": "c-9", "title": "Portugal", "region": "Europe", "tags": ["remote-life", "affordable"], "why": "Best digital-nomad visa in the EU + affordable, warm, safe."},
    {"id": "c-10", "title": "Rwanda", "region": "Africa", "tags": ["development", "policy"], "why": "One of Africa's fastest-growing knowledge economies, home to Carnegie Mellon Africa."},
]

# "Fresh from the world" — career news, new careers, industry facts.
# Curated, evergreen-ish; refreshed by rotation and by seed of the day.
NEWS_ITEMS = [
    {"id": "n-1", "kind": "new_career", "title": "Prompt Architect", "body": "As every company plugs into large language models, a new hybrid role — half writer, half systems designer — is being hired at Anthropic, Stripe and Notion.", "tags": ["ai", "tech"], "source": "Industry watch"},
    {"id": "n-2", "kind": "new_career", "title": "Climate Product Manager", "body": "Product managers who specialise in decarbonisation are now the #1 hire at climate-tech startups.", "tags": ["climate", "product"], "source": "MCJ Collective"},
    {"id": "n-3", "kind": "new_career", "title": "AI Ethics Auditor", "body": "The EU AI Act (2026 enforcement) is forcing every mid-size tech company to hire someone who can audit models against fairness + safety rules.", "tags": ["policy", "ai"], "source": "EU AI Act"},
    {"id": "n-4", "kind": "new_career", "title": "Longevity Coach", "body": "Health + data + coaching combined — a fast-growing role in preventive medicine clinics from London to Singapore.", "tags": ["health", "wellness"], "source": "Peter Attia Drive"},
    {"id": "n-5", "kind": "new_career", "title": "Synthetic Biologist", "body": "Design DNA the way engineers design code. Ginkgo Bioworks and Colossal are hiring undergrads with wet-lab + coding skills.", "tags": ["biology", "tech"], "source": "Nature careers"},
    {"id": "n-6", "kind": "fact", "title": "60% of jobs in 2035 don't exist yet", "body": "Dell/IFTF estimates — most Gen Z jobs will be invented, not applied for.", "tags": ["future-of-work"], "source": "Dell / IFTF"},
    {"id": "n-7", "kind": "fact", "title": "The world's fastest-growing degree is Sustainability", "body": "UNESCO reports a 400% enrolment jump in sustainability + climate degrees over the last 5 years.", "tags": ["climate", "education"], "source": "UNESCO"},
    {"id": "n-8", "kind": "news", "title": "MIT launches free AI + Society online micro-degree", "body": "A 12-week open enrolment program teaching AI literacy alongside policy and ethics. Free for under-25s worldwide.", "tags": ["ai", "education"], "source": "MITx"},
    {"id": "n-9", "kind": "news", "title": "Rhodes Trust opens new East Africa constituency", "body": "For the first time, students from Uganda, Rwanda, and Tanzania can apply directly rather than through the South Africa route.", "tags": ["scholarship", "africa"], "source": "Rhodes Trust"},
    {"id": "n-10", "kind": "news", "title": "Meta opens 100 AI Residency spots for undergrads", "body": "One-year paid research residency, no PhD required. Rolling applications.", "tags": ["ai", "internship"], "source": "Meta AI"},
    {"id": "n-11", "kind": "fact", "title": "Space law has 12 students per year worldwide", "body": "One of the rarest, highest-growth legal specialisations — Leiden, McGill, and Nebraska are the main routes in.", "tags": ["law", "space"], "source": "Space Law Chairs"},
    {"id": "n-12", "kind": "new_career", "title": "Digital Twin Engineer", "body": "Cities, factories and even human organs now have digital replicas. Rolls-Royce, Siemens and Singapore's Smart Nation team are hiring.", "tags": ["engineering", "tech"], "source": "IEEE Spectrum"},
    {"id": "n-13", "kind": "news", "title": "Erasmus Mundus adds 30 new joint masters in 2026", "body": "Nine of them are climate-focused. Fully funded, cross-continent programs.", "tags": ["scholarship", "climate"], "source": "European Commission"},
    {"id": "n-14", "kind": "fact", "title": "The 'polymath premium' is real", "body": "Studies show people with skills across 2+ unrelated fields earn 20-40% more than pure specialists — because their combinations are rare.", "tags": ["future-of-work", "learning"], "source": "David Epstein — Range"},
    {"id": "n-15", "kind": "new_career", "title": "Space Debris Mitigation Specialist", "body": "With 40,000+ tracked objects orbiting Earth, ESA and Astroscale are pioneering a whole new engineering discipline.", "tags": ["space", "engineering"], "source": "ESA Clean Space"},
    {"id": "n-16", "kind": "news", "title": "NUS launches a Bachelor of Environmental Studies", "body": "Interdisciplinary program blending policy, science and design — application deadline March 2026.", "tags": ["climate", "asia"], "source": "NUS"},
    {"id": "n-17", "kind": "fact", "title": "Half of Nobel laureates changed field mid-career", "body": "A Cambridge study of Nobel winners found switching disciplines at least once was the norm, not the exception.", "tags": ["research", "learning"], "source": "Cambridge Study"},
    {"id": "n-18", "kind": "new_career", "title": "Chief Trust Officer", "body": "As misinformation grows, companies from Bumble to BBVA are creating C-suite roles focused entirely on trust + safety.", "tags": ["policy", "tech"], "source": "HBR"},
]



# ------------------------------------------------------------------ MODELS
class UserModel(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    onboarding_complete: bool = False
    created_at: str

    class Config:
        extra = "ignore"


class SessionRequest(BaseModel):
    session_token: Optional[str] = None
    session_id: Optional[str] = None  # if raw id passed for server-side exchange


class Achievement(BaseModel):
    id: str
    title: str
    tag: str
    emoji_free_icon: str


class LifePrompt(BaseModel):
    id: str
    group: str
    label: str


class BoardImage(BaseModel):
    id: str
    url: str
    tags: str


class OnboardingPayload(BaseModel):
    dream_resume: List[str] = []       # achievement ids
    custom_achievements: List[str] = []  # user-typed strings
    life_prompts: List[str] = []       # prompt ids
    board_pins: List[dict] = []        # {id, url, tags?}


class Task(BaseModel):
    id: str
    user_id: str
    title: str
    detail: Optional[str] = None
    kind: str = "task"                 # "task" | "side_quest"
    status: str = "todo"               # todo | doing | done
    due: Optional[str] = None
    source: Optional[dict] = None      # link back to scholarship/uni/etc.
    xp: int = 10
    created_at: str


class TaskCreate(BaseModel):
    title: str
    detail: Optional[str] = None
    kind: str = "task"
    due: Optional[str] = None
    source: Optional[dict] = None
    xp: int = 10


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    detail: Optional[str] = None
    due: Optional[str] = None


class CollectionItem(BaseModel):
    kind: str    # scholarship, university, hidden_course, mun, country, quest
    ref_id: str


# ------------------------------------------------------------------ AUTH HELPERS
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


# ------------------------------------------------------------------ ROUTES: PUBLIC
@api.get("/")
async def root():
    return {"app": "Mission Velora", "status": "ok"}


@api.get("/quotes")
async def get_quotes():
    return {"quotes": QUOTES}


@api.get("/onboarding/library")
async def onboarding_library():
    """All the seed data the client needs for onboarding UI."""
    return {
        "achievements": DREAM_ACHIEVEMENTS,
        "life_prompts": LIFE_PROMPTS,
        "board_images": [{"id": i, "url": u, "tags": t} for i, u, t in BOARD_LIBRARY],
    }


# ------------------------------------------------------------------ ROUTES: AUTH
@api.post("/auth/session")
async def create_session(payload: SessionRequest, request: Request):
    """Exchange an Emergent session_id (or already-issued session_token) for a
    server-side session bound to this backend."""
    session_token = payload.session_token
    profile: Optional[dict] = None

    if payload.session_id and not session_token:
        # Exchange session_id for profile+token via Emergent
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
        # We got the token directly (e.g. from a prior exchange on client).
        # Ask Emergent to describe it.
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

    # Upsert session
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


# ------------------------------------------------------------------ EXPLORE
def _filter(items: List[dict], q: Optional[str], tag: Optional[str]) -> List[dict]:
    out = items
    if q:
        ql = q.lower()
        out = [i for i in out if ql in (i.get("title", "") + " " + i.get("summary", "") + " " + str(i.get("tags", ""))).lower()]
    if tag and tag != "all":
        out = [i for i in out if tag in (i.get("tags", []) or []) or tag == (i.get("country") or "").lower()]
    return out


@api.get("/explore")
async def explore(kind: str, q: Optional[str] = None, tag: Optional[str] = None):
    sources = {
        "scholarships": SCHOLARSHIPS,
        "universities": UNIVERSITIES,
        "hidden_courses": HIDDEN_COURSES,
        "muns": MUNS,
        "countries": COUNTRIES,
    }
    if kind not in sources:
        raise HTTPException(status_code=404, detail="Unknown kind")
    return {"items": _filter(sources[kind], q, tag)}


@api.get("/explore/{kind}/{item_id}")
async def explore_detail(kind: str, item_id: str):
    sources = {
        "scholarships": SCHOLARSHIPS,
        "universities": UNIVERSITIES,
        "hidden_courses": HIDDEN_COURSES,
        "muns": MUNS,
        "countries": COUNTRIES,
    }
    if kind not in sources:
        raise HTTPException(status_code=404, detail="Unknown kind")
    for item in sources[kind]:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="Not found")


# ------------------------------------------------------------------ ONBOARDING & BLUEPRINT (AI)
def _tags_from_onboarding(user: dict, payload: OnboardingPayload) -> List[str]:
    tags: list[str] = []
    id_to_ach = {a["id"]: a for a in DREAM_ACHIEVEMENTS}
    id_to_life = {p["id"]: p for p in LIFE_PROMPTS}
    id_to_board = {i: t for i, _, t in BOARD_LIBRARY}
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
    """Ask Gemini for a compact structured blueprint. If AI fails, fall back to
    a deterministic tag-based blueprint so the app never breaks."""
    tags = _tags_from_onboarding(user, payload)
    custom = payload.custom_achievements

    # Attempt AI
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system = (
            "You are Mission Velora's Future Blueprint engine. You help teenagers (14-19) "
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
  "recommended_scholarship_ids": [3 ids from this pool: {[s['id'] for s in SCHOLARSHIPS]}],
  "recommended_university_ids": [3 ids from this pool: {[u['id'] for u in UNIVERSITIES]}],
  "recommended_hidden_course_ids": [3 ids from this pool: {[h['id'] for h in HIDDEN_COURSES]}],
  "recommended_country_ids": [3 ids from this pool: {[c['id'] for c in COUNTRIES]}],
  "recommended_mun_ids": [2 ids from this pool: {[m['id'] for m in MUNS]}],
  "side_quests": [ 3 items, each: {{"title": "short, adventurous", "detail": "one sentence", "xp": 20 }} ]
}}

Signals:
- Selected achievement tags: {tags}
- Custom stated dreams: {custom}
- Total board pins: {len(payload.board_pins)}
"""
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"blueprint-{user['user_id']}",
            system_message=system,
        ).with_model("gemini", "gemini-3.1-pro-preview")
        resp = await chat.send_message(UserMessage(text=prompt))
        text = (resp or "").strip()
        # Strip code fences if any
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        import json
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
                {"title": "Climate technologist", "why": "Your board and dreams touch sustainability + tech.", "first_step": "Read one recent article from Canary Media."},
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
    # Store selections
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


# ------------------------------------------------------------------ PLANNER + QUESTS
@api.get("/planner")
async def list_planner(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"tasks": tasks}


@api.post("/planner")
async def create_task(payload: TaskCreate, user: dict = Depends(get_current_user)):
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
    r = await db.tasks.update_one(
        {"id": task_id, "user_id": user["user_id"]},
        {"$set": updates},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return {"task": task}


@api.delete("/planner/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"id": task_id, "user_id": user["user_id"]})
    return {"ok": True}


# ------------------------------------------------------------------ COLLECTIONS (saves)
@api.get("/collections")
async def list_saves(user: dict = Depends(get_current_user)):
    saves = await db.saves.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"saves": saves}


@api.post("/collections")
async def add_save(payload: CollectionItem, user: dict = Depends(get_current_user)):
    record = {
        "id": f"sv_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "kind": payload.kind,
        "ref_id": payload.ref_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    # De-dupe
    existing = await db.saves.find_one({"user_id": user["user_id"], "kind": payload.kind, "ref_id": payload.ref_id}, {"_id": 0})
    if existing:
        return {"save": existing, "existed": True}
    await db.saves.insert_one(record.copy())
    return {"save": record, "existed": False}


@api.delete("/collections/{save_id}")
async def remove_save(save_id: str, user: dict = Depends(get_current_user)):
    await db.saves.delete_one({"id": save_id, "user_id": user["user_id"]})
    return {"ok": True}


# ------------------------------------------------------------------ NEWS FEED
@api.get("/news")
async def news(kind: Optional[str] = None):
    """Fresh from the world — new careers, career news, and industry facts.
    `kind` filters: new_career | news | fact | all."""
    items = NEWS_ITEMS
    if kind and kind != "all":
        items = [n for n in items if n["kind"] == kind]
    # Rotate so it feels fresh but stable within a day
    import hashlib
    seed = int(hashlib.md5(datetime.now(timezone.utc).strftime("%Y-%m-%d").encode()).hexdigest(), 16)
    ordered = items[seed % len(items):] + items[: seed % len(items)] if items else []
    return {"items": ordered}


# ------------------------------------------------------------------ DAILY DISCOVERY
@api.get("/discover/today")
async def discover_today(user: dict = Depends(get_current_user)):
    # Deterministic-by-day pick so it feels fresh but stable within a day
    import hashlib
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


# ------------------------------------------------------------------ MOUNT
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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
