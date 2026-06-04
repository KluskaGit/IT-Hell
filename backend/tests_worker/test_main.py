import pytest
import json
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from redis.asyncio import ResponseError
from worker.main import Worker

@pytest.mark.asyncio
async def test_worker_init_redis_success():
    with patch("worker.main.redis_connect") as mock_connect:
        mock_client = AsyncMock()
        mock_connect.return_value = mock_client
        
        worker = Worker()
        await worker.init_redis()
        
        mock_client.xgroup_create.assert_called_once()

@pytest.mark.asyncio
async def test_worker_init_redis_busygroup():
    with patch("worker.main.redis_connect") as mock_connect:
        mock_client = AsyncMock()
        # Simulate BUSYGROUP error
        mock_client.xgroup_create.side_effect = ResponseError("BUSYGROUP Consumer Group name already exists")
        mock_connect.return_value = mock_client
        
        worker = Worker()
        # Should handle BUSYGROUP without raising
        await worker.init_redis()
        
        mock_client.xgroup_create.assert_called_once()

@pytest.mark.asyncio
async def test_worker_run_process_message():
    with patch("worker.main.redis_connect") as mock_connect, \
         patch("worker.main.save_job_offer_to_db") as mock_save:
        
        mock_client = AsyncMock()
        mock_connect.return_value = mock_client
        
        offer_data = {"title": "Test Offer", "company": "Test Inc"}
        payload = {"offer": json.dumps(offer_data)}
        # xreadgroup return format: [ [stream, [ (id, data), ... ]], ... ]
        mock_message = [["test-stream", [("msg-1", payload)]]]
        
        # Yield one message, then cancel the loop
        mock_client.xreadgroup.side_effect = [mock_message, asyncio.CancelledError()]
        
        worker = Worker()
        # Force settings for predictable test
        worker.stream = "test-stream"
        worker.group = "test-group"
        worker.consumer = "test-consumer"
        
        try:
            await worker.run()
        except asyncio.CancelledError:
            pass
        
        mock_save.assert_called_once_with(offer_data)
        mock_client.xack.assert_called_once_with("test-stream", "test-group", "msg-1")
