"""Backend API tests for Mission Velora.

Covers:
- Public endpoints (/api/, quotes, onboarding library, news, explore)
- Auth-gate behaviour (401 without token)
- Auth-gated CRUD with injected session (planner, collections, blueprint, discover, onboarding/complete)
"""
from __future__ import annotations

import pytest


# ------------------------------------------- PUBLIC
class TestPublic:
    def test_root_ok(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        j = r.json()
        assert j.get("status") == "ok"
        assert j.get("app") == "Velora"
        assert j.get("org") == "Mission Velora"

    def test_quotes_non_empty(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/quotes")
        assert r.status_code == 200
        quotes = r.json().get("quotes")
        assert isinstance(quotes, list) and len(quotes) > 0
        assert all(isinstance(q, str) and q for q in quotes)

    def test_onboarding_library_shape(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/onboarding/library")
        assert r.status_code == 200
        j = r.json()
        for key in ("achievements", "life_prompts", "board_images"):
            assert key in j, f"missing {key}"
            assert isinstance(j[key], list) and len(j[key]) > 0
        # Shape checks
        assert {"id", "title", "tag"}.issubset(j["achievements"][0].keys())
        assert {"id", "group", "label"}.issubset(j["life_prompts"][0].keys())
        assert {"id", "url", "tags"}.issubset(j["board_images"][0].keys())


# ------------------------------------------- NEWS
class TestNews:
    def test_news_default_returns_items(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/news")
        assert r.status_code == 200
        items = r.json().get("items")
        assert isinstance(items, list) and len(items) > 0
        assert {"id", "kind", "title", "body"}.issubset(items[0].keys())

    @pytest.mark.parametrize("kind", ["new_career", "news", "fact", "all"])
    def test_news_filter_by_kind(self, api_client, base_url, kind):
        r = api_client.get(f"{base_url}/api/news", params={"kind": kind})
        assert r.status_code == 200
        items = r.json().get("items")
        assert isinstance(items, list) and len(items) > 0
        if kind != "all":
            assert all(i["kind"] == kind for i in items)


# ------------------------------------------- EXPLORE
class TestExplore:
    def test_scholarships_seeded_count(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore", params={"kind": "scholarships"})
        assert r.status_code == 200
        items = r.json().get("items")
        assert isinstance(items, list)
        assert len(items) >= 15, f"expected >=15 seeded scholarships got {len(items)}"

    def test_scholarships_query_filter(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore", params={"kind": "scholarships", "q": "rhodes"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        assert any(i["id"] == "s-rhodes" for i in items)

    def test_scholarships_tag_filter(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore", params={"kind": "scholarships", "tag": "leadership"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        assert all("leadership" in (i.get("tags") or []) for i in items)

    def test_scholarship_detail(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore/scholarships/s-rhodes")
        assert r.status_code == 200
        j = r.json()
        assert j["id"] == "s-rhodes"
        assert "Rhodes" in j["title"]

    def test_unknown_kind_returns_404(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore/unknown_kind/xyz")
        assert r.status_code == 404

    def test_unknown_item_returns_404(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore/scholarships/does-not-exist")
        assert r.status_code == 404


# ------------------------------------------- AUTH GATE
class TestAuthGate:
    def test_me_401_without_token(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_session_invalid_id_401(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/auth/session", json={"session_id": "definitely-invalid-xyz"})
        assert r.status_code == 401

    @pytest.mark.parametrize("path", [
        "/api/planner",
        "/api/collections",
        "/api/blueprint",
        "/api/discover/today",
    ])
    def test_gated_endpoint_401(self, api_client, base_url, path):
        r = api_client.get(f"{base_url}{path}")
        assert r.status_code == 401


# ------------------------------------------- AUTHED /me
class TestAuthed:
    def test_me_with_token(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["email"] == "TEST_velora_tester@velora.local"
        assert u["user_id"] == "user_test0000001"

    def test_discover_today_shape(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/discover/today", headers=auth_headers)
        assert r.status_code == 200
        j = r.json()
        for k in ("quote", "hidden_course", "scholarship", "university", "country", "mun", "challenge"):
            assert k in j, f"missing {k}"
        assert "title" in j["challenge"] and "xp" in j["challenge"]


# ------------------------------------------- PLANNER CRUD
class TestPlannerCRUD:
    _created_id: str = ""

    def test_create_task(self, api_client, base_url, auth_headers):
        payload = {"title": "TEST_write essay draft", "detail": "TEST", "kind": "task", "xp": 15}
        r = api_client.post(f"{base_url}/api/planner", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        task = r.json()["task"]
        assert task["title"] == payload["title"]
        assert task["status"] == "todo"
        assert task["xp"] == 15
        TestPlannerCRUD._created_id = task["id"]

    def test_list_contains_created(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/planner", headers=auth_headers)
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()["tasks"]]
        assert TestPlannerCRUD._created_id in ids

    def test_patch_status_done(self, api_client, base_url, auth_headers):
        r = api_client.patch(
            f"{base_url}/api/planner/{TestPlannerCRUD._created_id}",
            headers=auth_headers,
            json={"status": "done"},
        )
        assert r.status_code == 200, r.text
        task = r.json()["task"]
        assert task["status"] == "done"
        assert "completed_at" in task

    def test_delete_task(self, api_client, base_url, auth_headers):
        r = api_client.delete(
            f"{base_url}/api/planner/{TestPlannerCRUD._created_id}",
            headers=auth_headers,
        )
        assert r.status_code == 200
        # Verify absent
        r2 = api_client.get(f"{base_url}/api/planner", headers=auth_headers)
        ids = [t["id"] for t in r2.json()["tasks"]]
        assert TestPlannerCRUD._created_id not in ids


# ------------------------------------------- COLLECTIONS
class TestCollections:
    _save_id: str = ""

    def test_save_scholarship_first(self, api_client, base_url, auth_headers):
        r = api_client.post(
            f"{base_url}/api/collections",
            headers=auth_headers,
            json={"kind": "scholarship", "ref_id": "s-1"},
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["existed"] is False
        TestCollections._save_id = j["save"]["id"]

    def test_save_scholarship_dedupe(self, api_client, base_url, auth_headers):
        r = api_client.post(
            f"{base_url}/api/collections",
            headers=auth_headers,
            json={"kind": "scholarship", "ref_id": "s-1"},
        )
        assert r.status_code == 200
        assert r.json()["existed"] is True

    def test_list_saves(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/collections", headers=auth_headers)
        assert r.status_code == 200
        saves = r.json()["saves"]
        assert any(s["id"] == TestCollections._save_id for s in saves)

    def test_delete_save(self, api_client, base_url, auth_headers):
        r = api_client.delete(
            f"{base_url}/api/collections/{TestCollections._save_id}",
            headers=auth_headers,
        )
        assert r.status_code == 200
        r2 = api_client.get(f"{base_url}/api/collections", headers=auth_headers)
        ids = [s["id"] for s in r2.json()["saves"]]
        assert TestCollections._save_id not in ids


# ------------------------------------------- ONBOARDING COMPLETE (AI or fallback)
class TestOnboardingComplete:
    def test_complete_generates_blueprint(self, api_client, base_url, auth_headers):
        payload = {
            "dream_resume": ["a-startup", "a-ai", "a-book"],
            "custom_achievements": ["Build a global storytelling platform"],
            "life_prompts": ["l-city-tokyo", "l-work-remote", "l-imp-tech"],
            "board_pins": [
                {"id": "b-tech-1", "url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", "tags": "technology,circuits"},
                {"id": "b-space-1", "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", "tags": "space,earth"},
            ],
        }
        r = api_client.post(
            f"{base_url}/api/onboarding/complete",
            headers=auth_headers,
            json=payload,
            timeout=90,
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("ok") is True
        bp = j["blueprint"]
        # Both paths acceptable
        assert bp.get("_source") in ("gemini-2.5-flash", "fallback"), f"unexpected _source={bp.get('_source')}"
        for k in (
            "themes", "one_line_summary", "career_seeds", "hidden_paths",
            "recommended_scholarship_ids", "recommended_university_ids",
            "recommended_hidden_course_ids", "recommended_country_ids",
            "recommended_mun_ids", "side_quests", "generated_at",
        ):
            assert k in bp, f"blueprint missing {k}"
        assert isinstance(bp["themes"], list) and len(bp["themes"]) >= 1
        assert isinstance(bp["career_seeds"], list) and len(bp["career_seeds"]) >= 1

    def test_get_blueprint_after_complete(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/blueprint", headers=auth_headers)
        assert r.status_code == 200
        bp = r.json()["blueprint"]
        assert bp["user_id"] == "user_test0000001"
        assert bp.get("_source") in ("gemini-2.5-flash", "fallback")
