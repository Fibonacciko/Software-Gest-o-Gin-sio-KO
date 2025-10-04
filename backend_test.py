#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, Any

class GymManagementAPITester:
    def __init__(self, base_url="https://gestao-painel.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_member_id = None
        self.created_payment_id = None
        self.created_item_id = None
        self.created_attendance_id = None

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
            headers = {'Content-Type': 'application/json'}

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

    def test_create_attendance(self):
        """Test manual check-in"""
        if not self.created_member_id:
            self.log_test("Create Attendance", False, "No member ID available")
            return False, {}
        
        attendance_data = {
            "member_id": self.created_member_id,
            "method": "manual"
        }
        
        success, response = self.run_test("Manual Check-in", "POST", "attendance", 200, attendance_data)
        if success and response and 'id' in response:
            self.created_attendance_id = response['id']
            print(f"   Created attendance ID: {self.created_attendance_id}")
        
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
        
        # Member management tests
        self.test_create_member()
        self.test_get_members()
        self.test_get_member_by_id()
        self.test_search_members()
        self.test_filter_members()
        
        # Attendance tests
        self.test_create_attendance()
        self.test_get_attendance()
        
        # Payment tests
        self.test_create_payment()
        self.test_get_payments()
        
        # Inventory tests
        self.test_create_inventory_item()
        self.test_get_inventory()
        
        # Dashboard and reports
        self.test_dashboard_stats()
        self.test_attendance_report()
        
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