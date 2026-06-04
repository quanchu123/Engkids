# -*- coding: utf-8 -*-
"""
COMPREHENSIVE UPLOAD TEST
- Auto starts server in subprocess
- Tests all endpoints
- Detects specific errors
- Provides fix suggestions
"""

import subprocess
import sys
import os
import time
import json

# Ensure UTF-8 output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    import requests
except ImportError:
    print("Installing requests...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
    import requests

PORT = 3000
BASE_URL = f"http://localhost:{PORT}"
server_process = None
test_results = {"passed": 0, "failed": 0, "errors": []}

def start_server():
    """Start Next.js server"""
    global server_process
    print("\n[1/4] Starting server...")
    
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    try:
        if sys.platform == 'win32':
            server_process = subprocess.Popen(
                "npm start",
                cwd=project_dir,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        else:
            server_process = subprocess.Popen(
                ["npm", "start"],
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        
        print("   Waiting for server...")
        for i in range(40):
            time.sleep(0.5)
            try:
                r = requests.get(f"{BASE_URL}/api/videos", timeout=2)
                if r.status_code in [200, 401, 404]:
                    print(f"   Server ready on port {PORT}")
                    return True
            except:
                if i % 10 == 9:
                    print(f"   Still waiting... {i+1}/40")
        
        print("   ERROR: Server timeout")
        return False
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def stop_server():
    """Stop server"""
    global server_process
    if server_process:
        try:
            if sys.platform == 'win32':
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(server_process.pid)],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                server_process.terminate()
        except:
            pass

def test(name, method, path, expected_status, data=None):
    """Run a test"""
    global test_results
    try:
        url = f"{BASE_URL}{path}"
        if method == "GET":
            r = requests.get(url, timeout=10)
        elif method == "POST":
            r = requests.post(url, json=data, timeout=10)
        elif method == "PATCH":
            r = requests.patch(url, json=data, timeout=10)
        else:
            r = requests.delete(url, timeout=10)
        
        if r.status_code == expected_status:
            test_results["passed"] += 1
            print(f"   PASS {name} [{r.status_code}]")
            return True, r
        else:
            test_results["failed"] += 1
            test_results["errors"].append(f"{name}: Expected {expected_status}, got {r.status_code}")
            print(f"   FAIL {name} [Expected {expected_status}, got {r.status_code}]")
            return False, r
    except Exception as e:
        test_results["failed"] += 1
        test_results["errors"].append(f"{name}: {str(e)}")
        print(f"   ERROR {name}: {e}")
        return False, None

def main():
    print("="*70)
    print("COMPREHENSIVE UPLOAD TEST")
    print("="*70)
    
    # Start server
    if not start_server():
        print("\nFAILED: Could not start server")
        print("\nFIX:")
        print("  1. Check if 'npm run build' completed successfully")
        print("  2. Check .env.local file exists with Supabase credentials")
        print("  3. Run manually: npm start")
        return 1
    
    try:
        # Test 2: Public endpoints
        print("\n[2/4] Testing public endpoints...")
        test("GET /", "GET", "/", 200)
        test("GET /api/videos", "GET", "/api/videos", 200)
        test("GET /videos", "GET", "/videos", 200)
        test("GET /admin", "GET", "/admin", 200)
        
        # Test 3: Protected endpoints (should return 401)
        print("\n[3/4] Testing authentication...")
        passed, r = test("POST /api/videos (no auth)", "POST", "/api/videos",
                         401, {"title": "Test", "titleVi": "Test"})
        
        if not passed and r and r.status_code == 200:
            print("\n   WARNING: Endpoint accepts requests without auth!")
            test_results["errors"].append("SECURITY: /api/videos accepts unauthenticated requests")
        
        # Test 4: API structure
        print("\n[4/4] Testing API responses...")
        try:
            r = requests.get(f"{BASE_URL}/api/videos", timeout=10)
            data = r.json()
            if "videos" in data and isinstance(data["videos"], list):
                test_results["passed"] += 1
                print(f"   PASS API structure (found {len(data['videos'])} videos)")
            else:
                test_results["failed"] += 1
                print(f"   FAIL API structure: missing 'videos' array")
                test_results["errors"].append("API response missing 'videos' array")
        except Exception as e:
            test_results["failed"] += 1
            print(f"   ERROR API structure: {e}")
        
        # Summary
        print("\n" + "="*70)
        print("RESULTS")
        print("="*70)
        total = test_results["passed"] + test_results["failed"]
        print(f"\nPassed: {test_results['passed']}/{total}")
        print(f"Failed: {test_results['failed']}/{total}")
        
        if test_results["errors"]:
            print("\nERRORS:")
            for err in test_results["errors"]:
                print(f"  - {err}")
        
        # Manual test instructions
        print("\n" + "="*70)
        print("MANUAL TEST REQUIRED")
        print("="*70)
        print("\n1. Open http://localhost:3000 in browser")
        print("2. Login with Google (admin@comiclingua.com)")
        print("3. Go to: Admin -> Videos -> Add New Video")
        print("4. Fill form and upload a video file")
        print("\nEXPECTED BROWSER CONSOLE LOGS:")
        print("  - '🔑 Using Supabase access token for API request'")
        print("\nEXPECTED SERVER LOGS:")
        print("  - '🔐 Supabase JWT verification: admin@comiclingua.com'")
        print("  - '🔐 isAdminEmail result: true'")
        print("  - '📹 Creating video in Bunny.net...'")
        print("  - '✅ Bunny video created'")
        print("  - 'POST /api/videos 200'")
        
        if test_results["failed"] == 0:
            print("\n" + "="*70)
            print("SUCCESS: All automated tests passed!")
            print("="*70)
            return 0
        else:
            print("\n" + "="*70)
            print(f"FAILED: {test_results['failed']} test(s) failed")
            print("="*70)
            
            # Provide fixes
            print("\nTROUBLESHOOTING:")
            if any("401" in e or "auth" in e.lower() for e in test_results["errors"]):
                print("\n  AUTH ISSUES:")
                print("    - Check src/config/admin.ts: isAdminEmail() returns true")
                print("    - Check src/services/api.ts: Gets Supabase token")
                print("    - Check src/app/api/videos/route.ts: Verifies JWT")
            
            if any("structure" in e.lower() or "videos" in e.lower() for e in test_results["errors"]):
                print("\n  API STRUCTURE ISSUES:")
                print("    - Check GET /api/videos returns: {videos: []}")
                print("    - Check database connection")
            
            return 1
    
    finally:
        print("\nStopping server...")
        stop_server()
        time.sleep(1)

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        stop_server()
        sys.exit(1)
    except Exception as e:
        print(f"\n\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        stop_server()
        sys.exit(1)
