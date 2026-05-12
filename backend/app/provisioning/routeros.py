import asyncio

from librouteros import connect

from app.config import settings
from app.provisioning.base import ProvisioningBackend


class MikroTikBackend(ProvisioningBackend):
    name = "routeros"

    def _get_connection(self):
        return connect(
            host=settings.ROUTEROS_HOST or "127.0.0.1",
            port=settings.ROUTEROS_PORT or 8728,
            username=settings.ROUTEROS_USERNAME or "admin",
            password=settings.ROUTEROS_PASSWORD or "",
            timeout=10,
        )

    async def _call(self, method: str, *args, **kwargs) -> dict:
        try:
            api = await asyncio.to_thread(self._get_connection)
            if method == "add_ppp_secret":
                result = await asyncio.to_thread(
                    lambda: api("/ppp/secret/add", **kwargs)
                )
            elif method == "enable_ppp_secret":
                result = await asyncio.to_thread(
                    lambda: api("/ppp/secret/enable", **kwargs)
                )
            elif method == "disable_ppp_secret":
                result = await asyncio.to_thread(
                    lambda: api("/ppp/secret/disable", **kwargs)
                )
            elif method == "remove_ppp_secret":
                result = await asyncio.to_thread(
                    lambda: api("/ppp/secret/remove", **kwargs)
                )
            elif method == "set_queue":
                result = await asyncio.to_thread(
                    lambda: api("/queue/simple/set", **kwargs)
                )
            elif method == "add_queue":
                result = await asyncio.to_thread(
                    lambda: api("/queue/simple/add", **kwargs)
                )
            elif method == "remove_queue":
                result = await asyncio.to_thread(
                    lambda: api("/queue/simple/remove", **kwargs)
                )
            else:
                raise ValueError(f"Unknown method: {method}")
            return {"success": True, "result": str(result)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def provision(
        self, username: str, password: str, download_speed: int, upload_speed: int
    ) -> dict:
        secret = await self._call(
            "add_ppp_secret",
            name=username,
            password=password,
            service="pppoe",
            profile="default",
        )
        if not secret["success"]:
            return secret

        queue = await self._call(
            "add_queue",
            name=username,
            target=username,
            max_limit=f"{upload_speed}M/{download_speed}M",
        )
        return {"success": True, "secret": secret, "queue": queue}

    async def suspend(self, username: str) -> dict:
        result = await self._call("disable_ppp_secret", **{".id": username})
        queue_disable = await self._call(
            "set_queue", **{".id": username, "disabled": "yes"}
        )
        return {"success": result.get("success", False), "result": result}

    async def restore(self, username: str) -> dict:
        result = await self._call("enable_ppp_secret", **{".id": username})
        queue_enable = await self._call(
            "set_queue", **{".id": username, "disabled": "no"}
        )
        return {"success": result.get("success", False), "result": result}

    async def change_speed(
        self, username: str, download_speed: int, upload_speed: int
    ) -> dict:
        result = await self._call(
            "set_queue",
            **{
                ".id": username,
                "max_limit": f"{upload_speed}M/{download_speed}M",
            },
        )
        return result

    async def deprovision(self, username: str) -> dict:
        await self._call("remove_ppp_secret", **{".id": username})
        await self._call("remove_queue", **{".id": username})
        return {"success": True}


class MockMikroTikBackend(ProvisioningBackend):
    name = "mock_routeros"

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
