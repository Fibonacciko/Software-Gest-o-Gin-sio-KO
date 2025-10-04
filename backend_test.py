#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, Any

class GymManagementAPITester:
    def __init__(self, base_url="https://gymflow-58.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_member_id = None
        self.created_payment_id = None
        self.created_item_id = None
        self.created_attendance_id = None
        self.created_activity_id = None
        self.auth_token = None
        self.auth_headers = {'Content-Type': 'application/json'}

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, data: Dict = None, headers: Dict = None) -> tuple:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = self.auth_headers.copy()

        try:
            print(f"\n🔍 Testing {name}...")
            print(f"   URL: {url}")
            
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
                if success:
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)[:200]}...")
            except:
                response_data = response.text
                if success:
                    print(f"   Response: {response_data[:200]}...")

            self.log_test(name, success, f"Expected {expected_status}, got {response.status_code}", response_data)
            return success, response_data

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_test(name, False, error_msg)
            return False, {}

    def test_api_health(self):
        """Test API health endpoint"""
        return self.run_test("API Health Check", "GET", "", 200)

    def test_login(self):
        """Test login and get authentication token"""
        login_data = {
            "username": "fabio.guerreiro",
            "password": "admin123"
        }
        
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, login_data, {'Content-Type': 'application/json'})
        if success and response and 'access_token' in response:
            self.auth_token = response['access_token']
            self.auth_headers['Authorization'] = f'Bearer {self.auth_token}'
            print(f"   Authentication successful - Token acquired")
            print(f"   User: {response.get('user', {}).get('full_name', 'Unknown')}")
            print(f"   Role: {response.get('user', {}).get('role', 'Unknown')}")
        
        return success, response

    def test_create_member(self):
        """Test creating a new member"""
        member_data = {
            "name": "João Silva",
            "email": "joao.silva@email.com",
            "phone": "+351912345678",
            "date_of_birth": "1990-05-15",
            "nationality": "Portuguesa",
            "profession": "Engenheiro",
            "address": "Rua das Flores, 123, Lisboa",
            "membership_type": "premium",
            "notes": "Membro teste criado automaticamente"
        }
        
        success, response = self.run_test("Create Member", "POST", "members", 200, member_data)
        if success and response and 'id' in response:
            self.created_member_id = response['id']
            print(f"   Created member ID: {self.created_member_id}")
            
            # Verify QR code was generated
            if 'qr_code' in response and response['qr_code']:
                self.log_test("QR Code Generation", True, "QR code generated successfully")
                print(f"   QR Code: Generated (length: {len(response['qr_code'])})")
            else:
                self.log_test("QR Code Generation", False, "QR code not generated")
        
        return success, response

    def test_get_members(self):
        """Test getting all members"""
        return self.run_test("Get All Members", "GET", "members", 200)

    def test_get_member_by_id(self):
        """Test getting a specific member"""
        if not self.created_member_id:
            self.log_test("Get Member by ID", False, "No member ID available")
            return False, {}
        
        return self.run_test("Get Member by ID", "GET", f"members/{self.created_member_id}", 200)

    def test_search_members(self):
        """Test member search functionality"""
        return self.run_test("Search Members", "GET", "members?search=João", 200)

    def test_filter_members(self):
        """Test member filtering"""
        success1, _ = self.run_test("Filter Members by Status", "GET", "members?status=active", 200)
        success2, _ = self.run_test("Filter Members by Type", "GET", "members?membership_type=premium", 200)
        return success1 and success2, {}

    def test_get_activities(self):
        """Test getting all activities/modalidades"""
        success, response = self.run_test("Get All Activities", "GET", "activities", 200)
        if success and response:
            print(f"   Found {len(response)} activities")
            for activity in response:
                print(f"   - {activity['name']} (Color: {activity['color']})")
        return success, response

    def test_create_activity(self):
        """Test creating a new activity/modalidade"""
        activity_data = {
            "name": "Teste Modalidade",
            "color": "#ff6b6b",
            "description": "Modalidade criada para teste"
        }
        
        success, response = self.run_test("Create Activity", "POST", "activities", 200, activity_data)
        if success and response and 'id' in response:
            self.created_activity_id = response['id']
            print(f"   Created activity ID: {self.created_activity_id}")
        
        return success, response

    def test_create_attendance(self):
        """Test manual check-in with mandatory activity"""
        if not self.created_member_id:
            self.log_test("Create Attendance", False, "No member ID available")
            return False, {}
        
        # First get available activities
        success, activities = self.run_test("Get Activities for Check-in", "GET", "activities", 200)
        if not success or not activities:
            self.log_test("Create Attendance", False, "No activities available for check-in")
            return False, {}
        
        # Use the first available activity
        activity_id = activities[0]['id']
        
        attendance_data = {
            "member_id": self.created_member_id,
            "activity_id": activity_id,  # Required modalidade
            "method": "manual"
        }
        
        success, response = self.run_test("Manual Check-in with Activity", "POST", "attendance", 200, attendance_data)
        if success and response and 'id' in response:
            self.created_attendance_id = response['id']
            print(f"   Created attendance ID: {self.created_attendance_id}")
            print(f"   Activity used: {activities[0]['name']}")
        
        return success, response

    def test_attendance_without_activity(self):
        """Test check-in without activity (should fail)"""
        if not self.created_member_id:
            self.log_test("Check-in without Activity", False, "No member ID available")
            return False, {}
        
        attendance_data = {
            "member_id": self.created_member_id,
            "method": "manual"
            # Missing activity_id - should fail
        }
        
        # This should fail with 422 or 400
        success, response = self.run_test("Check-in without Activity (Should Fail)", "POST", "attendance", 422, attendance_data)
        return success, response

    def test_get_attendance(self):
        """Test getting attendance records"""
        success1, _ = self.run_test("Get All Attendance", "GET", "attendance", 200)
        
        if self.created_member_id:
            success2, _ = self.run_test("Get Member Attendance", "GET", f"members/{self.created_member_id}/attendance", 200)
            return success1 and success2, {}
        
        return success1, {}

    def test_create_payment(self):
        """Test adding payment for member"""
        if not self.created_member_id:
            self.log_test("Create Payment", False, "No member ID available")
            return False, {}
        
        payment_data = {
            "member_id": self.created_member_id,
            "amount": 50.00,
            "payment_method": "cash",
            "description": "Mensalidade Premium - Teste"
        }
        
        success, response = self.run_test("Add Payment", "POST", "payments", 200, payment_data)
        if success and response and 'id' in response:
            self.created_payment_id = response['id']
            print(f"   Created payment ID: {self.created_payment_id}")
        
        return success, response

    def test_get_payments(self):
        """Test getting payments"""
        success1, _ = self.run_test("Get All Payments", "GET", "payments", 200)
        
        if self.created_member_id:
            success2, _ = self.run_test("Get Member Payments", "GET", f"payments?member_id={self.created_member_id}", 200)
            return success1 and success2, {}
        
        return success1, {}

    def test_create_inventory_item(self):
        """Test adding inventory item"""
        item_data = {
            "name": "T-shirt Academia",
            "category": "clothing",
            "size": "M",
            "color": "Azul",
            "quantity": 25,
            "price": 15.99,
            "description": "T-shirt oficial da academia - Teste"
        }
        
        success, response = self.run_test("Add Inventory Item", "POST", "inventory", 200, item_data)
        if success and response and 'id' in response:
            self.created_item_id = response['id']
            print(f"   Created item ID: {self.created_item_id}")
        
        return success, response

    def test_get_inventory(self):
        """Test getting inventory"""
        success1, _ = self.run_test("Get All Inventory", "GET", "inventory", 200)
        success2, _ = self.run_test("Filter Inventory by Category", "GET", "inventory?category=clothing", 200)
        return success1 and success2, {}

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        return self.run_test("Dashboard Statistics", "GET", "dashboard", 200)

    def test_attendance_report(self):
        """Test attendance reports"""
        return self.run_test("Attendance Report", "GET", "reports/attendance", 200)

    def test_activity_report(self):
        """Test activity/modalidade reports"""
        return self.run_test("Activity Report", "GET", "reports/activities", 200)

    def test_top_members_report(self):
        """Test top members report"""
        return self.run_test("Top Members Report", "GET", "reports/top-members", 200)

    def test_detailed_attendance(self):
        """Test detailed attendance with member and activity info"""
        return self.run_test("Detailed Attendance", "GET", "attendance/detailed", 200)

    def test_mobile_activities(self):
        """Test mobile activities endpoint for check-in selection"""
        success, response = self.run_test("Mobile Activities Endpoint", "GET", "mobile/activities", 200, headers={'Content-Type': 'application/json'})
        if success and response:
            print(f"   Found {len(response)} mobile activities")
            for activity in response:
                print(f"   - {activity['name']} (Active: {activity.get('is_active', 'Unknown')})")
        return success, response

    def test_motivational_notes(self):
        """Test motivational notes management endpoint"""
        success, response = self.run_test("Motivational Notes Management", "GET", "motivational-notes", 200)
        if success and response:
            print(f"   Found {len(response)} motivational notes")
            for note in response:
                print(f"   - Level: {note['level_name']} (Workouts: {note['workout_count_min']}-{note['workout_count_max']})")
        return success, response

    def test_sarcastic_motivational_notes_system(self):
        """Comprehensive test of the new sarcastic motivational notes system"""
        print("\n🔥 TESTING SARCASTIC MOTIVATIONAL NOTES SYSTEM")
        print("-" * 50)
        
        all_tests_passed = True
        
        # Test 1: Get motivational notes and verify sarcastic content
        success, response = self.run_test("Get Sarcastic Motivational Notes", "GET", "motivational-notes", 200)
        if success and response:
            print(f"   Found {len(response)} motivational notes")
            
            # Check for sarcastic content indicators
            sarcastic_indicators = ["🥊", "😈", "🥵", "🤷‍♂️", "calma", "medo", "suor", "saco"]
            has_sarcastic_content = False
            
            for note in response:
                print(f"   - Level: {note['level_name']} (Workouts: {note['workout_count_min']}-{note['workout_count_max']})")
                print(f"     PT: {note['note_pt']}")
                print(f"     EN: {note['note_en']}")
                
                # Check if this note contains sarcastic indicators
                note_text = f"{note['note_pt']} {note['note_en']}".lower()
                if any(indicator in note_text for indicator in sarcastic_indicators):
                    has_sarcastic_content = True
                    print(f"     ✅ Contains sarcastic content!")
            
            if has_sarcastic_content:
                self.log_test("Sarcastic Content Verification", True, "Found sarcastic motivational notes")
            else:
                self.log_test("Sarcastic Content Verification", False, "No sarcastic content found in notes")
                all_tests_passed = False
        else:
            all_tests_passed = False
        
        # Test 2: Create test members with different workout counts
        test_members = []
        workout_scenarios = [
            {"name": "Iniciante Carlos", "workouts": 3, "expected_level": "iniciantes"},
            {"name": "Intermedio Maria", "workouts": 15, "expected_level": "intermedios"},
            {"name": "Avançado Pedro", "workouts": 35, "expected_level": "avançados"},
            {"name": "Hardcore Ana", "workouts": 75, "expected_level": "hardcore"}
        ]
        
        for scenario in workout_scenarios:
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
            
            success, member_response = self.run_test(f"Create Test Member ({scenario['name']})", "POST", "members", 200, member_data)
            if success and member_response:
                member_id = member_response['id']
                test_members.append({
                    "id": member_id,
                    "name": scenario["name"],
                    "target_workouts": scenario["workouts"],
                    "expected_level": scenario["expected_level"]
                })
                
                # Create attendance records to simulate workout history
                activities_success, activities = self.run_test("Get Activities for Workout Simulation", "GET", "activities", 200)
                if activities_success and activities:
                    activity_id = activities[0]['id']  # Use first available activity
                    
                    # Create multiple attendance records
                    for i in range(scenario["workouts"]):
                        attendance_data = {
                            "member_id": member_id,
                            "activity_id": activity_id,
                            "method": "manual"
                        }
                        self.run_test(f"Create Workout {i+1} for {scenario['name']}", "POST", "attendance", 200, attendance_data)
        
        # Test 3: Test mobile profile endpoint with different workout counts
        for member in test_members:
            success, profile_response = self.run_test(
                f"Mobile Profile - {member['name']} ({member['target_workouts']} workouts)", 
                "GET", 
                f"mobile/profile?member_id={member['id']}", 
                200,
                headers={'Content-Type': 'application/json'}
            )
            
            if success and profile_response:
                workout_count = profile_response.get('workout_count', 0)
                motivational_note = profile_response.get('current_motivational_note', '')
                
                print(f"   Workout count: {workout_count}")
                print(f"   Motivational note: {motivational_note}")
                
                # Verify workout count is approximately correct (allowing for some variance)
                if abs(workout_count - member['target_workouts']) <= 2:
                    self.log_test(f"Workout Count Accuracy - {member['name']}", True, f"Expected ~{member['target_workouts']}, got {workout_count}")
                else:
                    self.log_test(f"Workout Count Accuracy - {member['name']}", False, f"Expected ~{member['target_workouts']}, got {workout_count}")
                    all_tests_passed = False
                
                # Verify motivational note is present and sarcastic
                if motivational_note and len(motivational_note) > 10:
                    self.log_test(f"Motivational Note Present - {member['name']}", True, f"Note: {motivational_note[:50]}...")
                else:
                    self.log_test(f"Motivational Note Present - {member['name']}", False, "No motivational note found")
                    all_tests_passed = False
            else:
                all_tests_passed = False
        
        # Test 4: Test random selection by calling multiple times
        if test_members:
            member = test_members[0]  # Use first test member
            notes_received = set()
            
            for i in range(5):  # Call 5 times to test randomness
                success, profile_response = self.run_test(
                    f"Random Selection Test {i+1}", 
                    "GET", 
                    f"mobile/profile?member_id={member['id']}", 
                    200,
                    headers={'Content-Type': 'application/json'}
                )
                
                if success and profile_response:
                    note = profile_response.get('current_motivational_note', '')
                    if note:
                        notes_received.add(note)
            
            if len(notes_received) > 1:
                self.log_test("Random Selection Working", True, f"Received {len(notes_received)} different notes")
            else:
                self.log_test("Random Selection Working", False, f"Only received {len(notes_received)} unique note(s)")
        
        # Test 5: Test mobile check-in impact on motivational notes
        if test_members:
            member = test_members[0]  # Use first test member
            
            # Get current profile
            success, before_profile = self.run_test("Profile Before Check-in", "GET", f"mobile/profile?member_id={member['id']}", 200, headers={'Content-Type': 'application/json'})
            
            if success and before_profile:
                before_count = before_profile.get('workout_count', 0)
                before_note = before_profile.get('current_motivational_note', '')
                
                # Perform mobile check-in
                activities_success, activities = self.run_test("Get Activities for Mobile Check-in", "GET", "mobile/activities", 200, headers={'Content-Type': 'application/json'})
                if activities_success and activities:
                    activity_id = activities[0]['id']
                    
                    success, checkin_response = self.run_test(
                        "Mobile Check-in Test", 
                        "POST", 
                        f"mobile/checkin?member_id={member['id']}&activity_id={activity_id}", 
                        200,
                        headers={'Content-Type': 'application/json'}
                    )
                    
                    if success and checkin_response:
                        new_count = checkin_response.get('workout_count', 0)
                        new_note = checkin_response.get('motivational_note', '')
                        
                        print(f"   Before check-in: {before_count} workouts")
                        print(f"   After check-in: {new_count} workouts")
                        print(f"   New motivational note: {new_note}")
                        
                        if new_count == before_count + 1:
                            self.log_test("Check-in Updates Workout Count", True, f"Count increased from {before_count} to {new_count}")
                        else:
                            self.log_test("Check-in Updates Workout Count", False, f"Expected {before_count + 1}, got {new_count}")
                            all_tests_passed = False
                        
                        if new_note and len(new_note) > 10:
                            self.log_test("Check-in Updates Motivational Note", True, f"New note: {new_note[:50]}...")
                        else:
                            self.log_test("Check-in Updates Motivational Note", False, "No new motivational note")
                            all_tests_passed = False
        
        # Cleanup test members
        for member in test_members:
            self.run_test(f"Cleanup Test Member - {member['name']}", "DELETE", f"members/{member['id']}", 200)
        
        return all_tests_passed, {}

    def test_message_creation(self):
        """Test creating a general message for all members"""
        message_data = {
            "title": "Teste de Mensagem Geral",
            "content": "Esta é uma mensagem de teste enviada para todos os membros do ginásio.",
            "message_type": "general",
            "language": "pt",
            "is_push_notification": True
        }
        
        success, response = self.run_test("Create General Message", "POST", "messages", 200, message_data)
        if success and response and 'id' in response:
            print(f"   Created message ID: {response['id']}")
            print(f"   Message type: {response['message_type']}")
            print(f"   Push notification: {response['is_push_notification']}")
        
        return success, response

    def test_dashboard_with_new_changes(self):
        """Test dashboard stats to ensure it still works with new backend changes"""
        success, response = self.run_test("Dashboard Stats (Post-Changes)", "GET", "dashboard", 200)
        if success and response:
            print(f"   Total members: {response.get('total_members', 'N/A')}")
            print(f"   Active members: {response.get('active_members', 'N/A')}")
            print(f"   Today's attendance: {response.get('today_attendance', 'N/A')}")
            if 'monthly_revenue' in response:
                print(f"   Monthly revenue: €{response.get('monthly_revenue', 'N/A')}")
        return success, response

    def test_premium_dashboard_analytics(self):
        """Test premium dashboard analytics with enhanced data"""
        success, response = self.run_test("Premium Dashboard Analytics", "GET", "dashboard", 200)
        if success and response:
            print(f"   Total members: {response.get('total_members', 'N/A')}")
            print(f"   Active members: {response.get('active_members', 'N/A')}")
            print(f"   Today's attendance: {response.get('today_attendance', 'N/A')}")
            
            # Check for premium analytics section
            if 'premium_analytics' in response:
                premium_data = response['premium_analytics']
                print(f"   ✅ Premium analytics section found")
                print(f"   Members data: {premium_data.get('members', {})}")
                print(f"   Attendance data: {premium_data.get('attendance', {})}")
                print(f"   Activities data: {premium_data.get('activities', {})}")
                print(f"   Growth data: {premium_data.get('growth', {})}")
                
                if 'financial' in premium_data:
                    print(f"   Financial data: {premium_data.get('financial', {})}")
                
                self.log_test("Premium Analytics Structure", True, "Premium analytics section present with expected data")
            else:
                self.log_test("Premium Analytics Structure", False, "Premium analytics section missing")
                
            if 'monthly_revenue' in response:
                print(f"   Monthly revenue: €{response.get('monthly_revenue', 'N/A')}")
        
        return success, response

    def test_system_status(self):
        """Test system status monitoring endpoint"""
        success, response = self.run_test("System Status Monitoring", "GET", "system/status", 200)
        if success and response:
            print(f"   System status response: {json.dumps(response, indent=2, default=str)[:300]}...")
            
            # Check for expected system status fields
            expected_fields = ['database', 'cache', 'services', 'timestamp']
            missing_fields = []
            
            for field in expected_fields:
                if field not in response:
                    missing_fields.append(field)
            
            if not missing_fields:
                self.log_test("System Status Structure", True, "All expected system status fields present")
            else:
                self.log_test("System Status Structure", False, f"Missing fields: {missing_fields}")
        
        return success, response

    def test_member_analytics(self):
        """Test member analytics endpoint"""
        if not self.created_member_id:
            # Try to get any existing member
            success, members = self.run_test("Get Members for Analytics", "GET", "members", 200)
            if success and members and len(members) > 0:
                member_id = members[0]['id']
            else:
                self.log_test("Member Analytics", False, "No member available for analytics testing")
                return False, {}
        else:
            member_id = self.created_member_id
        
        success, response = self.run_test("Member Analytics", "GET", f"analytics/member/{member_id}", 200)
        if success and response:
            print(f"   Member analytics response: {json.dumps(response, indent=2, default=str)[:300]}...")
            
            # Check for expected analytics fields
            expected_fields = ['member_id', 'workout_patterns', 'attendance_trends']
            present_fields = [field for field in expected_fields if field in response]
            
            if len(present_fields) > 0:
                self.log_test("Member Analytics Structure", True, f"Analytics fields present: {present_fields}")
            else:
                self.log_test("Member Analytics Structure", False, "No expected analytics fields found")
        
        return success, response

    def test_churn_analysis(self):
        """Test churn analysis endpoint"""
        success, response = self.run_test("Churn Analysis", "GET", "analytics/churn", 200)
        if success and response:
            print(f"   Churn analysis response: {json.dumps(response, indent=2, default=str)[:300]}...")
            
            # Check for expected churn analysis fields
            expected_fields = ['retention_rate', 'at_risk_members', 'churn_predictions']
            present_fields = [field for field in expected_fields if field in response]
            
            if len(present_fields) > 0:
                self.log_test("Churn Analysis Structure", True, f"Churn fields present: {present_fields}")
            else:
                self.log_test("Churn Analysis Structure", False, "No expected churn analysis fields found")
        
        return success, response

    def test_premium_login(self):
        """Test premium login with enhanced security"""
        login_data = {
            "username": "fabio.guerreiro",
            "password": "admin123"
        }
        
        success, response = self.run_test("Premium Login", "POST", "auth/login-premium", 200, login_data, {'Content-Type': 'application/json'})
        if success and response:
            print(f"   Premium login response: {json.dumps(response, indent=2, default=str)[:300]}...")
            
            # Check for enhanced security features
            if 'access_token' in response:
                self.log_test("Premium Login Token", True, "Access token generated successfully")
            else:
                self.log_test("Premium Login Token", False, "No access token in response")
            
            # Check for enhanced logging indicators
            if 'security_log_id' in response or 'login_timestamp' in response:
                self.log_test("Enhanced Security Logging", True, "Enhanced security features detected")
            else:
                self.log_test("Enhanced Security Logging", False, "No enhanced security features detected")
        
        return success, response

    def test_cache_operations(self):
        """Test cache clear operations"""
        success, response = self.run_test("Cache Clear Operations", "POST", "cache/clear", 200, {})
        if success and response:
            print(f"   Cache operations response: {json.dumps(response, indent=2, default=str)[:200]}...")
            
            # Check for cache operation confirmation
            if 'cache_cleared' in response or 'status' in response:
                self.log_test("Cache Operations", True, "Cache operations completed successfully")
            else:
                self.log_test("Cache Operations", False, "No cache operation confirmation")
        
        return success, response

    def test_update_operations(self):
        """Test update operations"""
        success_count = 0
        total_tests = 0
        
        # Update member
        if self.created_member_id:
            total_tests += 1
            update_data = {
                "name": "João Silva Updated",
                "email": "joao.silva.updated@email.com",
                "phone": "+351912345678",
                "date_of_birth": "1990-05-15",
                "nationality": "Portuguesa",
                "profession": "Engenheiro Senior",
                "address": "Rua das Flores, 123, Lisboa",
                "membership_type": "vip",
                "notes": "Membro atualizado para VIP"
            }
            success, _ = self.run_test("Update Member", "PUT", f"members/{self.created_member_id}", 200, update_data)
            if success:
                success_count += 1
        
        # Update inventory item
        if self.created_item_id:
            total_tests += 1
            update_data = {
                "name": "T-shirt Academia Premium",
                "category": "clothing",
                "size": "M",
                "color": "Azul Marinho",
                "quantity": 30,
                "price": 19.99,
                "description": "T-shirt premium da academia - Atualizada"
            }
            success, _ = self.run_test("Update Inventory Item", "PUT", f"inventory/{self.created_item_id}", 200, update_data)
            if success:
                success_count += 1
        
        return success_count == total_tests, {}

    def test_delete_operations(self):
        """Test delete operations (cleanup)"""
        success_count = 0
        total_tests = 0
        
        # Delete inventory item
        if self.created_item_id:
            total_tests += 1
            success, _ = self.run_test("Delete Inventory Item", "DELETE", f"inventory/{self.created_item_id}", 200)
            if success:
                success_count += 1
        
        # Delete member (this should also clean up related records)
        if self.created_member_id:
            total_tests += 1
            success, _ = self.run_test("Delete Member", "DELETE", f"members/{self.created_member_id}", 200)
            if success:
                success_count += 1
        
        return success_count == total_tests, {}

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Gym Management API Tests")
        print("=" * 50)
        
        # Basic API tests
        self.test_api_health()
        
        # Authentication
        login_success, _ = self.test_login()
        if not login_success:
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Activities/Modalidades tests (PRIORITY)
        self.test_get_activities()
        self.test_create_activity()
        
        # Member management tests
        self.test_create_member()
        self.test_get_members()
        self.test_get_member_by_id()
        self.test_search_members()
        self.test_filter_members()
        
        # Attendance tests with modalidades
        self.test_attendance_without_activity()  # Should fail
        self.test_create_attendance()  # With activity
        self.test_get_attendance()
        self.test_detailed_attendance()
        
        # Payment tests
        self.test_create_payment()
        self.test_get_payments()
        
        # Inventory tests
        self.test_create_inventory_item()
        self.test_get_inventory()
        
        # Dashboard and reports
        self.test_dashboard_stats()
        self.test_attendance_report()
        self.test_activity_report()
        self.test_top_members_report()
        
        # NEW MOBILE FUNCTIONALITY TESTS (Priority)
        print("\n🔥 TESTING NEW MOBILE FUNCTIONALITY")
        print("-" * 40)
        self.test_mobile_activities()
        self.test_motivational_notes()
        self.test_message_creation()
        self.test_dashboard_with_new_changes()
        
        # SARCASTIC MOTIVATIONAL NOTES SYSTEM TEST (New Priority)
        self.test_sarcastic_motivational_notes_system()
        
        # Update operations
        self.test_update_operations()
        
        # Cleanup (delete operations)
        self.test_delete_operations()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = GymManagementAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())