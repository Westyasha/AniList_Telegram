from unittest.mock import Mock

from aiohttp import web
from aiohttp.test_utils import make_mocked_request

from app.web.api import client_ip
from app.web.operations import OPERATIONS


def request_from(peer: str, headers: dict[str, str]) -> web.Request:
    transport = Mock()
    transport.get_extra_info.side_effect = lambda key, default=None: (peer, 1234) if key == "peername" else default
    return make_mocked_request("GET", "/api/session", headers=headers, transport=transport)


def test_forwarded_ip_trusted_only_from_private_proxy() -> None:
    headers = {"X-Real-IP": "1.2.3.4"}
    assert client_ip(request_from("172.18.0.2", headers)) == "1.2.3.4"
    assert client_ip(request_from("127.0.0.1", headers)) == "1.2.3.4"
    assert client_ip(request_from("8.8.4.4", headers)) == "8.8.4.4"


def test_mutations_require_auth() -> None:
    for name, operation in OPERATIONS.items():
        if operation.mutation:
            assert operation.auth, name
            assert operation.ttl == 0, name
