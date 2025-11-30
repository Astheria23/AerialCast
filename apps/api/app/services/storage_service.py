from supabase import create_client, Client
from werkzeug.utils import secure_filename
import uuid
from typing import Optional
from ..config import Config 

class StorageService:
    _client: Optional[Client] = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            # Validate Supabase configuration before creating the client
            supabase_url = Config.SUPABASE_URL
            supabase_key = Config.SUPABASE_KEY

            if not supabase_url or not supabase_key:
                raise RuntimeError("Missing Supabase configuration: SUPABASE_URL and/or SUPABASE_KEY are not set.")

            cls._client = create_client(supabase_url, supabase_key)
        return cls._client
    

    @staticmethod
    def upload_file(file, folder="drone-images"):

        supabase = StorageService.get_client()
        bucket = Config.SUPABASE_STORAGE_BUCKET

        filename = secure_filename(file.filename)
        unique_filename = f"{folder}/{uuid.uuid4().hex}_{filename}"

        file_bytes = file.read()

        try:
            # Upload the file bytes to Supabase Storage

            supabase.storage.from_(bucket).upload(
                path=unique_filename,
                file=file_bytes,
            )

            public_url = supabase.storage.from_(bucket).get_public_url(unique_filename)

            # Normalize the return shape to a string URL
            if isinstance(public_url, str):
                return public_url
            if isinstance(public_url, dict):
                return (
                    public_url.get("public_url")
                    or public_url.get("publicURL")
                    or public_url.get("publicUrl")
                )
            # Fallback: return the path if SDK returns unexpected type
            return unique_filename

        except Exception as e:
            print(f"Error uploading file to Supabase Storage: {str(e)}")
            raise e
        

    
