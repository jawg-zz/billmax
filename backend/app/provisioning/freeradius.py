from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.provisioning.base import ProvisioningBackend


def _rate_limit_value(download: int, upload: int) -> str:
    return f"{download}M/{upload}M"


class FreeRADIUSBackend(ProvisioningBackend):
    name = "freeradius"

    async def _get_db(self) -> AsyncSession:
        if settings.RADIUS_DATABASE_URL:
            from sqlalchemy.ext.asyncio import (
                async_sessionmaker,
                create_async_engine,
            )
            engine = create_async_engine(settings.RADIUS_DATABASE_URL)
            return async_sessionmaker(engine, expire_on_commit=False)()
        return async_session()

    async def _execute(self, statement: str, params: dict | None = None) -> dict:
        try:
            db = await self._get_db()
            await db.execute(text(statement), params or {})
            await db.commit()
            await db.close()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def provision(
        self, username: str, password: str, download_speed: int, upload_speed: int
    ) -> dict:
        await self._execute(
            "INSERT INTO radcheck (username, attribute, op, value) "
            "VALUES (:u, 'Cleartext-Password', ':=', :p)",
            {"u": username, "p": password},
        )
        await self._execute(
            "INSERT INTO radcheck (username, attribute, op, value) "
            "VALUES (:u, 'Auth-Type', ':=', 'pap')",
            {"u": username},
        )
        await self._execute(
            "INSERT INTO radreply (username, attribute, op, value) "
            "VALUES (:u, 'Mikrotik-Rate-Limit', ':=', :v)",
            {"u": username, "v": _rate_limit_value(download_speed, upload_speed)},
        )
        return {"success": True}

    async def suspend(self, username: str) -> dict:
        result = await self._execute(
            "UPDATE radcheck SET value = '0' "
            "WHERE username = :u AND attribute = 'Cleartext-Password'",
            {"u": username},
        )
        await self._execute(
            "INSERT INTO radreply (username, attribute, op, value) "
            "VALUES (:u, 'Mikrotik-Rate-Limit', ':=', '1k/1k') "
            "ON CONFLICT (username, attribute) DO UPDATE SET value = '1k/1k'",
            {"u": username},
        )
        return result

    async def restore(self, username: str) -> dict:
        # Clear password restriction — user will set a new one on next login
        result = await self._execute(
            "UPDATE radcheck SET value = 'restored' "
            "WHERE username = :u AND attribute = 'Cleartext-Password'",
            {"u": username},
        )
        await self._execute(
            "DELETE FROM radreply WHERE username = :u "
            "AND attribute = 'Mikrotik-Rate-Limit'",
            {"u": username},
        )
        return result

    async def change_speed(
        self, username: str, download_speed: int, upload_speed: int
    ) -> dict:
        result = await self._execute(
            "UPDATE radreply SET value = :v "
            "WHERE username = :u AND attribute = 'Mikrotik-Rate-Limit'",
            {"u": username, "v": _rate_limit_value(download_speed, upload_speed)},
        )
        if not result.get("success"):
            result = await self._execute(
                "INSERT INTO radreply (username, attribute, op, value) "
                "VALUES (:u, 'Mikrotik-Rate-Limit', ':=', :v)",
                {"u": username, "v": _rate_limit_value(download_speed, upload_speed)},
            )
        return result

    async def deprovision(self, username: str) -> dict:
        await self._execute(
            "DELETE FROM radcheck WHERE username = :u", {"u": username}
        )
        await self._execute(
            "DELETE FROM radreply WHERE username = :u", {"u": username}
        )
        return {"success": True}


class MockFreeRADIUSBackend(ProvisioningBackend):
    name = "mock_freeradius"

    async def provision(
        self, username: str, password: str, download_speed: int, upload_speed: int
    ) -> dict:
        return {
            "success": True,
            "username": username,
            "action": "provision",
            "speed": f"{download_speed}/{upload_speed}",
        }

    async def suspend(self, username: str) -> dict:
        return {"success": True, "username": username, "action": "suspend"}

    async def restore(self, username: str) -> dict:
        return {"success": True, "username": username, "action": "restore"}

    async def change_speed(
        self, username: str, download_speed: int, upload_speed: int
    ) -> dict:
        return {
            "success": True,
            "username": username,
            "action": "change_speed",
            "speed": f"{download_speed}/{upload_speed}",
        }

    async def deprovision(self, username: str) -> dict:
        return {"success": True, "username": username, "action": "deprovision"}
