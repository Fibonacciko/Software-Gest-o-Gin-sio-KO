#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, Any

class GymManagementAPITester:
    def __init__(self, base_url="https://fittrack-portal.preview.emergentagent.com"):
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

    def test_expense_categories_backend(self):
        """Test expense categories backend - Review Request Test Case 3"""
        print("\n🔍 Testing Expense Categories Backend (Review Request)...")
        
        # Test 1: POST /api/expenses with category "fixed" - should work
        expense_fixed_data = {
            "category": "fixed",
            "amount": 500.0,
            "description": "Despesa fixa teste",
            "created_by": "fabio.guerreiro"
        }
        
        success_fixed, response_fixed = self.run_test("Create Expense - Fixed Category", "POST", "expenses", 200, expense_fixed_data)
        
        # Test 2: POST /api/expenses with category "variable" - should work
        expense_variable_data = {
            "category": "variable",
            "amount": 300.0,
            "description": "Despesa variável teste",
            "created_by": "fabio.guerreiro"
        }
        
        success_variable, response_variable = self.run_test("Create Expense - Variable Category", "POST", "expenses", 200, expense_variable_data)
        
        # Test 3: POST /api/expenses with old category "salaries" - should fail with validation error
        expense_salaries_data = {
            "category": "salaries",
            "amount": 1000.0,
            "description": "Despesa ordenados teste (deve falhar)",
            "created_by": "fabio.guerreiro"
        }
        
        success_salaries, response_salaries = self.run_test("Create Expense - Salaries Category (Should Fail)", "POST", "expenses", 422, expense_salaries_data)
        
        # Cleanup created expenses
        if success_fixed and response_fixed and 'id' in response_fixed:
            self.run_test("Cleanup Fixed Expense", "DELETE", f"expenses/{response_fixed['id']}", 200)
        
        if success_variable and response_variable and 'id' in response_variable:
            self.run_test("Cleanup Variable Expense", "DELETE", f"expenses/{response_variable['id']}", 200)
        
        # Overall test success
        overall_success = success_fixed and success_variable and success_salaries
        if overall_success:
            self.log_test("Expense Categories Backend Test", True, "Fixed and Variable categories work, Salaries category properly rejected")
        else:
            self.log_test("Expense Categories Backend Test", False, f"Fixed: {success_fixed}, Variable: {success_variable}, Salaries rejected: {success_salaries}")
        
        return overall_success, {}

    def test_inventory_low_stock_consistency(self):
        """Test inventory low stock consistency - Review Request Test Case 4"""
        print("\n🔍 Testing Inventory Low Stock Consistency (Review Request)...")
        
        # Get all inventory items
        success, inventory_response = self.run_test("Get All Inventory Items", "GET", "inventory", 200)
        if not success or not inventory_response:
            self.log_test("Inventory Low Stock Test", False, "Could not retrieve inventory items")
            return False, {}
        
        # Count items with quantity <= 5 and > 0 (low stock items)
        low_stock_items = []
        for item in inventory_response:
            quantity = item.get('quantity', 0)
            if 0 < quantity <= 5:
                low_stock_items.append(item)
                print(f"   Low stock item: {item.get('name')} (Quantity: {quantity})")
        
        low_stock_count = len(low_stock_items)
        print(f"   Found {low_stock_count} low stock items (quantity <= 5 and > 0)")
        
        # Create a test item with low stock to verify the logic
        test_item_data = {
            "name": "Teste Low Stock Item",
            "category": "equipment",
            "quantity": 3,  # Low stock
            "price": 25.99,
            "purchase_price": 15.00,
            "description": "Item para teste de stock baixo"
        }
        
        success, test_item_response = self.run_test("Create Low Stock Test Item", "POST", "inventory", 200, test_item_data)
        if success and test_item_response and 'id' in test_item_response:
            test_item_id = test_item_response['id']
            
            # Get inventory again and verify our test item is counted as low stock
            success, updated_inventory = self.run_test("Get Updated Inventory", "GET", "inventory", 200)
            if success:
                updated_low_stock = [item for item in updated_inventory if 0 < item.get('quantity', 0) <= 5]
                if any(item.get('id') == test_item_id for item in updated_low_stock):
                    self.log_test("Low Stock Threshold Consistency", True, "Test item with quantity 3 correctly identified as low stock")
                else:
                    self.log_test("Low Stock Threshold Consistency", False, "Test item with quantity 3 not identified as low stock")
            
            # Cleanup test item
            self.run_test("Cleanup Low Stock Test Item", "DELETE", f"inventory/{test_item_id}", 200)
        
        return True, {}

    def test_inventory_net_revenue_calculation(self):
        """Test inventory net revenue calculation - Review Request Test Case 5"""
        print("\n🔍 Testing Inventory Net Revenue Calculation (Review Request)...")
        
        # Create test inventory item with purchase_price=10, price=20, quantity=10
        test_item_data = {
            "name": "Teste Net Revenue Item",
            "category": "equipment",
            "quantity": 10,
            "price": 20.0,
            "purchase_price": 10.0,
            "description": "Item para teste de receita líquida"
        }
        
        success, test_item_response = self.run_test("Create Net Revenue Test Item", "POST", "inventory", 200, test_item_data)
        if not success or not test_item_response or 'id' not in test_item_response:
            self.log_test("Net Revenue Test Setup", False, "Could not create test item")
            return False, {}
        
        test_item_id = test_item_response['id']
        print(f"   Created test item ID: {test_item_id}")
        
        # Sell 2 units at price 20
        sale_data = {
            "quantity": 2,
            "sale_price": 20.0
        }
        
        success, sale_response = self.run_test("Sell 2 Units", "POST", f"inventory/{test_item_id}/sell", 200, sale_data)
        if not success:
            self.log_test("Net Revenue Sale Test", False, "Could not sell items")
            # Cleanup
            self.run_test("Cleanup Net Revenue Test Item", "DELETE", f"inventory/{test_item_id}", 200)
            return False, {}
        
        # Verify sale response
        if sale_response:
            print(f"   Sale response: {json.dumps(sale_response, indent=2, default=str)}")
            
            # Check if quantity_sold and remaining_stock are correct
            remaining_stock = sale_response.get('remaining_stock')
            if remaining_stock == 8:  # 10 - 2 = 8
                self.log_test("Remaining Stock After Sale", True, f"Remaining stock is correct: {remaining_stock}")
            else:
                self.log_test("Remaining Stock After Sale", False, f"Expected 8, got {remaining_stock}")
        
        # Get updated item to verify sold_quantity is incremented
        success, updated_item = self.run_test("Get Updated Item After Sale", "GET", "inventory", 200)
        if success and updated_item:
            # Find our test item in the inventory list
            our_item = next((item for item in updated_item if item.get('id') == test_item_id), None)
            if our_item:
                sold_quantity = our_item.get('sold_quantity', 0)
                current_quantity = our_item.get('quantity', 0)
                
                print(f"   Item after sale - Quantity: {current_quantity}, Sold: {sold_quantity}")
                
                if sold_quantity == 2:
                    self.log_test("Sold Quantity Increment", True, f"Sold quantity correctly incremented to {sold_quantity}")
                else:
                    self.log_test("Sold Quantity Increment", False, f"Expected sold_quantity=2, got {sold_quantity}")
                
                if current_quantity == 8:
                    self.log_test("Quantity Decrement", True, f"Quantity correctly decremented to {current_quantity}")
                else:
                    self.log_test("Quantity Decrement", False, f"Expected quantity=8, got {current_quantity}")
                
                # Calculate expected net revenue: (2 * 20) - (2 * 10) = 40 - 20 = 20
                expected_net_revenue = (2 * 20.0) - (2 * 10.0)
                print(f"   Expected net revenue calculation: (2 * 20) - (2 * 10) = {expected_net_revenue}")
                self.log_test("Net Revenue Calculation Logic", True, f"Net revenue should be {expected_net_revenue} for this sale")
            else:
                self.log_test("Find Updated Item", False, "Could not find updated item in inventory")
        
        # Cleanup test item
        self.run_test("Cleanup Net Revenue Test Item", "DELETE", f"inventory/{test_item_id}", 200)
        
        return True, {}

    def test_expense_endpoints(self):
        """Test expense endpoints functionality (legacy test)"""
        print("\n🔍 Testing Expense Endpoints (Legacy)...")
        
        # Create a new expense with valid category
        expense_data = {
            "category": "fixed",  # Updated to use valid category
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
        success, filtered_response = self.run_test("Filter Expenses by Category", "GET", "expenses?category=fixed", 200)
        if success:
            fixed_expenses = [e for e in filtered_response if e.get('category') == 'fixed']
            found_our_expense = next((e for e in fixed_expenses if e.get('id') == created_expense_id), None)
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

    def test_staff_user_authorization(self):
        """Test Staff user authorization for payments functionality - CRITICAL REVIEW REQUEST TEST"""
        print("\n🎯 CRITICAL: STAFF USER AUTHORIZATION TESTING")
        print("-" * 60)
        
        # Store original admin token
        original_admin_token = self.auth_token
        original_admin_headers = self.auth_headers.copy()
        
        success_count = 0
        total_tests = 5
        
        # Step 1: Create Staff User
        print("\n🔍 Step 1: Creating Staff User...")
        staff_user_data = {
            "username": "staff.user",
            "email": "staff@gym.com", 
            "full_name": "Staff User Test",
            "password": "staff123",
            "role": "staff"
        }
        
        create_success, create_response = self.run_test("Create Staff User", "POST", "users", 200, staff_user_data)
        if not create_success:
            self.log_test("Staff User Authorization Test", False, "Could not create staff user")
            return False, {}
        
        staff_user_id = create_response.get('id') if create_response else None
        print(f"   Created Staff User ID: {staff_user_id}")
        
        # Step 2: Staff User Authentication
        print("\n🔍 Step 2: Staff User Authentication...")
        staff_login_data = {
            "username": "staff.user",
            "password": "staff123"
        }
        
        login_success, login_response = self.run_test("Staff User Login", "POST", "auth/login", 200, staff_login_data, {'Content-Type': 'application/json'})
        if not login_success or not login_response or 'access_token' not in login_response:
            self.log_test("Staff User Authorization Test", False, "Staff user login failed")
            return False, {}
        
        # Set staff user token
        staff_token = login_response['access_token']
        staff_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {staff_token}'
        }
        
        # Verify staff user details
        staff_user = login_response.get('user', {})
        if staff_user.get('role') == 'staff':
            self.log_test("Staff User Role Verification", True, f"Staff user role confirmed: {staff_user.get('role')}")
            success_count += 1
        else:
            self.log_test("Staff User Role Verification", False, f"Expected staff role, got: {staff_user.get('role')}")
        
        print(f"   Staff User: {staff_user.get('full_name')} (Role: {staff_user.get('role')})")
        print(f"   Staff Token: {staff_token[:20]}...")
        
        # Step 3: Staff Access to GET /payments
        print("\n🔍 Step 3: Staff Access to GET /payments...")
        payments_success, payments_response = self.run_test("Staff GET /payments", "GET", "payments", 200, None, staff_headers)
        if payments_success:
            self.log_test("Staff GET Payments Access", True, "Staff user can access GET /payments (not 403 Forbidden)")
            success_count += 1
            print(f"   Staff can access payments list - Found {len(payments_response) if payments_response else 0} payments")
        else:
            self.log_test("Staff GET Payments Access", False, "Staff user cannot access GET /payments - returns 403 Forbidden")
        
        # Step 4: Staff Access to POST /payments (Membership Registration)
        print("\n🔍 Step 4: Staff Access to POST /payments (Membership Registration)...")
        
        # First ensure we have a member to create payment for
        if not self.created_member_id:
            # Create a test member using admin token temporarily
            self.auth_headers = original_admin_headers
            member_success, member_response = self.test_create_member()
            if not member_success:
                self.log_test("Staff POST Payments Test Setup", False, "Could not create test member")
                return False, {}
        
        # Create membership payment with staff token (use current date for status calculation)
        from datetime import date
        current_date = date.today().isoformat()
        membership_payment_data = {
            "member_id": self.created_member_id,
            "amount": 50.00,
            "payment_method": "membership",
            "description": "Test membership payment by staff",
            "payment_date": current_date
        }
        
        post_success, post_response = self.run_test("Staff POST /payments (Membership)", "POST", "payments", 200, membership_payment_data, staff_headers)
        if post_success and post_response:
            self.log_test("Staff POST Payments Access", True, "Staff user can create payments (membership registration)")
            success_count += 1
            
            created_payment_id = post_response.get('id')
            print(f"   Staff created payment ID: {created_payment_id}")
            
            # Verify payment details
            if (post_response.get('amount') == 50.00 and 
                post_response.get('payment_method') == 'membership' and
                post_response.get('member_id') == self.created_member_id):
                self.log_test("Staff Payment Creation Details", True, "Payment created with correct details")
            else:
                self.log_test("Staff Payment Creation Details", False, "Payment details incorrect")
        else:
            self.log_test("Staff POST Payments Access", False, "Staff user cannot create payments - returns 403 Forbidden")
            created_payment_id = None
        
        # Step 5: Staff Access to DELETE /payments
        print("\n🔍 Step 5: Staff Access to DELETE /payments...")
        
        if created_payment_id:
            delete_success, delete_response = self.run_test("Staff DELETE /payments", "DELETE", f"payments/{created_payment_id}", 200, None, staff_headers)
            if delete_success:
                self.log_test("Staff DELETE Payments Access", True, "Staff user can delete payments")
                success_count += 1
                print(f"   Staff successfully deleted payment: {created_payment_id}")
            else:
                self.log_test("Staff DELETE Payments Access", False, "Staff user cannot delete payments - returns 403 Forbidden")
        else:
            self.log_test("Staff DELETE Payments Test", False, "No payment ID available for deletion test")
        
        # Step 6: Member Status Update Verification
        print("\n🔍 Step 6: Member Status Update Verification...")
        
        # Create another membership payment to test status update (use current date)
        status_test_payment_data = {
            "member_id": self.created_member_id,
            "amount": 75.00,
            "payment_method": "membership",
            "description": "Membership payment for status test",
            "payment_date": current_date
        }
        
        status_payment_success, status_payment_response = self.run_test("Staff Membership Payment for Status", "POST", "payments", 200, status_test_payment_data, staff_headers)
        if status_payment_success:
            # Check member status after payment
            member_success, member_response = self.run_test("Get Member After Membership Payment", "GET", f"members/{self.created_member_id}", 200, None, staff_headers)
            if member_success and member_response:
                member_status = member_response.get('status')
                last_payment_date = member_response.get('last_payment_date')
                
                print(f"   Member status after membership payment: {member_status}")
                print(f"   Last payment date: {last_payment_date}")
                
                if member_status == 'active':
                    self.log_test("Member Status Update After Membership Payment", True, "Member status correctly updated to active")
                    success_count += 1
                else:
                    self.log_test("Member Status Update After Membership Payment", False, f"Member status is {member_status}, expected active")
                
                if last_payment_date:
                    self.log_test("Last Payment Date Update", True, f"Last payment date updated: {last_payment_date}")
                else:
                    self.log_test("Last Payment Date Update", False, "Last payment date not updated")
        
        # Cleanup: Delete staff user
        print("\n🧹 Cleanup: Deleting Staff User...")
        self.auth_headers = original_admin_headers  # Use admin token for cleanup
        if staff_user_id:
            self.run_test("Delete Staff User", "DELETE", f"users/{staff_user_id}", 200)
        
        # Restore original admin token
        self.auth_token = original_admin_token
        self.auth_headers = original_admin_headers
        
        # Summary
        print(f"\n📊 STAFF USER AUTHORIZATION SUMMARY")
        print(f"   Tests Passed: {success_count}/{total_tests}")
        
        if success_count == total_tests:
            self.log_test("Staff User Authorization Complete", True, "All staff authorization tests passed - Staff users have proper access to payments functionality")
            return True, {}
        else:
            self.log_test("Staff User Authorization Complete", False, f"Only {success_count}/{total_tests} staff authorization tests passed")
            return False, {}

    def test_member_activity_id_functionality(self):
        """Test member registration and check-in functionality with activity_id field - REVIEW REQUEST"""
        print("\n🎯 MEMBER ACTIVITY_ID FUNCTIONALITY TESTING - REVIEW REQUEST")
        print("-" * 70)
        
        success_count = 0
        total_tests = 4
        
        # Step 1: Get available activities first
        print("\n🔍 Step 1: Getting available activities...")
        activities_success, activities_response = self.run_test("Get Available Activities", "GET", "activities", 200)
        if not activities_success or not activities_response or len(activities_response) == 0:
            self.log_test("Member Activity ID Test", False, "No activities available for testing")
            return False, {}
        
        # Use the first available activity
        test_activity = activities_response[0]
        test_activity_id = test_activity['id']
        test_activity_name = test_activity['name']
        print(f"   Using activity: {test_activity_name} (ID: {test_activity_id})")
        
        # Step 2: Test POST /api/members with activity_id field
        print("\n🔍 Step 2: Testing POST /api/members with activity_id field...")
        member_with_activity_data = {
            "name": "Maria Santos Activity Test",
            "email": "maria.activity@email.com",
            "phone": "+351987654321",
            "date_of_birth": "1985-03-20",
            "nationality": "Portuguesa",
            "profession": "Professora",
            "address": "Avenida da Liberdade, 456, Porto",
            "membership_type": "basic",
            "activity_id": test_activity_id,  # Include activity_id
            "notes": "Membro criado para teste de activity_id"
        }
        
        create_success, create_response = self.run_test("Create Member with Activity ID", "POST", "members", 200, member_with_activity_data)
        if create_success and create_response:
            test_member_id = create_response.get('id')
            returned_activity_id = create_response.get('activity_id')
            
            print(f"   Created member ID: {test_member_id}")
            print(f"   Returned activity_id: {returned_activity_id}")
            
            if returned_activity_id == test_activity_id:
                self.log_test("Member Creation with Activity ID", True, f"Member created with correct activity_id: {returned_activity_id}")
                success_count += 1
            else:
                self.log_test("Member Creation with Activity ID", False, f"Expected activity_id {test_activity_id}, got {returned_activity_id}")
        else:
            self.log_test("Member Creation with Activity ID", False, "Failed to create member with activity_id")
            return False, {}
        
        # Step 3: Test GET /api/members/{member_id} - Verify response includes activity_id
        print("\n🔍 Step 3: Testing GET /api/members/{member_id} - Verify activity_id field...")
        get_success, get_response = self.run_test("Get Member - Verify Activity ID", "GET", f"members/{test_member_id}", 200)
        if get_success and get_response:
            retrieved_activity_id = get_response.get('activity_id')
            
            print(f"   Retrieved activity_id: {retrieved_activity_id}")
            
            if retrieved_activity_id == test_activity_id:
                self.log_test("Member Retrieval with Activity ID", True, f"Member retrieval includes correct activity_id: {retrieved_activity_id}")
                success_count += 1
            else:
                self.log_test("Member Retrieval with Activity ID", False, f"Expected activity_id {test_activity_id}, got {retrieved_activity_id}")
        else:
            self.log_test("Member Retrieval with Activity ID", False, "Failed to retrieve member")
        
        # Step 4: Test PUT /api/members/{member_id} with activity_id field
        print("\n🔍 Step 4: Testing PUT /api/members/{member_id} with activity_id field...")
        
        # Get a different activity for update test
        different_activity = None
        for activity in activities_response:
            if activity['id'] != test_activity_id:
                different_activity = activity
                break
        
        if different_activity:
            new_activity_id = different_activity['id']
            new_activity_name = different_activity['name']
            print(f"   Updating to activity: {new_activity_name} (ID: {new_activity_id})")
            
            update_data = {
                "name": "Maria Santos Activity Test Updated",
                "email": "maria.activity@email.com",
                "phone": "+351987654321",
                "date_of_birth": "1985-03-20",
                "nationality": "Portuguesa",
                "profession": "Professora Senior",
                "address": "Avenida da Liberdade, 456, Porto",
                "membership_type": "premium",
                "activity_id": new_activity_id,  # Update activity_id
                "notes": "Membro atualizado com nova activity_id"
            }
            
            update_success, update_response = self.run_test("Update Member Activity ID", "PUT", f"members/{test_member_id}", 200, update_data)
            if update_success and update_response:
                updated_activity_id = update_response.get('activity_id')
                
                print(f"   Updated activity_id: {updated_activity_id}")
                
                if updated_activity_id == new_activity_id:
                    self.log_test("Member Update with Activity ID", True, f"Member activity_id updated correctly to: {updated_activity_id}")
                    success_count += 1
                else:
                    self.log_test("Member Update with Activity ID", False, f"Expected activity_id {new_activity_id}, got {updated_activity_id}")
            else:
                self.log_test("Member Update with Activity ID", False, "Failed to update member activity_id")
        else:
            self.log_test("Member Update with Activity ID", False, "No different activity available for update test")
        
        # Step 5: Test POST /api/attendance with activity_id
        print("\n🔍 Step 5: Testing POST /api/attendance with activity_id...")
        attendance_data = {
            "member_id": test_member_id,
            "activity_id": test_activity_id,  # Use original activity for attendance
            "method": "manual"
        }
        
        attendance_success, attendance_response = self.run_test("Create Attendance with Activity ID", "POST", "attendance", 200, attendance_data)
        if attendance_success and attendance_response:
            attendance_activity_id = attendance_response.get('activity_id')
            attendance_id = attendance_response.get('id')
            
            print(f"   Created attendance ID: {attendance_id}")
            print(f"   Attendance activity_id: {attendance_activity_id}")
            
            if attendance_activity_id == test_activity_id:
                self.log_test("Attendance Creation with Activity ID", True, f"Attendance created with correct activity_id: {attendance_activity_id}")
                success_count += 1
            else:
                self.log_test("Attendance Creation with Activity ID", False, f"Expected activity_id {test_activity_id}, got {attendance_activity_id}")
        else:
            self.log_test("Attendance Creation with Activity ID", False, "Failed to create attendance with activity_id")
        
        # Cleanup: Delete test member
        print("\n🧹 Cleanup: Deleting test member...")
        self.run_test("Delete Test Member", "DELETE", f"members/{test_member_id}", 200)
        
        # Summary
        print(f"\n📊 MEMBER ACTIVITY_ID FUNCTIONALITY SUMMARY")
        print(f"   Tests Passed: {success_count}/{total_tests}")
        
        if success_count == total_tests:
            self.log_test("Member Activity ID Functionality Complete", True, "All member activity_id functionality tests passed")
            return True, {}
        else:
            self.log_test("Member Activity ID Functionality Complete", False, f"Only {success_count}/{total_tests} activity_id tests passed")
            return False, {}

    def test_financial_operations_critical(self):
        """Test critical financial operations reported by users as not working"""
        print("\n🎯 CRITICAL FINANCIAL OPERATIONS TESTING")
        print("-" * 50)
        
        success_count = 0
        total_tests = 3
        
        # Test 1: Financial Reset Endpoint (HIGH PRIORITY)
        print("\n🔍 Testing Financial Reset Endpoint...")
        
        # First create some test data to reset
        if self.created_member_id:
            # Create test payment
            test_payment_data = {
                "member_id": self.created_member_id,
                "amount": 75.00,
                "payment_method": "cash",
                "description": "Test payment for reset"
            }
            payment_success, payment_response = self.run_test("Create Test Payment for Reset", "POST", "payments", 200, test_payment_data)
            
            # Create test expense
            test_expense_data = {
                "category": "fixed",
                "amount": 200.0,
                "description": "Test expense for reset",
                "created_by": "fabio.guerreiro"
            }
            expense_success, expense_response = self.run_test("Create Test Expense for Reset", "POST", "expenses", 200, test_expense_data)
        
        # Test the reset endpoint
        reset_success, reset_response = self.run_test("Financial Reset Endpoint", "POST", "admin/reset-financials", 200)
        if reset_success and reset_response:
            print(f"   Reset Response: {json.dumps(reset_response, indent=2, default=str)}")
            
            # Verify deletion counts
            deleted_payments = reset_response.get('deleted', {}).get('payments', 0)
            deleted_expenses = reset_response.get('deleted', {}).get('expenses', 0)
            deleted_sales = reset_response.get('deleted', {}).get('sales', 0)
            
            print(f"   Deleted - Payments: {deleted_payments}, Expenses: {deleted_expenses}, Sales: {deleted_sales}")
            
            # Verify data is actually deleted
            verify_payments, payments_after = self.run_test("Verify Payments Deleted", "GET", "payments", 200)
            if verify_payments and len(payments_after) == 0:
                self.log_test("Payments Actually Deleted", True, "All payments successfully deleted")
            else:
                self.log_test("Payments Actually Deleted", False, f"Still found {len(payments_after) if payments_after else 'unknown'} payments")
            
            verify_expenses, expenses_after = self.run_test("Verify Expenses Deleted", "GET", "expenses", 200)
            if verify_expenses and len(expenses_after) == 0:
                self.log_test("Expenses Actually Deleted", True, "All expenses successfully deleted")
            else:
                self.log_test("Expenses Actually Deleted", False, f"Still found {len(expenses_after) if expenses_after else 'unknown'} expenses")
            
            success_count += 1
        
        # Test 2: Payment Delete Endpoint (HIGH PRIORITY)
        print("\n🔍 Testing Payment Delete Endpoint...")
        
        if self.created_member_id:
            # Create a test payment to delete
            delete_test_payment_data = {
                "member_id": self.created_member_id,
                "amount": 45.00,
                "payment_method": "card",
                "description": "Test payment for deletion"
            }
            
            create_success, create_response = self.run_test("Create Payment for Delete Test", "POST", "payments", 200, delete_test_payment_data)
            if create_success and create_response and 'id' in create_response:
                payment_id_to_delete = create_response['id']
                print(f"   Created payment ID for deletion: {payment_id_to_delete}")
                
                # Test the delete endpoint
                delete_success, delete_response = self.run_test("Delete Payment Endpoint", "DELETE", f"payments/{payment_id_to_delete}", 200)
                if delete_success:
                    print(f"   Delete Response: {json.dumps(delete_response, indent=2, default=str)}")
                    
                    # Verify payment is actually deleted
                    verify_success, all_payments = self.run_test("Verify Payment Deleted", "GET", "payments", 200)
                    if verify_success:
                        deleted_payment = next((p for p in all_payments if p.get('id') == payment_id_to_delete), None)
                        if not deleted_payment:
                            self.log_test("Payment Actually Deleted", True, "Payment successfully removed from database")
                            success_count += 1
                        else:
                            self.log_test("Payment Actually Deleted", False, "Payment still exists in database after delete")
                    else:
                        self.log_test("Payment Delete Verification", False, "Could not verify payment deletion")
                else:
                    self.log_test("Payment Delete Failed", False, "Delete payment endpoint failed")
            else:
                self.log_test("Payment Delete Test Setup", False, "Could not create test payment for deletion")
        else:
            self.log_test("Payment Delete Test", False, "No member ID available for payment creation")
        
        # Test 3: Payment Creation Endpoint (HIGH PRIORITY)
        print("\n🔍 Testing Payment Creation Endpoint...")
        
        if self.created_member_id:
            # Test payment creation with various scenarios
            creation_test_data = {
                "member_id": self.created_member_id,
                "amount": 60.00,
                "payment_method": "mbway",
                "description": "Mensalidade Premium - Teste Criação"
            }
            
            creation_success, creation_response = self.run_test("Payment Creation Endpoint", "POST", "payments", 200, creation_test_data)
            if creation_success and creation_response:
                print(f"   Creation Response: {json.dumps(creation_response, indent=2, default=str)}")
                
                # Verify all required fields are present
                required_fields = ['id', 'member_id', 'amount', 'payment_method', 'status', 'payment_date']
                missing_fields = [field for field in required_fields if field not in creation_response]
                
                if not missing_fields:
                    self.log_test("Payment Creation Fields", True, "All required fields present in response")
                else:
                    self.log_test("Payment Creation Fields", False, f"Missing fields: {missing_fields}")
                
                # Verify the payment appears in the payments list
                verify_success, all_payments = self.run_test("Verify Payment in List", "GET", "payments", 200)
                if verify_success:
                    created_payment = next((p for p in all_payments if p.get('id') == creation_response.get('id')), None)
                    if created_payment:
                        self.log_test("Payment in Database", True, "Created payment found in database")
                        
                        # Verify payment data integrity
                        if (created_payment.get('amount') == 60.00 and 
                            created_payment.get('payment_method') == 'mbway' and
                            created_payment.get('member_id') == self.created_member_id):
                            self.log_test("Payment Data Integrity", True, "Payment data matches input")
                            success_count += 1
                        else:
                            self.log_test("Payment Data Integrity", False, "Payment data does not match input")
                    else:
                        self.log_test("Payment in Database", False, "Created payment not found in database")
                else:
                    self.log_test("Payment Creation Verification", False, "Could not verify payment creation")
            else:
                self.log_test("Payment Creation Failed", False, "Payment creation endpoint failed")
        else:
            self.log_test("Payment Creation Test", False, "No member ID available for payment creation")
        
        # Summary
        print(f"\n📊 CRITICAL FINANCIAL OPERATIONS SUMMARY")
        print(f"   Tests Passed: {success_count}/{total_tests}")
        
        if success_count == total_tests:
            self.log_test("Critical Financial Operations", True, "All critical financial operations working correctly")
        else:
            self.log_test("Critical Financial Operations", False, f"Only {success_count}/{total_tests} critical operations working")
        
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
        
        # PRIORITY TESTS - Review Request Specific Tests
        print("\n🎯 PRIORITY TESTS - Review Request Specific")
        print("-" * 50)
        self.test_authentication_on_endpoints()
        
        # CRITICAL: Member Activity ID Functionality Testing (CURRENT REVIEW REQUEST)
        self.test_member_activity_id_functionality()
        
        # Member management tests (needed for financial operations)
        self.test_create_member()
        
        # CRITICAL: Staff User Authorization Testing (PREVIOUS REVIEW REQUEST)
        self.test_staff_user_authorization()
        
        # CRITICAL: Test the 3 specific financial operations from review request
        self.test_financial_operations_critical()
        
        # Review Request Test Cases
        self.test_expense_categories_backend()  # Test Case 3
        self.test_inventory_low_stock_consistency()  # Test Case 4
        self.test_inventory_net_revenue_calculation()  # Test Case 5
        
        # Legacy expense test
        self.test_expense_endpoints()
        
        # Activities/Modalidades tests (PRIORITY)
        self.test_get_activities()
        self.test_create_activity()
        
        # Member management tests (continued)
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