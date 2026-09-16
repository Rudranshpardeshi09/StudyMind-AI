"""Request-scoped user identity.

Resolved once by the auth dependency and passed as the first argument of every
service call, so a query that forgets to scope by user does not type-check at
the call site.
"""

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

    def __str__(self) -> str:  # never log the email
        return f"user:{self.user_id}"
