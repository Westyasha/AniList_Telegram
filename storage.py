import json
import os

STORAGE_FILE = "users.json"


def _load():
    if not os.path.exists(STORAGE_FILE):
        return {}
    with open(STORAGE_FILE, "r") as f:
        return json.load(f)


def _save(data: dict):
    with open(STORAGE_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _get_user(user_id: int) -> dict:
    return _load().get(str(user_id), {})


def _set_user(user_id: int, updates: dict):
    data = _load()
    uid = str(user_id)
    if uid not in data:
        data[uid] = {}
    data[uid].update(updates)
    _save(data)


def get_token(user_id: int):
    return _get_user(user_id).get("token")


def set_token(user_id: int, token: str, anilist_id: int = None):
    upd = {"token": token}
    if anilist_id:
        upd["anilist_id"] = anilist_id
    _set_user(user_id, upd)


def get_anilist_id(user_id: int):
    val = _get_user(user_id).get("anilist_id")
    return int(val) if val else None


def set_anilist_id(user_id: int, anilist_id: int):
    _set_user(user_id, {"anilist_id": anilist_id})


def remove_token(user_id: int):
    data = _load()
    uid = str(user_id)
    if uid in data:
        data[uid].pop("token", None)
        data[uid].pop("anilist_id", None)
        _save(data)


def get_lang(user_id: int) -> str:
    return _get_user(user_id).get("lang", "ru")


def set_lang(user_id: int, lang: str):
    _set_user(user_id, {"lang": lang})
