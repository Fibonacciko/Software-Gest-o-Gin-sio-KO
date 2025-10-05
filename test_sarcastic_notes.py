#!/usr/bin/env python3

import requests
import json

# Test the sarcastic motivational notes system
base_url = "https://traintrack-23.preview.emergentagent.com"
api_url = f"{base_url}/api"

print("🔥 TESTING SARCASTIC MOTIVATIONAL NOTES SYSTEM")
print("=" * 50)

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
    
    # Test 1: Get motivational notes and verify sarcastic content
    print("\n1. Testing Sarcastic Motivational Notes Content")
    print("-" * 40)
    
    notes_response = requests.get(f"{api_url}/motivational-notes", headers=headers, timeout=30)
    if notes_response.status_code == 200:
        notes = notes_response.json()
        print(f"✅ Found {len(notes)} motivational notes")
        
        sarcastic_indicators = ["🥊", "😈", "🥵", "🤷‍♂️", "calma", "medo", "suor", "saco", "luvas", "espelho", "renda"]
        has_sarcastic_content = False
        
        for note in notes:
            print(f"\n📝 Level: {note['level_name']} (Workouts: {note['workout_count_min']}-{note['workout_count_max']})")
            print(f"   PT: {note['note_pt']}")
            print(f"   EN: {note['note_en']}")
            
            note_text = f"{note['note_pt']} {note['note_en']}".lower()
            if any(indicator in note_text for indicator in sarcastic_indicators):
                has_sarcastic_content = True
                print(f"   ✅ Contains sarcastic content!")
        
        if has_sarcastic_content:
            print(f"\n✅ SARCASTIC CONTENT VERIFIED - Old boring notes replaced!")
        else:
            print(f"\n❌ No sarcastic content found")
    else:
        print(f"❌ Failed to get motivational notes: {notes_response.status_code}")
    
    # Test 2: Test different workout count scenarios
    print("\n\n2. Testing Different Workout Count Scenarios")
    print("-" * 40)
    
    test_scenarios = [
        {"name": "Iniciante Carlos", "workouts": 3, "expected_level": "iniciantes"},
        {"name": "Intermedio Maria", "workouts": 15, "expected_level": "intermedios"},
        {"name": "Avançado Pedro", "workouts": 35, "expected_level": "avançados"},
        {"name": "Hardcore Ana", "workouts": 75, "expected_level": "hardcore"}
    ]
    
    test_members = []
    
    # Get available activities
    activities_response = requests.get(f"{api_url}/activities", headers=headers, timeout=30)
    if activities_response.status_code != 200:
        print("❌ Failed to get activities")
        exit(1)
    
    activities = activities_response.json()
    activity_id = activities[0]['id']
    
    for scenario in test_scenarios:
        print(f"\n🧪 Testing scenario: {scenario['name']} ({scenario['workouts']} workouts)")
        
        # Create member
        member_data = {
            "name": scenario["name"],
            "email": f"{scenario['name'].lower().replace(' ', '.')}@test.com",
            "phone": f"+35191234{len(test_members):04d}",
            "date_of_birth": "1990-01-01",
            "nationality": "Portuguesa",
            "profession": "Testador",
            "address": "Rua de Teste, 123",
            "membership_type": "basic"
        }
        
        member_response = requests.post(f"{api_url}/members", json=member_data, headers=headers, timeout=30)
        if member_response.status_code == 200:
            member_id = member_response.json()['id']
            test_members.append({"id": member_id, "name": scenario["name"]})
            
            # Create attendance records
            for i in range(scenario["workouts"]):
                attendance_data = {
                    "member_id": member_id,
                    "activity_id": activity_id,
                    "method": "manual"
                }
                requests.post(f"{api_url}/attendance", json=attendance_data, headers=headers, timeout=30)
            
            # Test mobile profile
            profile_response = requests.get(f"{api_url}/mobile/profile?member_id={member_id}", timeout=30)
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                workout_count = profile_data.get('workout_count', 0)
                motivational_note = profile_data.get('current_motivational_note', '')
                
                print(f"   Workout count: {workout_count}")
                print(f"   Motivational note: {motivational_note}")
                
                # Verify workout count accuracy
                if abs(workout_count - scenario['workouts']) <= 2:
                    print(f"   ✅ Workout count accurate")
                else:
                    print(f"   ❌ Workout count inaccurate (expected ~{scenario['workouts']}, got {workout_count})")
                
                # Verify motivational note is present and sarcastic
                if motivational_note and len(motivational_note) > 10:
                    print(f"   ✅ Motivational note present")
                    
                    # Check for sarcasm indicators
                    if any(indicator in motivational_note.lower() for indicator in sarcastic_indicators):
                        print(f"   ✅ Note contains sarcastic content")
                    else:
                        print(f"   ⚠️  Note may not be sarcastic enough")
                else:
                    print(f"   ❌ No motivational note found")
            else:
                print(f"   ❌ Failed to get mobile profile: {profile_response.status_code}")
        else:
            print(f"   ❌ Failed to create member: {member_response.status_code}")
    
    # Test 3: Test random selection
    print("\n\n3. Testing Random Selection")
    print("-" * 40)
    
    if test_members:
        member = test_members[0]
        notes_received = set()
        
        print(f"🎲 Testing random selection with {member['name']}...")
        
        for i in range(5):
            profile_response = requests.get(f"{api_url}/mobile/profile?member_id={member['id']}", timeout=30)
            if profile_response.status_code == 200:
                note = profile_response.json().get('current_motivational_note', '')
                if note:
                    notes_received.add(note)
                    print(f"   Call {i+1}: {note[:50]}...")
        
        if len(notes_received) > 1:
            print(f"✅ Random selection working - received {len(notes_received)} different notes")
        else:
            print(f"⚠️  Random selection may not be working - only {len(notes_received)} unique note(s)")
    
    # Test 4: Test mobile check-in impact
    print("\n\n4. Testing Mobile Check-in Impact")
    print("-" * 40)
    
    if test_members:
        member = test_members[0]
        
        # Get current profile
        before_response = requests.get(f"{api_url}/mobile/profile?member_id={member['id']}", timeout=30)
        if before_response.status_code == 200:
            before_count = before_response.json().get('workout_count', 0)
            
            # Perform mobile check-in
            checkin_response = requests.post(f"{api_url}/mobile/checkin?member_id={member['id']}&activity_id={activity_id}", timeout=30)
            if checkin_response.status_code == 200:
                checkin_data = checkin_response.json()
                new_count = checkin_data.get('workout_count', 0)
                new_note = checkin_data.get('motivational_note', '')
                
                print(f"📱 Mobile check-in test:")
                print(f"   Before: {before_count} workouts")
                print(f"   After: {new_count} workouts")
                print(f"   New note: {new_note}")
                
                if new_count == before_count + 1:
                    print(f"   ✅ Check-in updates workout count correctly")
                else:
                    print(f"   ❌ Check-in didn't update workout count (expected {before_count + 1}, got {new_count})")
                
                if new_note and len(new_note) > 10:
                    print(f"   ✅ Check-in provides new motivational note")
                else:
                    print(f"   ❌ Check-in didn't provide motivational note")
            else:
                print(f"   ❌ Mobile check-in failed: {checkin_response.status_code}")
        else:
            print(f"   ❌ Failed to get profile before check-in")
    
    # Cleanup
    print("\n\n🧹 Cleaning up test members...")
    for member in test_members:
        requests.delete(f"{api_url}/members/{member['id']}", headers=headers, timeout=30)
        print(f"   Deleted {member['name']}")
    
    print("\n🎉 SARCASTIC MOTIVATIONAL NOTES SYSTEM TEST COMPLETE!")

except Exception as e:
    print(f"❌ Error: {e}")