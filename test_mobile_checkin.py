#!/usr/bin/env python3

import os
import requests
import json

# Test mobile check-in
base_url = os.environ.get("KO_API_URL", "http://localhost:8001")
api_url = f"{base_url}/api"

print("📱 Testing Mobile Check-in...")

# Login
login_data = {
    "username": "fabio.guerreiro",
    "password": "admin123"
}

try:
    response = requests.post(f"{api_url}/auth/login", json=login_data, timeout=30)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        exit(1)
    
    auth_token = response.json()['access_token']
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {auth_token}'
    }
    
    # Create test member
    member_data = {
        "name": "Mobile Test User",
        "email": "mobile.test@email.com",
        "phone": "+351912345888",
        "date_of_birth": "1990-01-01",
        "nationality": "Portuguesa",
        "profession": "Testador",
        "address": "Rua de Teste, 123",
        "membership_type": "basic"
    }
    
    member_response = requests.post(f"{api_url}/members", json=member_data, headers=headers, timeout=30)
    if member_response.status_code != 200:
        print(f"❌ Failed to create member: {member_response.status_code}")
        exit(1)
    
    member_id = member_response.json()['id']
    print(f"✅ Created test member: {member_id}")
    
    # Get activities
    activities_response = requests.get(f"{api_url}/activities", headers=headers, timeout=30)
    if activities_response.status_code != 200:
        print(f"❌ Failed to get activities: {activities_response.status_code}")
        exit(1)
    
    activities = activities_response.json()
    activity_id = activities[0]['id']
    print(f"✅ Using activity: {activities[0]['name']}")
    
    # Get profile before check-in
    before_response = requests.get(f"{api_url}/mobile/profile?member_id={member_id}", timeout=30)
    if before_response.status_code != 200:
        print(f"❌ Failed to get profile before: {before_response.status_code}")
        exit(1)
    
    before_count = before_response.json().get('workout_count', 0)
    before_note = before_response.json().get('current_motivational_note', '')
    print(f"📊 Before check-in: {before_count} workouts")
    print(f"💬 Before note: {before_note}")
    
    # Perform mobile check-in
    checkin_response = requests.post(f"{api_url}/mobile/checkin?member_id={member_id}&activity_id={activity_id}", timeout=30)
    print(f"📱 Check-in status: {checkin_response.status_code}")
    
    if checkin_response.status_code == 200:
        checkin_data = checkin_response.json()
        new_count = checkin_data.get('workout_count', 0)
        new_note = checkin_data.get('motivational_note', '')
        
        print(f"✅ Mobile check-in successful!")
        print(f"📊 After check-in: {new_count} workouts")
        print(f"💬 New note: {new_note}")
        
        if new_count == before_count + 1:
            print(f"✅ Workout count updated correctly")
        else:
            print(f"❌ Workout count not updated (expected {before_count + 1}, got {new_count})")
        
        if new_note and len(new_note) > 10:
            print(f"✅ New motivational note provided")
        else:
            print(f"❌ No new motivational note")
    else:
        print(f"❌ Mobile check-in failed: {checkin_response.text}")
    
    # Cleanup
    requests.delete(f"{api_url}/members/{member_id}", headers=headers, timeout=30)
    print(f"🧹 Cleaned up test member")

except Exception as e:
    print(f"❌ Error: {e}")