import socketio

# Create a Socket.IO ASGI application
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Wrap it with an ASGI application
socket_app = socketio.ASGIApp(sio)

import jwt
from app.config import settings

@sio.event
async def connect(sid, environ, auth=None):
    if not auth or 'token' not in auth:
        # Fallback to query params if auth payload is missing (for older clients)
        query = environ.get('QUERY_STRING', '')
        token = None
        for param in query.split('&'):
            if param.startswith('token='):
                token = param.split('=')[1]
                break
        if not token:
            print(f"Socket.IO connection rejected: missing token ({sid})")
            raise socketio.exceptions.ConnectionRefusedError('Authentication failed')
    else:
        token = auth['token']

    try:
        # Remove Bearer prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_aud": False})
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token subject")
            
        async with sio.session(sid) as session:
            session['user_id'] = user_id
            
        print(f"Socket.IO client connected: {sid} (User: {user_id})")
    except Exception as e:
        print(f"Socket.IO connection rejected: {e} ({sid})")
        raise socketio.exceptions.ConnectionRefusedError('Authentication failed')

@sio.event
async def disconnect(sid):
    print(f"Socket.IO client disconnected: {sid}")

import datetime

async def broadcast_incident_update(incident_data: dict):
    """
    Helper function to broadcast incident updates to all connected clients.
    The frontend and mobile apps listen for 'incident:update' and 'sos:update'.
    """
    if "timestamp" not in incident_data:
        incident_data["timestamp"] = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    await sio.emit('incident:update', incident_data)
    await sio.emit('sos:update', incident_data)

async def broadcast_notification(notification_data: dict):
    """
    Broadcast high-priority system alerts and notifications across dashboards.
    """
    if "timestamp" not in notification_data:
        notification_data["timestamp"] = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    await sio.emit('notification:alert', notification_data)

async def broadcast_media_sync(media_data: dict):
    """
    Broadcast newly captured emergency media evidence to responders and hospitals.
    """
    await sio.emit('media:update', media_data)

async def broadcast_location_update(location_data: dict):
    """
    Broadcast real-time victim location fixes to assigned units and dashboards.
    """
    await sio.emit('location:update', location_data)

