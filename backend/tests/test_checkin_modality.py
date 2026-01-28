"""
Test cases for Check-in Modality and Attendance Delete functionality
Tests the following bug fixes:
1. PT - Treino Personalizado appears in modality dropdown
2. Check-in uses selected modality (not member's default)
3. Delete attendance functionality works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestActivities:
    """Test activities/modalities endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_pt_modality_exists(self):
        """Test that PT - Treino Personalizado exists in activities list"""
        response = requests.get(f"{BASE_URL}/api/activities", headers=self.headers)
        assert response.status_code == 200
        
        activities = response.json()
        pt_activities = [a for a in activities if 'PT' in a['name']]
        
        assert len(pt_activities) > 0, "PT modality not found in activities list"
        assert pt_activities[0]['name'] == 'PT - Treino Personalizado'
        assert pt_activities[0]['is_active'] == True
        print(f"✅ PT modality found: {pt_activities[0]['name']}")


class TestCheckinWithModality:
    """Test check-in with selected modality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get PT activity ID
        activities_response = requests.get(f"{BASE_URL}/api/activities", headers=self.headers)
        activities = activities_response.json()
        pt_activities = [a for a in activities if 'PT' in a['name']]
        self.pt_activity_id = pt_activities[0]['id'] if pt_activities else None
        
        # Get a member ID
        members_response = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        members = members_response.json()
        self.member_id = members[0]['id'] if members else None
        self.member_name = members[0]['name'] if members else None
    
    def test_checkin_with_pt_modality(self):
        """Test that check-in uses the selected PT modality"""
        assert self.pt_activity_id, "PT activity not found"
        assert self.member_id, "No member found"
        
        # Create attendance with PT modality
        response = requests.post(f"{BASE_URL}/api/attendance", 
            headers=self.headers,
            json={
                "member_id": self.member_id,
                "activity_id": self.pt_activity_id,
                "method": "manual"
            }
        )
        
        assert response.status_code == 200, f"Check-in failed: {response.text}"
        
        attendance = response.json()
        assert attendance['activity_id'] == self.pt_activity_id, "Activity ID mismatch"
        assert attendance['member_id'] == self.member_id, "Member ID mismatch"
        
        print(f"✅ Check-in created with PT modality for {self.member_name}")
        
        # Store attendance ID for cleanup
        self.attendance_id = attendance['id']
        
        # Cleanup - delete the attendance
        delete_response = requests.delete(
            f"{BASE_URL}/api/attendance/{self.attendance_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200


class TestDeleteAttendance:
    """Test delete attendance functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "fabio.guerreiro",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get activity and member IDs
        activities_response = requests.get(f"{BASE_URL}/api/activities", headers=self.headers)
        activities = activities_response.json()
        self.activity_id = activities[0]['id'] if activities else None
        
        members_response = requests.get(f"{BASE_URL}/api/members", headers=self.headers)
        members = members_response.json()
        self.member_id = members[0]['id'] if members else None
    
    def test_delete_attendance(self):
        """Test that attendance can be deleted"""
        assert self.activity_id, "No activity found"
        assert self.member_id, "No member found"
        
        # Create attendance first
        create_response = requests.post(f"{BASE_URL}/api/attendance",
            headers=self.headers,
            json={
                "member_id": self.member_id,
                "activity_id": self.activity_id,
                "method": "manual"
            }
        )
        assert create_response.status_code == 200
        attendance_id = create_response.json()['id']
        print(f"✅ Attendance created with ID: {attendance_id}")
        
        # Delete attendance
        delete_response = requests.delete(
            f"{BASE_URL}/api/attendance/{attendance_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        assert delete_response.json()['message'] == "Attendance deleted successfully"
        print(f"✅ Attendance deleted successfully")
        
        # Verify attendance is deleted (should return 404)
        get_response = requests.get(
            f"{BASE_URL}/api/attendance?member_id={self.member_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        attendances = get_response.json()
        deleted_attendance = [a for a in attendances if a['id'] == attendance_id]
        assert len(deleted_attendance) == 0, "Attendance was not deleted"
        print(f"✅ Verified attendance no longer exists")
    
    def test_delete_nonexistent_attendance(self):
        """Test that deleting non-existent attendance returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.delete(
            f"{BASE_URL}/api/attendance/{fake_id}",
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"✅ Correctly returns 404 for non-existent attendance")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
