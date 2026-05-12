from abc import ABC, abstractmethod


class ProvisioningBackend(ABC):
    name: str = ""

    @abstractmethod
    async def provision(
        self, username: str, password: str, download_speed: int, upload_speed: int
    ) -> dict:
        ...

    @abstractmethod
    async def suspend(self, username: str) -> dict:
        ...

    @abstractmethod
    async def restore(self, username: str) -> dict:
        ...

    @abstractmethod
    async def change_speed(
        self, username: str, download_speed: int, upload_speed: int
    ) -> dict:
        ...

    @abstractmethod
    async def deprovision(self, username: str) -> dict:
        ...
