from app.bot import navigation as nav
from app.bot import screens
from app.bot.handlers.actions import next_progress_state


def test_screens_registered() -> None:
    assert screens.__all__
    paths = ["/home", "/m/1", "/m/1/c/2", "/ch/5", "/s/A/abc/1", "/tr/A/1", "/se/now/1", "/sch/0/m", "/u/Name/stats"]
    for path in paths:
        assert nav.routes.resolve(path) is not None, path


def test_stack_push_replace_and_truncate() -> None:
    stack = nav._next_stack([], "/home")
    stack = nav._next_stack(stack, "/tr/A/1")
    stack = nav._next_stack(stack, "/tr/A/2")
    assert stack == ["/home", "/tr/A/2"]
    stack = nav._next_stack(stack, "/m/10")
    stack = nav._next_stack(stack, "/m/10/r")
    stack = nav._next_stack(stack, "/m/11")
    assert stack == ["/home", "/tr/A/2", "/m/10", "/m/10/r", "/m/11"]
    assert nav._next_stack(stack, "/m/10") == ["/home", "/tr/A/2", "/m/10"]
    assert nav._next_stack(stack, "/home") == ["/home"]


def test_target_roundtrip() -> None:
    target = nav.Target(chat_id=-100, message_id=7)
    assert nav.Target.parse(target.key) == target
    inline = nav.Target(inline_message_id="AbC:1")
    assert nav.Target.parse(inline.key) == inline


def media(status: str | None, progress: int, episodes: int = 12) -> dict:
    entry = {"status": status, "progress": progress, "repeat": 1} if status else None
    return {"id": 1, "type": "ANIME", "episodes": episodes, "mediaListEntry": entry}


def test_progress_starts_watching() -> None:
    assert next_progress_state(media(None, 0), 1) == {"mediaId": 1, "progress": 1, "status": "CURRENT"}
    assert next_progress_state(media("PLANNING", 0), 1)["status"] == "CURRENT"


def test_progress_completes_and_counts_rewatch() -> None:
    assert next_progress_state(media("CURRENT", 11), 1)["status"] == "COMPLETED"
    rewatch = next_progress_state(media("REPEATING", 11), 1)
    assert rewatch["status"] == "COMPLETED"
    assert rewatch["repeat"] == 2


def test_progress_never_negative_or_above_total() -> None:
    assert next_progress_state(media("CURRENT", 0), -1)["progress"] == 0
    assert next_progress_state(media("CURRENT", 12), 1)["progress"] == 12
    assert next_progress_state(media("COMPLETED", 12), -1)["status"] == "CURRENT"
