import socketio

# Create a Socket.IO ASGI application
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=[])

# Wrap it with an ASGI application
socket_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"Socket.IO client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Socket.IO client disconnected: {sid}")

async def broadcast_incident_update(incident_data: dict):
    """
    Helper function to broadcast incident updates to all connected clients.
    The frontend listens for the 'incident:update' event.
    """
    await sio.emit('incident:update', incident_data)
