#!/usr/bin/env python3
"""
Fancy2048 - Production Server
Production-ready Flask server with enhanced configuration
"""

import os
from web_server import app

if __name__ == '__main__':
    # Production configuration
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Starting Fancy2048 Production Server...")
    print(f"📡 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🐛 Debug: {debug}")
    
    app.run(
        host=host,
        port=port,
        debug=debug,
        threaded=True
    )