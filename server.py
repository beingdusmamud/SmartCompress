from flask import Flask, request, jsonify, send_from_directory
import os
import base64
from PIL import Image
from io import BytesIO
from datetime import datetime

app = Flask(__name__, static_url_path='', static_folder='static')

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    try:
        data = request.json
        image_data = data['image']
        
        # Remove the data URL prefix
        if 'data:image/' in image_data:
            image_data = image_data.split('base64,')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes))
        
        # Generate unique filename
        filename = f"compressed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save the image
        image.save(filepath, 'JPEG', quality=85)
        
        return jsonify({
            'success': True,
            'message': 'Image uploaded successfully',
            'filename': filename
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
