import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from risk_engine import RiskEngine
from ingest.usgs import fetch_earthquakes
from ingest.cpcb import fetch_aqi
from database import get_db, Alert, AsyncSessionLocal
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class IngestionManager:
    """
    Orchestrates data ingestion:
    1. Fetch data from external APIs (USGS, etc.)
    2. Pass data to RiskEngine (Deterministic)
    3. If Alert == True, save to DB and Trigger Notification
    """

    @staticmethod
    async def run_ingest_cycle(db: AsyncSession):
        logger.info("Starting Ingestion Cycle...")
        
        # 1. Earthquakes
        quakes = await fetch_earthquakes()
        for quake in quakes:
            # Check Risk
            risk = RiskEngine.evaluate_tsunami_risk(
                magnitude=quake['magnitude'],
                depth_km=quake['depth_km'],
                is_coastal=True # TODO: Geo check
            )
            
            if risk['alert']:
                # Deduplicate check omitted for brevity (in prod check source_id)
                new_alert = Alert(
                    id=str(uuid.uuid4()),
                    alert_type="tsunami" if risk['level'] == "Tsunami Potential" else "earthquake",
                    severity=risk['severity'],
                    title=f"{risk['level']}: Mag {quake['magnitude']}",
                    description=f"Automated Alert. {risk['level']} detected. Depth: {quake['depth_km']}km.",
                    location={"lat": quake['lat'], "lon": quake['lon']},
                    source="USGS",
                    created_at=datetime.now(timezone.utc),
                    is_active=True,
                    alert_metadata=risk
                )
                db.add(new_alert)
                logger.info(f"Generated Alert: {new_alert.title}")

        await db.commit()
        logger.info("Ingestion Cycle Complete.")

async def manual_trigger():
    async with AsyncSessionLocal() as db:
        await IngestionManager.run_ingest_cycle(db)

if __name__ == "__main__":
    # Test run
    asyncio.run(manual_trigger())
