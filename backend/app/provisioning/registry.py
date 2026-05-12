from app.config import settings
from app.provisioning.base import ProvisioningBackend
from app.provisioning.freeradius import FreeRADIUSBackend, MockFreeRADIUSBackend
from app.provisioning.routeros import MikroTikBackend, MockMikroTikBackend


_backends: dict[str, ProvisioningBackend] = {}


def _init_backends():
    if settings.PROVISIONING_BACKEND == "routeros":
        if settings.DEBUG:
            _backends["routeros"] = MockMikroTikBackend()
        else:
            _backends["routeros"] = MikroTikBackend()
    elif settings.PROVISIONING_BACKEND == "freeradius":
        if settings.DEBUG:
            _backends["freeradius"] = MockFreeRADIUSBackend()
        else:
            _backends["freeradius"] = FreeRADIUSBackend()
    elif settings.PROVISIONING_BACKEND == "both":
        if settings.DEBUG:
            _backends["routeros"] = MockMikroTikBackend()
            _backends["freeradius"] = MockFreeRADIUSBackend()
        else:
            _backends["routeros"] = MikroTikBackend()
            _backends["freeradius"] = FreeRADIUSBackend()


def get_provisioning_backend(name: str | None = None) -> ProvisioningBackend | None:
    if not _backends:
        _init_backends()
    if name:
        return _backends.get(name)
    if _backends:
        return list(_backends.values())[0]
    return None


def get_all_backends() -> list[ProvisioningBackend]:
    if not _backends:
        _init_backends()
    return list(_backends.values())
