"""In-process fixed-window rate limiting.

Deliberately simple: this is a single-worker deployment, so a shared store would
be extra infrastructure for no benefit. If the service is ever scaled to more
than one worker this must move to Redis, because each worker keeps its own
counters.
"""

import threading
import time
from collections import defaultdict


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int = 60):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        """Return (allowed, seconds_until_reset)."""
        if self.limit <= 0:
            return True, 0

        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            hits = [t for t in self._hits[key] if t > cutoff]
            if len(hits) >= self.limit:
                self._hits[key] = hits
                return False, int(self.window - (now - hits[0])) + 1
            hits.append(now)
            self._hits[key] = hits

            # Opportunistic cleanup so the dict cannot grow unboundedly.
            if len(self._hits) > 4096:
                for stale_key in [
                    k for k, v in self._hits.items() if not v or v[-1] <= cutoff
                ]:
                    self._hits.pop(stale_key, None)
            return True, 0
