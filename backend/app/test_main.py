import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}

@pytest.mark.asyncio
async def test_404_error_handler():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/nonexistent-endpoint")
    assert response.status_code == 404
    # FastAPI's default 404 handler doesn't use our AppError automatically unless we override it,
    # but let's just assert 404 for now.
