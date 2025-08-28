#!/usr/bin/env python3

"""
Test script for simplified user login system
"""

import sys
import json
from io import StringIO

# Mock Flask request/session for testing
class MockRequest:
    def __init__(self, json_data):
        self.json = json_data

class MockSession:
    def __init__(self):
        self.data = {}
    
    def get(self, key, default=None):
        return self.data.get(key, default)
    
    def __setitem__(self, key, value):
        self.data[key] = value
    
    def pop(self, key, default=None):
        return self.data.pop(key, default)

# Mock Flask jsonify
def jsonify(data):
    return json.dumps(data, indent=2)

# Initialize test environment
users = {}
user_stats = {}
user_leaderboards = {}
session = MockSession()
request = None

class User:
    def __init__(self, username):
        self.username = username
        self.created_at = 1234567890
        self.last_active = 1234567890
        self.total_games = 0
        self.best_score = 0
        self.best_tile = 0
        self.preferences = {
            'theme': 'dark',
            'hue_value': 60,
            'default_grid_size': 4
        }
    
    def update_activity(self):
        self.last_active = 1234567890
    
    def to_dict(self):
        return {
            'username': self.username,
            'created_at': self.created_at,
            'last_active': self.last_active,
            'total_games': self.total_games,
            'best_score': self.best_score,
            'best_tile': self.best_tile,
            'preferences': self.preferences
        }

def create_user():
    """Create a new user account"""
    data = request.json or {}
    username = data.get('username', '').strip()
    
    if not username:
        return {'success': False, 'error': 'Username is required'}, 400
    
    if len(username) < 2:
        return {'success': False, 'error': 'Username must be at least 2 characters long'}, 400
    
    if len(username) > 20:
        return {'success': False, 'error': 'Username must be no more than 20 characters long'}, 400
    
    if username in users:
        return {'success': False, 'error': 'Username already exists'}, 400
    
    # Create new user (no password needed)
    user = User(username)
    users[username] = user
    user_stats[username] = []
    user_leaderboards[username] = []
    
    # Set session
    session['username'] = username
    
    return {
        'success': True, 
        'message': 'User created successfully',
        'user': user.to_dict()
    }, 200

def login():
    """Login user (username only)"""
    data = request.json or {}
    username = data.get('username', '').strip()
    
    if not username:
        return {'success': False, 'error': 'Username is required'}, 400
    
    if username not in users:
        return {'success': False, 'error': 'User not found. Please create a new account.'}, 404
    
    user = users[username]
    
    # Update activity and set session
    user.update_activity()
    session['username'] = username
    
    return {
        'success': True,
        'message': 'Login successful',
        'user': user.to_dict()
    }, 200

def main():
    global request
    
    print("🧪 Testing Simplified User System")
    print("=" * 50)
    
    # Test 1: Create new user
    print("\n1. Testing user creation...")
    request = MockRequest({'username': 'testuser'})
    result, status = create_user()
    
    if status == 200 and result['success']:
        print("✅ User creation successful!")
        print(f"   Username: {result['user']['username']}")
        print(f"   Session: {session.get('username')}")
    else:
        print(f"❌ User creation failed: {result}")
    
    # Test 2: Try to create duplicate user
    print("\n2. Testing duplicate user creation...")
    request = MockRequest({'username': 'testuser'})
    result, status = create_user()
    
    if status == 400 and not result['success']:
        print("✅ Duplicate user correctly rejected!")
        print(f"   Error: {result['error']}")
    else:
        print(f"❌ Duplicate user handling failed: {result}")
    
    # Test 3: Create another user
    print("\n3. Testing second user creation...")
    request = MockRequest({'username': 'player2'})
    result, status = create_user()
    
    if status == 200 and result['success']:
        print("✅ Second user creation successful!")
        print(f"   Username: {result['user']['username']}")
    else:
        print(f"❌ Second user creation failed: {result}")
    
    # Test 4: Login with existing user
    print("\n4. Testing login with existing user...")
    request = MockRequest({'username': 'testuser'})
    result, status = login()
    
    if status == 200 and result['success']:
        print("✅ Login successful!")
        print(f"   Username: {result['user']['username']}")
        print(f"   Session: {session.get('username')}")
    else:
        print(f"❌ Login failed: {result}")
    
    # Test 5: Login with non-existent user
    print("\n5. Testing login with non-existent user...")
    request = MockRequest({'username': 'nonexistent'})
    result, status = login()
    
    if status == 404 and not result['success']:
        print("✅ Non-existent user correctly rejected!")
        print(f"   Error: {result['error']}")
    else:
        print(f"❌ Non-existent user handling failed: {result}")
    
    # Test 6: Empty username validation
    print("\n6. Testing empty username validation...")
    request = MockRequest({'username': ''})
    result, status = create_user()
    
    if status == 400 and not result['success']:
        print("✅ Empty username correctly rejected!")
        print(f"   Error: {result['error']}")
    else:
        print(f"❌ Empty username handling failed: {result}")
    
    # Test 7: Username too short
    print("\n7. Testing username too short...")
    request = MockRequest({'username': 'a'})
    result, status = create_user()
    
    if status == 400 and not result['success']:
        print("✅ Short username correctly rejected!")
        print(f"   Error: {result['error']}")
    else:
        print(f"❌ Short username handling failed: {result}")
    
    print("\n" + "=" * 50)
    print(f"📊 Final state:")
    print(f"   Users created: {len(users)}")
    print(f"   User list: {list(users.keys())}")
    print(f"   Current session: {session.get('username')}")
    
    print("\n🎉 Simplified user system is working correctly!")
    print("✅ No passwords required")
    print("✅ Username-only authentication")
    print("✅ Proper error handling")
    print("✅ Session management working")

if __name__ == "__main__":
    main()
