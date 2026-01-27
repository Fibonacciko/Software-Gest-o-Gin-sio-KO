"""
Backend API Tests for Gym Management System - Payment Functionality
Tests POST /api/payments endpoint and member status update after payment
"""
import pytest
import requests
import os
from datetime import date

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPaymentAPI:
    """Payment endpoint tests for membership registration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token for all tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    def test_health_check(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ API Health Check: {data['message']}")
    
    def test_get_members(self):
        """Test GET /api/members returns list of members"""
        response = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        assert len(members) > 0
        print(f"✅ GET /api/members: Found {len(members)} members")
        return members
    
    def test_create_membership_payment(self):
        """Test POST /api/payments creates a membership payment"""
        # First get a member
        members_response = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        members = members_response.json()
        assert len(members) > 0, "No members found to test payment"
        
        member = members[0]
        member_id = member["id"]
        
        # Create payment with membership method
        payment_data = {
            "member_id": member_id,
            "amount": 45.00,
            "payment_method": "membership",
            "description": f"TEST_Mensalidade {member['name']}",
            "payment_date": date.today().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/payments", 
                                json=payment_data, 
                                headers=self.headers)
        
        assert response.status_code == 200, f"Payment creation failed: {response.text}"
        payment = response.json()
        
        # Verify payment data
        assert payment["member_id"] == member_id
        assert payment["amount"] == 45.00
        assert payment["payment_method"] == "membership"
        assert payment["status"] == "paid"
        assert "id" in payment
        
        print(f"✅ POST /api/payments: Created payment {payment['id']} for {member['name']}")
        return payment
    
    def test_member_status_updated_after_payment(self):
        """Test that member status is updated to 'active' after membership payment"""
        # Get members
        members_response = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        members = members_response.json()
        
        # Find a member (preferably one that might be inactive)
        member = members[0]
        member_id = member["id"]
        
        # Create a membership payment for current month
        payment_data = {
            "member_id": member_id,
            "amount": 50.00,
            "payment_method": "membership",
            "description": f"TEST_Status update test",
            "payment_date": date.today().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/payments", 
                                json=payment_data, 
                                headers=self.headers)
        assert response.status_code == 200
        
        # Verify member status is now active
        member_response = requests.get(f"{BASE_URL}/api/members/{member_id}", 
                                       headers=self.headers)
        assert member_response.status_code == 200
        updated_member = member_response.json()
        
        assert updated_member["status"] == "active", f"Member status should be 'active', got '{updated_member['status']}'"
        print(f"✅ Member status updated to 'active' after payment")
    
    def test_payment_with_extra_status_field(self):
        """Test that payment works even with extra 'status' field (frontend sends this)"""
        members_response = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        members = members_response.json()
        member = members[0]
        
        # Frontend sends 'status' field which is not in PaymentCreate model
        # Pydantic should ignore extra fields by default
        payment_data = {
            "member_id": member["id"],
            "amount": 30.00,
            "payment_method": "membership",
            "description": "TEST_Payment with extra status field",
            "payment_date": date.today().isoformat(),
            "status": "paid"  # Extra field sent by frontend
        }
        
        response = requests.post(f"{BASE_URL}/api/payments", 
                                json=payment_data, 
                                headers=self.headers)
        
        assert response.status_code == 200, f"Payment with extra field failed: {response.text}"
        payment = response.json()
        assert payment["status"] == "paid"
        print(f"✅ Payment with extra 'status' field works correctly")
    
    def test_get_payments(self):
        """Test GET /api/payments returns list of payments"""
        response = requests.get(f"{BASE_URL}/api/payments", headers=self.headers)
        assert response.status_code == 200
        payments = response.json()
        assert isinstance(payments, list)
        print(f"✅ GET /api/payments: Found {len(payments)} payments")
    
    def test_payment_different_methods(self):
        """Test payments with different payment methods"""
        members_response = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        members = members_response.json()
        member = members[0]
        
        payment_methods = ["cash", "card", "transfer", "mbway"]
        
        for method in payment_methods:
            payment_data = {
                "member_id": member["id"],
                "amount": 25.00,
                "payment_method": method,
                "description": f"TEST_Payment via {method}",
                "payment_date": date.today().isoformat()
            }
            
            response = requests.post(f"{BASE_URL}/api/payments", 
                                    json=payment_data, 
                                    headers=self.headers)
            
            assert response.status_code == 200, f"Payment with {method} failed: {response.text}"
            print(f"✅ Payment with method '{method}' works correctly")


class TestMemberStatusCalculation:
    """Tests for member status calculation based on payments"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_member_status_active_with_current_month_payment(self):
        """Member should be active if they have a payment in current month"""
        # Get a member
        members_response = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        members = members_response.json()
        member = members[0]
        
        # Create payment for current month
        payment_data = {
            "member_id": member["id"],
            "amount": 40.00,
            "payment_method": "membership",
            "description": "TEST_Current month payment",
            "payment_date": date.today().isoformat()
        }
        
        requests.post(f"{BASE_URL}/api/payments", json=payment_data, headers=self.headers)
        
        # Check member status
        member_response = requests.get(f"{BASE_URL}/api/members/{member['id']}", 
                                       headers=self.headers)
        updated_member = member_response.json()
        
        assert updated_member["status"] == "active"
        print(f"✅ Member is 'active' with current month payment")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
