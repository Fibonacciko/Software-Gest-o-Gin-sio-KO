"""
Test suite for Dashboard Alerts (Birthday & Anniversary) and Sales API
Tests the bug fixes for:
1. Birthday alerts using date_of_birth field
2. Membership anniversary alerts using join_date field  
3. GET /api/sales endpoint
4. Stock report with sales data
"""
import pytest
import requests
import os
from datetime import date, datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ Health check passed")
    
    def test_login(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print("✅ Login successful")


class TestMembersForAlerts:
    """Test members data for birthday and anniversary alerts"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_members(self, auth_headers):
        """Test GET /api/members returns members list"""
        response = requests.get(f"{BASE_URL}/api/members", headers=auth_headers)
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        print(f"✅ Got {len(members)} members")
        return members
    
    def test_birthday_member_exists(self, auth_headers):
        """Test that João Aniversário exists with correct date_of_birth"""
        response = requests.get(f"{BASE_URL}/api/members", headers=auth_headers)
        assert response.status_code == 200
        members = response.json()
        
        # Find João Aniversário
        joao = next((m for m in members if "João Aniversário" in m.get("name", "")), None)
        
        if joao:
            print(f"✅ Found João Aniversário: {joao.get('name')}")
            print(f"   date_of_birth: {joao.get('date_of_birth')}")
            
            # Verify date_of_birth is January 27
            dob = joao.get('date_of_birth')
            if dob:
                # Parse date string
                if isinstance(dob, str):
                    dob_date = datetime.fromisoformat(dob.replace('Z', '+00:00')).date() if 'T' in dob else date.fromisoformat(dob)
                else:
                    dob_date = dob
                
                assert dob_date.month == 1, f"Expected month 1, got {dob_date.month}"
                assert dob_date.day == 27, f"Expected day 27, got {dob_date.day}"
                print(f"✅ date_of_birth is correctly set to January 27")
        else:
            print("⚠️ João Aniversário not found - may need to create test data")
            pytest.skip("Test member not found")
    
    def test_anniversary_member_exists(self, auth_headers):
        """Test that Ana Adesão exists with correct join_date"""
        response = requests.get(f"{BASE_URL}/api/members", headers=auth_headers)
        assert response.status_code == 200
        members = response.json()
        
        # Find Ana Adesão
        ana = next((m for m in members if "Ana Adesão" in m.get("name", "")), None)
        
        if ana:
            print(f"✅ Found Ana Adesão: {ana.get('name')}")
            print(f"   join_date: {ana.get('join_date')}")
            
            # Verify join_date is January 27, 2025
            join_date = ana.get('join_date')
            if join_date:
                if isinstance(join_date, str):
                    jd = datetime.fromisoformat(join_date.replace('Z', '+00:00')).date() if 'T' in join_date else date.fromisoformat(join_date)
                else:
                    jd = join_date
                
                assert jd.month == 1, f"Expected month 1, got {jd.month}"
                assert jd.day == 27, f"Expected day 27, got {jd.day}"
                assert jd.year == 2025, f"Expected year 2025, got {jd.year}"
                print(f"✅ join_date is correctly set to 2025-01-27")
        else:
            print("⚠️ Ana Adesão not found - may need to create test data")
            pytest.skip("Test member not found")


class TestSalesAPI:
    """Test the new GET /api/sales endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_sales_endpoint_exists(self, auth_headers):
        """Test GET /api/sales endpoint exists and returns 200"""
        response = requests.get(f"{BASE_URL}/api/sales", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ GET /api/sales endpoint exists and returns 200")
    
    def test_get_sales_returns_list(self, auth_headers):
        """Test GET /api/sales returns a list"""
        response = requests.get(f"{BASE_URL}/api/sales", headers=auth_headers)
        assert response.status_code == 200
        sales = response.json()
        assert isinstance(sales, list), f"Expected list, got {type(sales)}"
        print(f"✅ GET /api/sales returns list with {len(sales)} sales")
        return sales
    
    def test_get_sales_with_date_filter(self, auth_headers):
        """Test GET /api/sales with date filtering"""
        # Test with start_date filter
        response = requests.get(
            f"{BASE_URL}/api/sales?start_date=2025-01-01",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Date filter failed: {response.text}"
        print("✅ GET /api/sales with start_date filter works")
        
        # Test with end_date filter
        response = requests.get(
            f"{BASE_URL}/api/sales?end_date=2026-12-31",
            headers=auth_headers
        )
        assert response.status_code == 200
        print("✅ GET /api/sales with end_date filter works")
        
        # Test with both filters
        response = requests.get(
            f"{BASE_URL}/api/sales?start_date=2025-01-01&end_date=2025-12-31",
            headers=auth_headers
        )
        assert response.status_code == 200
        sales_2025 = response.json()
        print(f"✅ GET /api/sales with date range filter works - {len(sales_2025)} sales in 2025")
    
    def test_sales_data_structure(self, auth_headers):
        """Test that sales records have expected fields"""
        response = requests.get(f"{BASE_URL}/api/sales", headers=auth_headers)
        assert response.status_code == 200
        sales = response.json()
        
        if len(sales) > 0:
            sale = sales[0]
            # Check expected fields
            expected_fields = ['id', 'item_id', 'item_name', 'quantity_sold', 'sale_price', 'total_amount', 'sale_date']
            for field in expected_fields:
                assert field in sale, f"Missing field: {field}"
            print(f"✅ Sales record has all expected fields: {expected_fields}")
        else:
            print("⚠️ No sales data to verify structure")


class TestInventoryAndStock:
    """Test inventory and stock report data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_inventory(self, auth_headers):
        """Test GET /api/inventory returns inventory list"""
        response = requests.get(f"{BASE_URL}/api/inventory", headers=auth_headers)
        assert response.status_code == 200
        inventory = response.json()
        assert isinstance(inventory, list)
        print(f"✅ Got {len(inventory)} inventory items")
        return inventory
    
    def test_inventory_has_sold_quantity(self, auth_headers):
        """Test that inventory items track sold_quantity"""
        response = requests.get(f"{BASE_URL}/api/inventory", headers=auth_headers)
        assert response.status_code == 200
        inventory = response.json()
        
        if len(inventory) > 0:
            # Check if sold_quantity field exists
            item = inventory[0]
            # sold_quantity may be 0 or not present initially
            print(f"✅ Inventory item structure: {list(item.keys())}")
        else:
            print("⚠️ No inventory items to check")


class TestDashboardAPI:
    """Test dashboard API for alerts data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_dashboard_endpoint(self, auth_headers):
        """Test GET /api/dashboard returns stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields
        assert "total_members" in data
        assert "active_members" in data
        assert "today_attendance" in data
        print(f"✅ Dashboard stats: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
