#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class QuickVerificationTester:
    def __init__(self, base_url="https://traintrack-23.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.auth_token = None
        self.auth_headers = {'Content-Type': 'application/json'}

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success:
            print(f"   ⚠️  This fix needs attention")

    def test_login(self):
        """Test regular login to get auth token"""
        print("🔐 Authenticating...")
        login_data = {
            "username": "fabio.guerreiro",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, headers={'Content-Type': 'application/json'}, timeout=30)
            print(f"   Login Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                self.auth_token = response_data['access_token']
                self.auth_headers['Authorization'] = f'Bearer {self.auth_token}'
                print(f"   ✅ Authentication successful")
                return True
            else:
                print(f"   ❌ Login failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Login error: {str(e)}")
            return False

    def test_premium_dashboard_analytics(self):
        """Test Premium Dashboard Analytics - MongoDB date serialization fix"""
        print("\n1️⃣ Testing Premium Dashboard Analytics (MongoDB date serialization fix)")
        
        try:
            response = requests.get(f"{self.api_url}/dashboard", headers=self.auth_headers, timeout=30)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"   Response Keys: {list(response_data.keys())}")
                
                # Check for basic dashboard data
                has_basic_data = all(key in response_data for key in ['total_members', 'active_members', 'today_attendance'])
                
                # Check for premium analytics section
                has_premium_analytics = 'premium_analytics' in response_data
                
                if has_basic_data and has_premium_analytics:
                    premium_data = response_data['premium_analytics']
                    print(f"   Premium Analytics Keys: {list(premium_data.keys())}")
                    
                    # Check if date serialization is working (no MongoDB errors)
                    if 'generated_at' in premium_data:
                        print(f"   Generated At: {premium_data['generated_at']}")
                    
                    self.log_result("Premium Dashboard Analytics", True, "MongoDB date serialization working, premium analytics present")
                    return True
                else:
                    missing = []
                    if not has_basic_data:
                        missing.append("basic dashboard data")
                    if not has_premium_analytics:
                        missing.append("premium_analytics section")
                    
                    self.log_result("Premium Dashboard Analytics", False, f"Missing: {', '.join(missing)}")
                    return False
                    
            elif response.status_code == 500:
                try:
                    error_data = response.json()
                    error_detail = error_data.get('detail', 'Unknown error')
                    print(f"   Server Error: {error_detail}")
                    
                    # Check if it's the MongoDB date serialization error
                    if 'datetime.date' in error_detail or 'cannot encode object' in error_detail:
                        self.log_result("Premium Dashboard Analytics", False, "MongoDB date serialization error still present")
                    else:
                        self.log_result("Premium Dashboard Analytics", False, f"Server error: {error_detail}")
                except:
                    self.log_result("Premium Dashboard Analytics", False, f"Server error (status 500): {response.text[:200]}")
                return False
            else:
                self.log_result("Premium Dashboard Analytics", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Premium Dashboard Analytics", False, f"Request failed: {str(e)}")
            return False

    def test_premium_login(self):
        """Test Premium Login - password field fix"""
        print("\n2️⃣ Testing Premium Login (password field fix)")
        
        login_data = {
            "username": "fabio.guerreiro",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login-premium", json=login_data, headers={'Content-Type': 'application/json'}, timeout=30)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"   Response Keys: {list(response_data.keys())}")
                
                # Check for access token (basic login functionality)
                if 'access_token' in response_data:
                    print(f"   Access Token: Present (length: {len(response_data['access_token'])})")
                    
                    # Check for enhanced security features
                    enhanced_features = []
                    if 'security_log_id' in response_data:
                        enhanced_features.append("security_log_id")
                    if 'login_timestamp' in response_data:
                        enhanced_features.append("login_timestamp")
                    if 'user' in response_data:
                        enhanced_features.append("user_data")
                    
                    if enhanced_features:
                        print(f"   Enhanced Features: {', '.join(enhanced_features)}")
                    
                    self.log_result("Premium Login", True, "Password field access working, login successful")
                    return True
                else:
                    self.log_result("Premium Login", False, "No access token in response")
                    return False
                    
            elif response.status_code == 500:
                try:
                    error_data = response.json()
                    error_detail = error_data.get('detail', 'Unknown error')
                    print(f"   Server Error: {error_detail}")
                    
                    # Check if it's the KeyError: 'password' issue
                    if 'KeyError' in error_detail and 'password' in error_detail:
                        self.log_result("Premium Login", False, "KeyError: 'password' - request handling issue still present")
                    else:
                        self.log_result("Premium Login", False, f"Server error: {error_detail}")
                except:
                    error_text = response.text
                    if 'KeyError' in error_text and 'password' in error_text:
                        self.log_result("Premium Login", False, "KeyError: 'password' - request handling issue still present")
                    else:
                        self.log_result("Premium Login", False, f"Server error (status 500): {error_text[:200]}")
                return False
            elif response.status_code == 401:
                self.log_result("Premium Login", False, "Authentication failed - check credentials")
                return False
            else:
                self.log_result("Premium Login", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Premium Login", False, f"Request failed: {str(e)}")
            return False

    def run_quick_verification(self):
        """Run quick verification of the 2 critical fixes"""
        print("🚀 QUICK VERIFICATION TEST - 2 CRITICAL FIXES")
        print("=" * 60)
        print("Testing fixes for:")
        print("1. Premium Dashboard Analytics (MongoDB date serialization)")
        print("2. Premium Login (password field access)")
        print("=" * 60)
        
        # Authenticate first
        if not self.test_login():
            print("\n❌ Authentication failed - cannot proceed with tests")
            return False
        
        # Test the 2 critical fixes
        dashboard_success = self.test_premium_dashboard_analytics()
        login_success = self.test_premium_login()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 QUICK VERIFICATION SUMMARY")
        print("=" * 60)
        
        fixes_tested = [
            ("Premium Dashboard Analytics", dashboard_success),
            ("Premium Login", login_success)
        ]
        
        passed_fixes = sum(1 for _, success in fixes_tested if success)
        total_fixes = len(fixes_tested)
        
        print(f"Critical Fixes Verified: {passed_fixes}/{total_fixes}")
        
        for fix_name, success in fixes_tested:
            status = "✅ WORKING" if success else "❌ STILL FAILING"
            print(f"  {fix_name}: {status}")
        
        if passed_fixes == total_fixes:
            print("\n🎉 ALL CRITICAL FIXES ARE WORKING!")
            print("✅ Ready to continue implementing more premium features")
        else:
            print(f"\n⚠️  {total_fixes - passed_fixes} CRITICAL FIX(ES) STILL FAILING")
            print("❌ Requires additional attention before proceeding")
        
        return passed_fixes == total_fixes

def main():
    """Main test execution"""
    tester = QuickVerificationTester()
    
    try:
        success = tester.run_quick_verification()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())