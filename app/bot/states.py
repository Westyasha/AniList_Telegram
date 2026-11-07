from aiogram.fsm.state import State, StatesGroup


class Input(StatesGroup):
    text = State()
