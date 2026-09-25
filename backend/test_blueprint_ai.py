import asyncio
from server import _generate_blueprint, OnboardingPayload

async def main():
    user = {"user_id": "local-ai-test"}

    payload = OnboardingPayload(
        achievement_tags=["technology", "creative", "entrepreneurship"],
        custom_achievements=["Build a useful AI product"],
        board_pins=[{"title": "AI"}, {"title": "design"}, {"title": "travel"}],
    )

    result = await _generate_blueprint(user, payload)
    print(result)

asyncio.run(main())
