"""Test MOSDAC authentication"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from mosdac_service import MOSDACService

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

async def test():
    service = MOSDACService()
    print(f"Username: {os.getenv('MOSDAC_USERNAME')}")
    print(f"Password: {'*' * len(os.getenv('MOSDAC_PASSWORD', ''))}")
    try:
        token = await service.authenticate()
        print(f'SUCCESS: Authentication successful: {token[:20]}...')
        print(f'SUCCESS: MOSDAC service is ready!')
    except Exception as e:
        print(f'ERROR: Authentication failed: {e}')

if __name__ == "__main__":
    asyncio.run(test())
