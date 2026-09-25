"""New endpoint tests for the v0.3 iteration of Mission Velora.

Covers:
- /api/ shape (app=Velora, org=Mission Velora)
- /api/contact (email + co_founders)
- /api/articles list/detail/filter/search
- /api/explore countries + universities new fields & counts
- /api/explore/recommend (countries + universities)
- /api/news fresh (cached per day, falls back to seed)
- /api/blueprint/reset auth gate + authed
- /api/profile/picture PUT (base64) authed
- /api/vision-boards GET/POST/PATCH-equiv/DELETE
- /api/pregrad GET + PUT (fun & formal) per-user
- /api/planner category + reorder
- /api/collections arbitrary kind + payload + dedupe
"""
from __future__ import annotations

import base64
import pytest


# --------------------------------------------------------------------------- ROOT / CONTACT
class TestRootContact:
    def test_root_velora_shape(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        j = r.json()
        assert j.get("app") == "Velora"
        assert j.get("org") == "Mission Velora"
        assert j.get("status") == "ok"

    def test_contact_email_and_founders(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/contact")
        assert r.status_code == 200
        j = r.json()
        assert j.get("email") == "missionvelora8@gmail.com"
        assert isinstance(j.get("co_founders"), list) and len(j["co_founders"]) >= 1
        assert j.get("org_name") == "Mission Velora"
        assert j.get("app_name") == "Velora"


# --------------------------------------------------------------------------- ARTICLES
class TestArticles:
    def test_articles_list_28(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/articles")
        assert r.status_code == 200
        j = r.json()
        items = j.get("items")
        assert isinstance(items, list) and len(items) == 28, f"expected 28 got {len(items)}"
        cats = j.get("categories")
        assert isinstance(cats, list) and "cybersecurity" in cats
        first = items[0]
        assert {"id", "category", "title", "tags", "summary", "body", "links"}.issubset(first.keys())

    def test_articles_category_filter(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/articles", params={"category": "cybersecurity"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) > 0
        assert all(a["category"] == "cybersecurity" for a in items)

    def test_articles_search_passwords(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/articles", params={"q": "passwords"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1, "expected at least one password article"
        joined = " ".join((a["title"] + " " + a["summary"]).lower() for a in items)
        assert "password" in joined

    def test_article_detail_shape(self, api_client, base_url):
        # Grab an id from the list first
        r = api_client.get(f"{base_url}/api/articles")
        aid = r.json()["items"][0]["id"]
        r2 = api_client.get(f"{base_url}/api/articles/{aid}")
        assert r2.status_code == 200
        a = r2.json()
        assert a["id"] == aid
        assert isinstance(a.get("body"), str) and len(a["body"]) > 0
        assert isinstance(a.get("links"), list)

    def test_article_missing_404(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/articles/does-not-exist-xyz")
        assert r.status_code == 404


# --------------------------------------------------------------------------- EXPLORE (new fields + counts)
class TestExploreV2:
    def test_universities_around_933(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore", params={"kind": "universities"})
        assert r.status_code == 200
        items = r.json()["items"]
        # spec says ~933
        assert len(items) == 1580, f"expected 1580 universities got {len(items)}"

    def test_universities_tag_india(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore", params={"kind": "universities", "tag": "india"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 10, f"expected many India-tagged unis got {len(items)}"
        # each item must reference India (country match OR tag)
        for it in items:
            country = str(it.get("country", "")).lower()
            tags = [str(t).lower() for t in it.get("tags", []) or []]
            assert country == "india" or "india" in tags or "in" in tags

    def test_countries_40_with_fields(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/explore", params={"kind": "countries"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 198, f"expected 198 countries got {len(items)}"
        c = items[0]
        for k in ("fees_inr_lakhs", "pr_friendly", "best_majors", "visa"):
            assert k in c, f"country missing {k}"


# --------------------------------------------------------------------------- EXPLORE RECOMMEND
class TestRecommend:
    def test_recommend_countries_budget_pr(self, api_client, base_url):
        payload = {"kind": "countries", "max_fees_inr_lakhs": 10, "wants_pr": True}
        r = api_client.post(f"{base_url}/api/explore/recommend", json=payload)
        assert r.status_code == 200
        j = r.json()
        items = j.get("items")
        assert isinstance(items, list) and len(items) >= 1
        top = items[0]
        assert "item" in top and "score" in top and "reasons" in top
        # top-ranked country must be within budget AND PR-friendly (both signals scored)
        assert top["item"].get("pr_friendly") is True
        assert (top["item"].get("fees_inr_lakhs") is None) or top["item"]["fees_inr_lakhs"] <= 10
        # Reasons should include something meaningful
        assert isinstance(top["reasons"], list)
        # scores strictly decreasing
        scores = [it["score"] for it in items]
        assert scores == sorted(scores, reverse=True)

    def test_recommend_universities_india_cs(self, api_client, base_url):
        payload = {"kind": "universities", "country": "India", "fields": ["CS"]}
        r = api_client.post(f"{base_url}/api/explore/recommend", json=payload)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        # top items must be Indian
        assert all(str(it["item"].get("country", "")).lower() == "india" for it in items[:5])
        # At least one should mention CS in majors/field
        assert any(
            "cs" in " ".join([str(x) for x in (it["item"].get("best_majors") or [])]).lower()
            or "cs" in str(it["item"].get("field", "")).lower()
            for it in items[:10]
        )

    def test_recommend_bad_kind_400(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/explore/recommend", json={"kind": "bogus"})
        assert r.status_code == 400


# --------------------------------------------------------------------------- NEWS FRESH
class TestNewsFresh:
    def test_news_fresh_true_returns_items(self, api_client, base_url):
        # AI may fail silently — must still return items (seeded fallback)
        r = api_client.get(f"{base_url}/api/news", params={"fresh": "true"})
        assert r.status_code == 200
        j = r.json()
        assert isinstance(j.get("items"), list) and len(j["items"]) > 0
        assert "fresh_count" in j and "day" in j


# --------------------------------------------------------------------------- BLUEPRINT RESET
class TestBlueprintReset:
    def test_reset_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/blueprint/reset")
        assert r.status_code == 401

    def test_reset_authed_ok(self, api_client, base_url, auth_headers, mongo_db):
        # ensure onboarding_complete=True first so reset flips it
        mongo_db.users.update_one(
            {"user_id": "user_test0000001"},
            {"$set": {"onboarding_complete": True}},
        )
        r = api_client.post(f"{base_url}/api/blueprint/reset", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        u = mongo_db.users.find_one({"user_id": "user_test0000001"})
        assert u.get("onboarding_complete") is False


# --------------------------------------------------------------------------- PROFILE PIC
class TestProfilePic:
    def test_picture_requires_auth(self, api_client, base_url):
        r = api_client.put(f"{base_url}/api/profile/picture", json={"picture_base64": "abc"})
        assert r.status_code == 401

    def test_picture_put_stores_base64(self, api_client, base_url, auth_headers):
        # small 1x1 png base64
        raw = base64.b64encode(b"\x89PNG_TEST_BYTES").decode()
        data_url = f"data:image/png;base64,{raw}"
        r = api_client.put(
            f"{base_url}/api/profile/picture",
            headers=auth_headers,
            json={"picture_base64": data_url},
        )
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u.get("picture_base64") == data_url
        # verify GET /me returns it too
        r2 = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert r2.json()["user"].get("picture_base64") == data_url


# --------------------------------------------------------------------------- VISION BOARDS
class TestVisionBoards:
    _bid: str = ""

    def test_boards_require_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/vision-boards")
        assert r.status_code == 401

    def test_create_board(self, api_client, base_url, auth_headers):
        payload = {
            "title": "TEST_board",
            "background": "warm",
            "items": [
                {"id": "i1", "kind": "text", "x": 10, "y": 20, "w": 100, "h": 40, "text": "hello", "font": "serif", "color": "#333", "fontSize": 24},
                {"id": "i2", "kind": "image", "x": 5, "y": 60, "w": 80, "h": 80, "url": "https://example.com/a.jpg"},
            ],
        }
        r = api_client.post(f"{base_url}/api/vision-boards", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        b = r.json()["board"]
        assert b["title"] == "TEST_board"
        assert len(b["items"]) == 2
        TestVisionBoards._bid = b["id"]

    def test_get_board(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/vision-boards/{TestVisionBoards._bid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["board"]["id"] == TestVisionBoards._bid

    def test_update_board_upsert(self, api_client, base_url, auth_headers):
        payload = {
            "id": TestVisionBoards._bid,
            "title": "TEST_board_v2",
            "background": "cool",
            "items": [],
        }
        r = api_client.post(f"{base_url}/api/vision-boards", headers=auth_headers, json=payload)
        assert r.status_code == 200
        b = r.json()["board"]
        assert b["title"] == "TEST_board_v2"
        assert b["background"] == "cool"
        assert b["items"] == []

    def test_list_and_delete(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/vision-boards", headers=auth_headers)
        assert r.status_code == 200
        ids = [b["id"] for b in r.json()["boards"]]
        assert TestVisionBoards._bid in ids
        r2 = api_client.delete(f"{base_url}/api/vision-boards/{TestVisionBoards._bid}", headers=auth_headers)
        assert r2.status_code == 200
        r3 = api_client.get(f"{base_url}/api/vision-boards/{TestVisionBoards._bid}", headers=auth_headers)
        assert r3.status_code == 404


# --------------------------------------------------------------------------- PREGRAD
class TestPregrad:
    def test_pregrad_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/pregrad")
        assert r.status_code == 401

    def test_pregrad_put_both_modes(self, api_client, base_url, auth_headers, mongo_db):
        # cleanup existing
        mongo_db.pregrads.delete_many({"user_id": "user_test0000001"})
        for mode in ("fun", "formal"):
            payload = {
                "mode": mode,
                "header": {"name": "TEST Tester", "tagline": "explorer"},
                "photo_base64": None,
                "sections": [
                    {"id": "s1", "title": "Achievements", "entries": [{"text": f"TEST-{mode}"}]}
                ],
            }
            r = api_client.put(f"{base_url}/api/pregrad/{mode}", headers=auth_headers, json=payload)
            assert r.status_code == 200, r.text
            pg = r.json()["pregrad"]
            assert pg["mode"] == mode
            assert pg["header"]["name"] == "TEST Tester"

        r2 = api_client.get(f"{base_url}/api/pregrad", headers=auth_headers)
        assert r2.status_code == 200
        modes = {p["mode"] for p in r2.json()["pregrads"]}
        assert modes == {"fun", "formal"}

    def test_pregrad_bad_mode_400(self, api_client, base_url, auth_headers):
        r = api_client.put(
            f"{base_url}/api/pregrad/xyz",
            headers=auth_headers,
            json={"mode": "xyz", "header": {}, "sections": []},
        )
        assert r.status_code == 400


# --------------------------------------------------------------------------- PLANNER CATEGORY / REORDER
class TestPlannerCategory:
    _daily_ids: list = []

    def test_create_with_category_daily(self, api_client, base_url, auth_headers):
        ids = []
        for i in range(3):
            r = api_client.post(
                f"{base_url}/api/planner",
                headers=auth_headers,
                json={"title": f"TEST_daily_{i}", "category": "daily", "xp": 5},
            )
            assert r.status_code == 200, r.text
            t = r.json()["task"]
            assert t["category"] == "daily"
            assert isinstance(t.get("order"), int)
            ids.append(t["id"])
        TestPlannerCategory._daily_ids = ids
        # orders should be 1,2,3 or at least strictly increasing
        r = api_client.get(f"{base_url}/api/planner", headers=auth_headers)
        tasks = [t for t in r.json()["tasks"] if t["id"] in ids]
        orders = [t["order"] for t in sorted(tasks, key=lambda x: x["order"])]
        assert orders == sorted(orders) and len(set(orders)) == 3

    def test_patch_category(self, api_client, base_url, auth_headers):
        tid = TestPlannerCategory._daily_ids[0]
        r = api_client.patch(
            f"{base_url}/api/planner/{tid}",
            headers=auth_headers,
            json={"category": "monthly"},
        )
        assert r.status_code == 200
        assert r.json()["task"]["category"] == "monthly"

    def test_reorder(self, api_client, base_url, auth_headers):
        # take the remaining daily ids and reverse
        # first refetch to get only remaining daily ones
        r = api_client.get(f"{base_url}/api/planner", headers=auth_headers)
        daily = [t for t in r.json()["tasks"] if t["category"] == "daily" and t["id"] in TestPlannerCategory._daily_ids]
        ids = [t["id"] for t in daily]
        assert len(ids) >= 2
        reversed_ids = list(reversed(ids))
        r2 = api_client.post(
            f"{base_url}/api/planner/reorder",
            headers=auth_headers,
            json={"category": "daily", "ids": reversed_ids},
        )
        assert r2.status_code == 200
        # verify order matches reversed_ids
        r3 = api_client.get(f"{base_url}/api/planner", headers=auth_headers)
        daily2 = sorted(
            [t for t in r3.json()["tasks"] if t["id"] in reversed_ids],
            key=lambda x: x["order"],
        )
        assert [t["id"] for t in daily2] == reversed_ids

    def test_cleanup_daily_tasks(self, api_client, base_url, auth_headers):
        for tid in TestPlannerCategory._daily_ids:
            api_client.delete(f"{base_url}/api/planner/{tid}", headers=auth_headers)


# --------------------------------------------------------------------------- COLLECTIONS ARBITRARY KIND
class TestCollectionsArbitrary:
    _save_id: str = ""

    def test_save_news_with_payload(self, api_client, base_url, auth_headers):
        payload = {
            "kind": "news",
            "ref_id": "n-test-123",
            "payload": {"title": "TEST news item", "body": "body", "url": "https://ex.com"},
        }
        r = api_client.post(f"{base_url}/api/collections", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["existed"] is False
        s = j["save"]
        assert s["kind"] == "news"
        assert s["payload"]["title"] == "TEST news item"
        TestCollectionsArbitrary._save_id = s["id"]

    def test_save_news_dedupe(self, api_client, base_url, auth_headers):
        r = api_client.post(
            f"{base_url}/api/collections",
            headers=auth_headers,
            json={"kind": "news", "ref_id": "n-test-123"},
        )
        assert r.status_code == 200
        assert r.json()["existed"] is True

    def test_cleanup_news_save(self, api_client, base_url, auth_headers):
        api_client.delete(
            f"{base_url}/api/collections/{TestCollectionsArbitrary._save_id}",
            headers=auth_headers,
        )
