#!/usr/bin/env python3

import requests
import json

# Test the mobile profile endpoint
base_url = "https://traintrack-23.preview.emergentagent.com"
api_url = f"{base_url}/api"

# First login to get auth token
login_data = {
    "username": "fabio.guerreiro",
    "password": "admin123"
}

print("🔍 Testing mobile profile endpoint fix...")

try:
    # Login
    response = requests.post(f"{api_url}/auth/login", json=login_data, timeout=30)
    if response.status_code == 200:
        auth_token = response.json()['access_token']
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}'
        }
        
        # Create a test member
        member_data = {
            "name": "Test Mobile User",
            "email": "test.mobile@email.com",
            "phone": "+351912345999",
            "date_of_birth": "1990-01-01",
            "nationality": "Portuguesa",
            "profession": "Testador",
            "address": "Rua de Teste, 123",
            "membership_type": "basic"
        }
        
        member_response = requests.post(f"{api_url}/members", json=member_data, headers=headers, timeout=30)
        if member_response.status_code == 200:
            member_id = member_response.json()['id']
            print(f"✅ Created test member: {member_id}")
            
            # Test mobile profile endpoint
            profile_response = requests.get(f"{api_url}/mobile/profile?member_id={member_id}", headers={'Content-Type': 'application/json'}, timeout=30)
            print(f"📱 Mobile profile status: {profile_response.status_code}")
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                print(f"✅ Mobile profile working!")
                print(f"   Workout count: {profile_data.get('workout_count', 'N/A')}")
                print(f"   Motivational note: {profile_data.get('current_motivational_note', 'N/A')}")
                
                # Cleanup
                requests.delete(f"{api_url}/members/{member_id}", headers=headers, timeout=30)
                print("🧹 Cleaned up test member")
            else:
                print(f"❌ Mobile profile failed: {profile_response.text}")
        else:
            print(f"❌ Failed to create test member: {member_response.status_code}")
    else:
        print(f"❌ Login failed: {response.status_code}")

except Exception as e:
    print(f"❌ Error: {e}")