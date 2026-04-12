"""Compatibility wrapper so both `main:app` and `app.main:app` work."""

from main import app

__all__ = ["app"]
