"""Shared fixtures for Mission Velora backend tests.

Includes:
- api_client: requests.Session
- seeded_session_token: injects a user + session_token into Mongo (per test_credentials.md)
  and yields the token; cleans up after tests.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://velora-learn-1.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

TEST_USER_ID = "user_test0000001"
TEST_EMAIL = "TEST_velora_tester@velora.local"
TEST_TOKEN = "test-token-velora-abc123"


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session")
def api_client() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="session")
def seeded_session_token(mongo_db):
    """Insert a test user + session and return the bearer token."""
    now = datetime.now(timezone.utc)
    mongo_db.users.update_one(
        {"user_id": TEST_USER_ID},
        {"$set": {
            "user_id": TEST_USER_ID,
            "email": TEST_EMAIL,
            "name": "Velora Tester",
            "picture": None,
            "onboarding_complete": False,
            "created_at": now.isoformat(),
        }},
        upsert=True,
    )
    mongo_db.user_sessions.update_one(
        {"session_token": TEST_TOKEN},
        {"$set": {
            "session_token": TEST_TOKEN,
            "user_id": TEST_USER_ID,
            "expires_at": now + timedelta(days=7),
            "created_at": now,
        }},
        upsert=True,
    )
    yield TEST_TOKEN
    # Cleanup
    mongo_db.user_sessions.delete_one({"session_token": TEST_TOKEN})
    mongo_db.tasks.delete_many({"user_id": TEST_USER_ID})
    mongo_db.saves.delete_many({"user_id": TEST_USER_ID})
    mongo_db.onboarding.delete_many({"user_id": TEST_USER_ID})
    mongo_db.blueprints.delete_many({"user_id": TEST_USER_ID})
    mongo_db.users.delete_one({"user_id": TEST_USER_ID})


@pytest.fixture(scope="session")
def auth_headers(seeded_session_token):
    return {"Authorization": f"Bearer {seeded_session_token}", "Content-Type": "application/json"}
