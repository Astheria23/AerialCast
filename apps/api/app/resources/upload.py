from flask import request, jsonify
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required
from ..services.storage_service import StorageService

blp = Blueprint("Uploads", "uploads", description="File Uploads", url_prefix="/api/upload")

@blp.route("/image")
class ImageUpload(MethodView):

    @jwt_required()
    def post(self):
        if 'file' not in request.files:
            abort(400, message="No file part in the request")
        file = request.files['file']

        if file.filename == '':
            abort(400, message="No selected file")

        if file: 
            try:
                url = StorageService.upload_file(file, folder="images")
                return jsonify({"url": url}), 201
            except Exception as e:
                abort(500, message=f"Upload failed: {str(e)}")