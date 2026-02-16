import asyncio
import sys
import os
import logging

# Add parent to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingest.mosdac_metadata import metadata_poller
from database import init_db

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_direct_storage():
    logger.info("🧪 Testing MOSDAC Storage Directly...")
    
    # Init DB (creates tables if needed)
    await init_db()
    
    # Mock Data
    mock_records = [{
        "product_id": "TEST_PRODUCT_001",
        "identifier": "test_file.nc",
        "dataset_id": "TEST_DATASET",
        "timestamp": "2023-10-27T10:00:00Z",
        "bounding_box": None,
        "metadata": {"some": "data"}
    }]
    
    try:
        await metadata_poller.store_metadata(mock_records)
        logger.info("✅ Direct Storage Successful!")
    except Exception as e:
        logger.error(f"❌ Storage Failed: {e}")
        raise e

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_direct_storage())
