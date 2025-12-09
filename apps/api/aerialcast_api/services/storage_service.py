"""Utilities for interacting with Supabase storage."""

from __future__ import annotations

import base64
import binascii
import mimetypes
import uuid
from io import BytesIO
from typing import Tuple

from flask import current_app
from supabase import Client, create_client


class StorageServiceError(RuntimeError):
    """Raised when storage operations fail or are misconfigured."""


class StorageService:
    """High-level helper for uploading media assets to Supabase storage."""

    _client: Client | None = None

    @classmethod
    def _get_client(cls) -> Client:
        if cls._client is not None:
            return cls._client

        config = current_app.config
        url = config.get("SUPABASE_URL")
        key = config.get("SUPABASE_KEY")
        if not url or not key:
            raise StorageServiceError("Supabase credentials are not configured")

        cls._client = create_client(url, key)
        return cls._client

    @staticmethod
    def _decode_base64_image(image_data: str) -> Tuple[str, bytes]:
        if not image_data:
            raise StorageServiceError("No image payload provided")

        header, _, encoded = image_data.partition(",")
        payload = encoded or header
        mime_type = "application/octet-stream"

        if encoded:
            # data URI detected, derive mime type from prefix
            if ":" in header and ";" in header:
                try:
                    mime_type = header.split(":", 1)[1].split(";", 1)[0]
                except (IndexError, ValueError):  # pragma: no cover - defensive
                    mime_type = "application/octet-stream"
        else:
            # Raw base64 string without data URI
            payload = image_data

        try:
            file_bytes = base64.b64decode(payload, validate=True)
        except binascii.Error as exc:  # pragma: no cover - invalid input handled upstream
            raise StorageServiceError("Invalid base64 image payload") from exc

        return mime_type, file_bytes

    @classmethod
    def upload_drone_image(cls, drone_id: uuid.UUID, image_data: str) -> str:
        bucket = current_app.config.get("SUPABASE_STORAGE_BUCKET")
        if not bucket:
            raise StorageServiceError("Supabase storage bucket is not configured")

        mime_type, file_bytes = cls._decode_base64_image(image_data)
        extension = mimetypes.guess_extension(mime_type) or ".bin"
        object_path = f"drones/{drone_id}/{uuid.uuid4().hex}{extension}"

        client = cls._get_client()
        file_options = {"content-type": mime_type, "upsert": True}
        buffer = BytesIO(file_bytes)
        buffer.seek(0)

        try:
            client.storage.from_(bucket).upload(object_path, buffer, file_options)  # type: ignore[arg-type]
        except Exception as exc:  # pragma: no cover - library raises varied exceptions
            current_app.logger.exception("Failed to upload drone image to Supabase")
            raise StorageServiceError("Failed to upload drone image") from exc

        public_response = client.storage.from_(bucket).get_public_url(object_path)
        public_url: str | None = None

        if isinstance(public_response, str):
            public_url = public_response
        elif isinstance(public_response, dict):
            data = public_response.get("data") if isinstance(public_response.get("data"), dict) else public_response
            if isinstance(data, dict):
                public_url = data.get("publicUrl") or data.get("publicURL")
        else:
            # Supabase client may return a typed object with attribute access.
            candidate = getattr(public_response, "public_url", None) or getattr(public_response, "publicUrl", None)
            if isinstance(candidate, str):
                public_url = candidate

        if not public_url or not isinstance(public_url, str):
            raise StorageServiceError("Unable to retrieve public URL for uploaded image")
        return public_url


__all__ = ["StorageService", "StorageServiceError"]
