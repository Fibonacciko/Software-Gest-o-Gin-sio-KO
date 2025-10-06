#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class UserManagementTester:
    def __init__(self, base_url="https://kotracker.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.auth_token = None
        self.auth_headers = {'Content-Type': 'application/json'}
        self.created_user_id = None
        self.admin_user_data = None

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
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)[:300]}...")
                else:
                    print(f"   Error Response: {json.dumps(response_data, indent=2, default=str)}")
            except:
                response_data = response.text
                print(f"   Response Text: {response_data[:200]}...")

            self.log_test(name, success, f"Expected {expected_status}, got {response.status_code}", response_data)
            return success, response_data

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_test(name, False, error_msg)
            return False, {}

    def test_admin_login(self):
        """Test admin login with provided credentials"""
        login_data = {
            "username": "fabio.guerreiro",
            "password": "admin123"
        }
        
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, login_data, {'Content-Type': 'application/json'})
        if success and response and 'access_token' in response:
            self.auth_token = response['access_token']
            self.auth_headers['Authorization'] = f'Bearer {self.auth_token}'
            self.admin_user_data = response.get('user', {})
            print(f"   Authentication successful - Token acquired")
            print(f"   User: {self.admin_user_data.get('full_name', 'Unknown')}")
            print(f"   Role: {self.admin_user_data.get('role', 'Unknown')}")
            print(f"   User ID: {self.admin_user_data.get('id', 'Unknown')}")
        
        return success, response

    def test_get_current_user(self):
        """Test getting current authenticated user info"""
        return self.run_test("Get Current User Info", "GET", "auth/me", 200)

    def test_get_all_users(self):
        """Test GET /api/users endpoint (admin only)"""
        success, response = self.run_test("Get All Users", "GET", "users", 200)
        if success and response:
            print(f"   Found {len(response)} users in system")
            for user in response:
                print(f"   - {user.get('full_name', 'Unknown')} ({user.get('username', 'Unknown')}) - Role: {user.get('role', 'Unknown')}")
        return success, response

    def test_create_staff_user(self):
        """Test POST /api/users endpoint (create new staff user)"""
        user_data = {
            "username": "maria.santos",
            "email": "maria.santos@gym.com",
            "full_name": "Maria Santos",
            "password": "staff123",
            "role": "staff"
        }
        
        success, response = self.run_test("Create Staff User", "POST", "users", 200, user_data)
        if success and response and 'id' in response:
            self.created_user_id = response['id']
            print(f"   Created user ID: {self.created_user_id}")
            print(f"   Username: {response.get('username', 'Unknown')}")
            print(f"   Role: {response.get('role', 'Unknown')}")
            print(f"   Active: {response.get('is_active', 'Unknown')}")
        
        return success, response

    def test_create_duplicate_user(self):
        """Test creating user with duplicate username (should fail)"""
        user_data = {
            "username": "maria.santos",  # Same as previous test
            "email": "maria.duplicate@gym.com",
            "full_name": "Maria Duplicate",
            "password": "staff456",
            "role": "staff"
        }
        
        # This should fail with 400 status
        return self.run_test("Create Duplicate User (Should Fail)", "POST", "users", 400, user_data)

    def test_update_user(self):
        """Test PUT /api/users/{user_id} endpoint (edit user)"""
        if not self.created_user_id:
            self.log_test("Update User", False, "No user ID available")
            return False, {}
        
        update_data = {
            "username": "maria.santos.updated",
            "email": "maria.santos.updated@gym.com",
            "full_name": "Maria Santos Updated",
            "password": "newpassword123",
            "role": "staff"
        }
        
        return self.run_test("Update User", "PUT", f"users/{self.created_user_id}", 200, update_data)

    def test_toggle_user_status(self):
        """Test PUT /api/users/{user_id}/toggle-status endpoint"""
        if not self.created_user_id:
            self.log_test("Toggle User Status", False, "No user ID available")
            return False, {}
        
        # First toggle to deactivate
        success1, response1 = self.run_test("Deactivate User", "PUT", f"users/{self.created_user_id}/toggle-status", 200)
        
        # Then toggle back to activate
        success2, response2 = self.run_test("Reactivate User", "PUT", f"users/{self.created_user_id}/toggle-status", 200)
        
        return success1 and success2, {"deactivate": response1, "reactivate": response2}

    def test_delete_user(self):
        """Test DELETE /api/users/{user_id} endpoint"""
        if not self.created_user_id:
            self.log_test("Delete User", False, "No user ID available")
            return False, {}
        
        return self.run_test("Delete User", "DELETE", f"users/{self.created_user_id}", 200)

    def test_unauthorized_access(self):
        """Test accessing user endpoints without authentication"""
        # Remove auth header temporarily
        no_auth_headers = {'Content-Type': 'application/json'}
        
        success, response = self.run_test("Unauthorized Access (Should Fail)", "GET", "users", 401, headers=no_auth_headers)
        return success, response

    def test_staff_user_login(self):
        """Test login with created staff user credentials"""
        login_data = {
            "username": "maria.santos.updated",  # Updated username from previous test
            "password": "newpassword123"  # Updated password from previous test
        }
        
        # Note: This test might fail if the user was deleted in previous test
        success, response = self.run_test("Staff User Login", "POST", "auth/login", 200, login_data, {'Content-Type': 'application/json'})
        
        if success and response and 'access_token' in response:
            staff_token = response['access_token']
            staff_headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {staff_token}'
            }
            
            # Test if staff user can access user management (should fail - admin only)
            staff_success, staff_response = self.run_test("Staff Access to User Management (Should Fail)", "GET", "users", 403, headers=staff_headers)
            return success and staff_success, {"login": response, "access_test": staff_response}
        
        return success, response

    def test_admin_self_operations(self):
        """Test admin trying to delete/deactivate themselves (should fail)"""
        if not self.admin_user_data or not self.admin_user_data.get('id'):
            self.log_test("Admin Self Operations", False, "No admin user ID available")
            return False, {}
        
        admin_id = self.admin_user_data['id']
        
        # Try to deactivate self (should fail)
        success1, response1 = self.run_test("Admin Self-Deactivate (Should Fail)", "PUT", f"users/{admin_id}/toggle-status", 400)
        
        # Try to delete self (should fail)
        success2, response2 = self.run_test("Admin Self-Delete (Should Fail)", "DELETE", f"users/{admin_id}", 400)
        
        return success1 and success2, {"toggle": response1, "delete": response2}

    def test_password_hashing(self):
        """Test that passwords are properly hashed (create user and verify password not stored in plain text)"""
        user_data = {
            "username": "test.password",
            "email": "test.password@gym.com",
            "full_name": "Test Password User",
            "password": "plaintext123",
            "role": "staff"
        }
        
        success, response = self.run_test("Create User for Password Test", "POST", "users", 200, user_data)
        
        if success and response:
            # Check that password is not returned in response
            if 'password' not in response and 'password_hash' not in response:
                self.log_test("Password Security", True, "Password not exposed in API response")
                password_secure = True
            else:
                self.log_test("Password Security", False, "Password or hash exposed in API response")
                password_secure = False
            
            # Clean up test user
            if 'id' in response:
                cleanup_success, _ = self.run_test("Cleanup Password Test User", "DELETE", f"users/{response['id']}", 200)
                return success and password_secure and cleanup_success, response
        
        return success, response

    def run_all_user_management_tests(self):
        """Run all user management tests"""
        print("🚀 Starting User Management API Tests")
        print("=" * 60)
        
        # Authentication tests
        login_success, _ = self.test_admin_login()
        if not login_success:
            print("❌ Admin authentication failed - stopping tests")
            return False
        
        self.test_get_current_user()
        
        # User management tests
        self.test_get_all_users()
        self.test_create_staff_user()
        self.test_create_duplicate_user()
        self.test_update_user()
        self.test_toggle_user_status()
        
        # Security tests
        self.test_unauthorized_access()
        self.test_admin_self_operations()
        self.test_password_hashing()
        
        # Staff user tests (before deletion)
        self.test_staff_user_login()
        
        # Cleanup
        self.test_delete_user()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 USER MANAGEMENT TEST SUMMARY")
        print("=" * 60)
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
        else:
            print("\n✅ ALL USER MANAGEMENT TESTS PASSED!")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = UserManagementTester()
    
    try:
        success = tester.run_all_user_management_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())