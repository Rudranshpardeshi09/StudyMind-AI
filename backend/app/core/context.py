from dataclasses import dataclass
from functools import cached_property

from app.core.storage import UserStorage, storage_for


@dataclass(frozen=True)
class UserContext:
    user_id: int
    email: str

    @cached_property
    def storage(self) -> UserStorage:
        return storage_for(self.user_id)

    def __str__(self) -> str:
        return f"user:{self.user_id}"
