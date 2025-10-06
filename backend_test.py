#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, Any

class GymManagementAPITester:
    def __init__(self, base_url="https://kotracker.preview.emergentagent.com"):
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

    def test_member_status_calculation(self):
        """Test member status calculation based on payments"""
        print("\n🔍 Testing Member Status Calculation...")
        
        # First, get all members to check status values
        success, members_response = self.run_test("Get Members - Check Status Values", "GET", "members", 200)
        if not success:
            return False, {}
        
        # Verify no members have "suspended" status
        suspended_members = [m for m in members_response if m.get('status') == 'suspended']
        if suspended_members:
            self.log_test("No Suspended Status Check", False, f"Found {len(suspended_members)} members with suspended status")
            return False, {}
        else:
            self.log_test("No Suspended Status Check", True, "No members have suspended status")
        
        # Check that all members have either "active" or "inactive" status
        valid_statuses = ['active', 'inactive']
        invalid_status_members = [m for m in members_response if m.get('status') not in valid_statuses]
        if invalid_status_members:
            self.log_test("Valid Status Values Check", False, f"Found members with invalid status: {[m.get('status') for m in invalid_status_members]}")
            return False, {}
        else:
            self.log_test("Valid Status Values Check", True, "All members have valid status (active/inactive)")
        
        # If we have a created member, test payment-based status change
        if self.created_member_id:
            # First check member status before payment
            success, member_before = self.run_test("Get Member Before Payment", "GET", f"members/{self.created_member_id}", 200)
            if success:
                print(f"   Member status before payment: {member_before.get('status')}")
            
            # Create a payment for current month with "paid" status
            payment_data = {
                "member_id": self.created_member_id,
                "amount": 50.00,
                "payment_method": "cash",
                "status": "paid",
                "description": "Test payment for status calculation"
            }
            
            success, payment_response = self.run_test("Create Paid Payment for Status Test", "POST", "payments", 200, payment_data)
            if not success:
                return False, {}
            
            # Now check member status after payment
            success, member_after = self.run_test("Get Member After Payment", "GET", f"members/{self.created_member_id}", 200)
            if success:
                print(f"   Member status after payment: {member_after.get('status')}")
                if member_after.get('status') == 'active':
                    self.log_test("Member Status Active After Payment", True, "Member status correctly changed to active after paid payment")
                else:
                    self.log_test("Member Status Active After Payment", False, f"Member status is {member_after.get('status')}, expected active")
        
        return True, {}

    def test_expense_endpoints(self):
        """Test expense endpoints functionality"""
        print("\n🔍 Testing Expense Endpoints...")
        
        # Create a new expense
        expense_data = {
            "category": "salaries",
            "amount": 1000.0,
            "description": "Test expense",
            "created_by": "fabio.guerreiro"
        }
        
        success, expense_response = self.run_test("Create Expense", "POST", "expenses", 200, expense_data)
        if not success:
            return False, {}
        
        created_expense_id = expense_response.get('id') if expense_response else None
        if not created_expense_id:
            self.log_test("Expense Creation ID Check", False, "No expense ID returned")
            return False, {}
        
        print(f"   Created expense ID: {created_expense_id}")
        
        # Get all expenses and verify our expense is in the list
        success, expenses_response = self.run_test("Get All Expenses", "GET", "expenses", 200)
        if success:
            found_expense = next((e for e in expenses_response if e.get('id') == created_expense_id), None)
            if found_expense:
                self.log_test("Expense in List Check", True, "Created expense found in expenses list")
            else:
                self.log_test("Expense in List Check", False, "Created expense not found in expenses list")
        
        # Test filtering by category
        success, filtered_response = self.run_test("Filter Expenses by Category", "GET", "expenses?category=salaries", 200)
        if success:
            salaries_expenses = [e for e in filtered_response if e.get('category') == 'salaries']
            found_our_expense = next((e for e in salaries_expenses if e.get('id') == created_expense_id), None)
            if found_our_expense:
                self.log_test("Expense Category Filter Check", True, "Created expense found in category filter")
            else:
                self.log_test("Expense Category Filter Check", False, "Created expense not found in category filter")
        
        # Delete the expense
        success, delete_response = self.run_test("Delete Expense", "DELETE", f"expenses/{created_expense_id}", 200)
        if success:
            # Verify expense is deleted by trying to get all expenses again
            success, expenses_after_delete = self.run_test("Verify Expense Deleted", "GET", "expenses", 200)
            if success:
                deleted_expense = next((e for e in expenses_after_delete if e.get('id') == created_expense_id), None)
                if not deleted_expense:
                    self.log_test("Expense Deletion Verification", True, "Expense successfully deleted")
                else:
                    self.log_test("Expense Deletion Verification", False, "Expense still exists after deletion")
        
        return True, {}

    def test_authentication_on_endpoints(self):
        """Test authentication on payments and members endpoints"""
        print("\n🔍 Testing Authentication on Key Endpoints...")
        
        # Test payments endpoint access (admin should have access)
        success, payments_response = self.run_test("Admin Access to Payments", "GET", "payments", 200)
        if success:
            self.log_test("Admin Payments Access", True, "Admin can access payments endpoint without 401 error")
        else:
            self.log_test("Admin Payments Access", False, "Admin cannot access payments endpoint")
        
        # Test members endpoint access (admin should have access)
        success, members_response = self.run_test("Admin Access to Members", "GET", "members", 200)
        if success:
            self.log_test("Admin Members Access", True, "Admin can access members endpoint without 401 error")
        else:
            self.log_test("Admin Members Access", False, "Admin cannot access members endpoint")
        
        return True, {}

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
        
        # PRIORITY TESTS - Review Request Specific Tests
        print("\n🎯 PRIORITY TESTS - Review Request Specific")
        print("-" * 50)
        self.test_authentication_on_endpoints()
        self.test_expense_endpoints()
        
        # Activities/Modalidades tests (PRIORITY)
        self.test_get_activities()
        self.test_create_activity()
        
        # Member management tests
        self.test_create_member()
        self.test_get_members()
        self.test_get_member_by_id()
        self.test_search_members()
        self.test_filter_members()
        
        # Member status calculation tests (PRIORITY)
        self.test_member_status_calculation()
        
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