#!/usr/bin/env python3
"""
Advanced Test Suite for ComicLingua Kids
==========================================
Tests: Authentication, API Logic, Performance, Edge Cases, Concurrent Requests
"""

import subprocess
import time
import json
import sys
import os
import threading
import statistics
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from concurrent.futures import ThreadPoolExecutor, as_completed
import random
import string

BASE_URL = "http://localhost:3000"
TIMEOUT = 10

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.details = []
        self.benchmarks = {}
    
    def add_pass(self, name, detail=""):
        self.passed += 1
        self.details.append(("pass", name, detail))
    
    def add_fail(self, name, reason=""):
        self.failed += 1
        self.details.append(("fail", name, reason))
    
    def add_warning(self, name, reason=""):
        self.warnings += 1
        self.details.append(("warn", name, reason))
    
    def add_benchmark(self, name, times):
        self.benchmarks[name] = {
            'min': min(times),
            'max': max(times),
            'avg': statistics.mean(times),
            'median': statistics.median(times),
            'p95': sorted(times)[int(len(times) * 0.95)] if len(times) >= 20 else max(times),
            'count': len(times)
        }

results = TestResult()

def http_request(method, path, data=None, headers=None, timeout=TIMEOUT):
    """Make HTTP request and return (status_code, response_body, elapsed_ms)"""
    url = BASE_URL + path
    req_headers = headers or {}
    
    if data and isinstance(data, dict):
        data = json.dumps(data).encode('utf-8')
        req_headers['Content-Type'] = 'application/json'
    
    req = Request(url, data=data, headers=req_headers, method=method)
    
    start = time.time()
    try:
        with urlopen(req, timeout=timeout) as response:
            body = response.read().decode('utf-8')
            elapsed = (time.time() - start) * 1000
            return response.status, body, elapsed
    except HTTPError as e:
        elapsed = (time.time() - start) * 1000
        body = e.read().decode('utf-8') if e.fp else ""
        return e.code, body, elapsed
    except URLError as e:
        return None, str(e.reason), 0
    except Exception as e:
        return None, str(e), 0

def wait_for_server(max_wait=30):
    """Wait for server to be ready"""
    print(Colors.CYAN + "Waiting for server..." + Colors.RESET)
    for i in range(max_wait):
        try:
            status, _, _ = http_request("GET", "/")
            if status == 200:
                print(Colors.GREEN + "Server ready" + Colors.RESET)
                return True
        except:
            pass
        time.sleep(1)
    return False

# =============================================================================
# TEST SUITES
# =============================================================================

def test_basic_routes():
    """Test basic route availability"""
    print("\n" + Colors.BOLD + "[1] BASIC ROUTES" + Colors.RESET)
    
    routes = [
        ("GET", "/", 200, "Home page"),
        ("GET", "/videos", 200, "Videos list"),
        ("GET", "/stories", 200, "Stories list"),
        ("GET", "/login", 200, "Login page"),
        ("GET", "/admin", 200, "Admin page"),
        ("GET", "/admin/videos", 200, "Admin videos"),
        ("GET", "/admin/videos/new", 200, "New video form"),
        ("GET", "/progress", 200, "Progress page"),
    ]
    
    for method, path, expected, name in routes:
        status, body, elapsed = http_request(method, path)
        if status == expected:
            results.add_pass(name, str(int(elapsed)) + "ms")
        else:
            results.add_fail(name, "Expected " + str(expected) + ", got " + str(status))

def test_api_endpoints():
    """Test API endpoint responses"""
    print("\n" + Colors.BOLD + "[2] API ENDPOINTS" + Colors.RESET)
    
    # GET /api/videos - should return JSON with videos array
    status, body, _ = http_request("GET", "/api/videos")
    if status == 200:
        try:
            data = json.loads(body)
            if 'videos' in data and isinstance(data['videos'], list):
                results.add_pass("GET /api/videos structure", str(len(data['videos'])) + " videos")
            else:
                results.add_fail("GET /api/videos structure", "Missing videos array")
        except json.JSONDecodeError:
            results.add_fail("GET /api/videos JSON", "Invalid JSON response")
    else:
        results.add_fail("GET /api/videos", "Status " + str(status))

def test_auth_protection():
    """Test authentication protection on protected routes"""
    print("\n" + Colors.BOLD + "[3] AUTH PROTECTION" + Colors.RESET)
    
    protected_endpoints = [
        ("POST", "/api/videos", {"title": "test"}, "Create video"),
        ("PATCH", "/api/videos/test-id", {"title": "test"}, "Update video"),
        ("DELETE", "/api/videos/test-id", None, "Delete video"),
        ("PUT", "/api/videos/upload?videoId=test", b"test", "Upload video"),
        ("PUT", "/api/videos/test-id/subtitles", {"subtitles": []}, "Update subtitles"),
    ]
    
    for method, path, data, name in protected_endpoints:
        status, body, _ = http_request(method, path, data)
        if status == 401:
            results.add_pass(name + " requires auth")
        elif status == 404:
            results.add_warning(name, "404 - route may not exist")
        else:
            results.add_fail(name + " auth protection", "Expected 401, got " + str(status))

def test_invalid_tokens():
    """Test with various invalid authentication tokens"""
    print("\n" + Colors.BOLD + "[4] INVALID TOKEN HANDLING" + Colors.RESET)
    
    invalid_tokens = [
        ("empty", ""),
        ("random", "random-invalid-token-12345"),
        ("malformed_jwt", "eyJ.invalid.token"),
        ("expired_format", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid"),
        ("sql_injection", "'; DROP TABLE users; --"),
        ("xss_attempt", "<script>alert('xss')</script>"),
        ("unicode", "token_unicode_test"),
        ("very_long", "x" * 5000),
    ]
    
    for name, token in invalid_tokens:
        headers = {"Authorization": "Bearer " + token} if token else {}
        status, body, _ = http_request("POST", "/api/videos", {"title": "test"}, headers)
        if status == 401:
            results.add_pass("Rejects " + name + " token")
        else:
            results.add_fail("Rejects " + name + " token", "Got " + str(status))

def test_input_validation():
    """Test input validation and edge cases"""
    print("\n" + Colors.BOLD + "[5] INPUT VALIDATION" + Colors.RESET)
    
    # Test case: (name, method, path, data, expected_statuses_list)
    cases = []
    cases.append(("Empty body", "POST", "/api/videos", None, [401, 400]))
    cases.append(("Non-JSON", "POST", "/api/videos", b"not json", [401, 400]))
    cases.append(("Invalid video ID", "GET", "/api/videos/invalid-chars", None, [404, 400]))
    cases.append(("UUID format", "GET", "/api/videos/00000000-0000-0000-0000-000000000000", None, [404]))
    cases.append(("Long ID", "GET", "/api/videos/" + "a" * 500, None, [404, 414]))
    cases.append(("Empty upload", "PUT", "/api/videos/upload?videoId=test", b"", [401, 400]))
    
    for case in cases:
        name = case[0]
        method = case[1]
        path = case[2]
        data = case[3]
        expected_list = case[4]
        
        status, body, _ = http_request(method, path, data)
        if status in expected_list:
            results.add_pass(name)
        else:
            results.add_warning(name, "Expected " + str(expected_list) + ", got " + str(status))

def test_response_headers():
    """Test security headers"""
    print("\n" + Colors.BOLD + "[6] SECURITY HEADERS" + Colors.RESET)
    
    url = BASE_URL + "/"
    req = Request(url)
    
    try:
        with urlopen(req, timeout=TIMEOUT) as response:
            headers = dict(response.headers)
            
            # Check Content-Type
            ct = headers.get("Content-Type", "")
            if "text/html" in ct:
                results.add_pass("Content-Type header")
            else:
                results.add_warning("Content-Type header", "Got: " + ct)
    except Exception as e:
        results.add_fail("Security headers check", str(e))

def test_concurrent_requests():
    """Test server under concurrent load"""
    print("\n" + Colors.BOLD + "[7] CONCURRENT REQUESTS" + Colors.RESET)
    
    def make_request(path):
        start = time.time()
        status, _, _ = http_request("GET", path, timeout=30)
        elapsed = (time.time() - start) * 1000
        return status, elapsed
    
    # Test concurrent GET requests
    num_requests = 50
    paths = ["/", "/api/videos", "/videos", "/stories"]
    
    response_times = []
    errors = 0
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for _ in range(num_requests):
            path = random.choice(paths)
            futures.append(executor.submit(make_request, path))
        
        for future in as_completed(futures):
            status, elapsed = future.result()
            if status == 200:
                response_times.append(elapsed)
            else:
                errors += 1
    
    if response_times:
        results.add_benchmark("concurrent_requests", response_times)
        avg_time = statistics.mean(response_times)
        error_rate = errors / num_requests * 100
        
        if avg_time < 500 and error_rate < 5:
            results.add_pass("Concurrent load (" + str(num_requests) + " requests)", "avg " + str(int(avg_time)) + "ms, " + str(round(error_rate, 1)) + "% errors")
        elif avg_time < 1000 and error_rate < 10:
            results.add_warning("Concurrent load", "avg " + str(int(avg_time)) + "ms, " + str(round(error_rate, 1)) + "% errors")
        else:
            results.add_fail("Concurrent load", "avg " + str(int(avg_time)) + "ms, " + str(round(error_rate, 1)) + "% errors")
    else:
        results.add_fail("Concurrent load", "No successful responses")

def test_api_response_times():
    """Benchmark API response times"""
    print("\n" + Colors.BOLD + "[8] RESPONSE TIME BENCHMARK" + Colors.RESET)
    
    endpoints = [
        ("GET", "/", "Home"),
        ("GET", "/api/videos", "API Videos"),
        ("GET", "/videos", "Videos Page"),
        ("GET", "/admin", "Admin"),
    ]
    
    for method, path, name in endpoints:
        times = []
        for _ in range(10):
            status, _, elapsed = http_request(method, path)
            if status == 200:
                times.append(elapsed)
            time.sleep(0.05)
        
        if times:
            results.add_benchmark("response_" + name.lower().replace(" ", "_"), times)
            avg = statistics.mean(times)
            if avg < 200:
                results.add_pass(name + " response time", "avg " + str(int(avg)) + "ms")
            elif avg < 500:
                results.add_warning(name + " response time", "avg " + str(int(avg)) + "ms (slow)")
            else:
                results.add_fail(name + " response time", "avg " + str(int(avg)) + "ms (too slow)")

def test_error_handling():
    """Test error handling and edge cases"""
    print("\n" + Colors.BOLD + "[9] ERROR HANDLING" + Colors.RESET)
    
    cases = []
    cases.append(("GET", "/nonexistent-page-12345", [404], "404 for missing page"))
    cases.append(("GET", "/api/nonexistent", [404], "404 for missing API"))
    cases.append(("POST", "/api/videos", [401], "401 without auth"))
    
    for case in cases:
        method = case[0]
        path = case[1]
        expected = case[2]
        name = case[3]
        
        status, body, _ = http_request(method, path)
        if status in expected:
            results.add_pass(name)
        else:
            results.add_fail(name, "Expected " + str(expected) + ", got " + str(status))

def test_json_api_format():
    """Test JSON API response format consistency"""
    print("\n" + Colors.BOLD + "[10] API FORMAT CONSISTENCY" + Colors.RESET)
    
    # Test error responses have consistent format
    status, body, _ = http_request("POST", "/api/videos", {"title": "test"})
    if status == 401:
        try:
            data = json.loads(body)
            if 'error' in data:
                results.add_pass("Error response has 'error' field")
            else:
                results.add_warning("Error response format", "Missing 'error' field")
        except json.JSONDecodeError:
            results.add_fail("Error response JSON", "Invalid JSON")
    
    # Test success responses
    status, body, _ = http_request("GET", "/api/videos")
    if status == 200:
        try:
            data = json.loads(body)
            if isinstance(data, dict):
                results.add_pass("Success response is object")
            else:
                results.add_fail("Success response format", "Expected object")
        except json.JSONDecodeError:
            results.add_fail("Success response JSON", "Invalid JSON")

def test_rate_limiting_behavior():
    """Test behavior under rapid requests (potential rate limiting)"""
    print("\n" + Colors.BOLD + "[11] RAPID REQUESTS" + Colors.RESET)
    
    # Make rapid requests to same endpoint
    statuses = []
    times = []
    
    for _ in range(20):
        status, _, elapsed = http_request("GET", "/api/videos")
        statuses.append(status)
        times.append(elapsed)
    
    success_count = statuses.count(200)
    rate_limited = statuses.count(429)
    
    if success_count == 20:
        results.add_pass("No rate limiting on read endpoints", "20/20 success")
    elif rate_limited > 0:
        results.add_warning("Rate limiting detected", str(rate_limited) + "/20 blocked")
    else:
        error_count = 20 - success_count
        results.add_fail("Rapid requests", str(error_count) + "/20 failed")

def test_special_characters():
    """Test handling of special characters in requests"""
    print("\n" + Colors.BOLD + "[12] SPECIAL CHARACTER HANDLING" + Colors.RESET)
    
    special_ids = [
        ("spaces", "test%20video"),
        ("url_encoded", "%2F%2E%2E%2F"),
        ("html_entities", "%26lt%3Bscript%26gt%3B"),
    ]
    
    for name, id_value in special_ids:
        status, _, _ = http_request("GET", "/api/videos/" + id_value)
        # Should get 404 (not found) not 500 (server error)
        if status in [404, 400]:
            results.add_pass("Handles " + name + " ID safely")
        elif status == 500:
            results.add_fail("Handles " + name + " ID", "Server error")
        else:
            results.add_warning("Handles " + name + " ID", "Status " + str(status))

# =============================================================================
# MAIN
# =============================================================================

def print_summary():
    """Print test summary"""
    print("\n" + "=" * 70)
    print(Colors.BOLD + "TEST RESULTS" + Colors.RESET)
    print("=" * 70)
    
    for detail in results.details:
        dtype = detail[0]
        name = detail[1]
        info = detail[2] if len(detail) > 2 else ""
        
        if dtype == "pass":
            line = Colors.GREEN + "PASS " + name
            if info:
                line += " (" + info + ")"
            print(line + Colors.RESET)
        elif dtype == "fail":
            line = Colors.RED + "FAIL " + name
            if info:
                line += ": " + info
            print(line + Colors.RESET)
        else:
            line = Colors.YELLOW + "WARN " + name
            if info:
                line += ": " + info
            print(line + Colors.RESET)
    
    print("\n" + "=" * 70)
    print(Colors.BOLD + "BENCHMARKS" + Colors.RESET)
    print("=" * 70)
    
    for name, stats in results.benchmarks.items():
        print("\n" + Colors.CYAN + name + ":" + Colors.RESET)
        print("  Min: " + str(int(stats['min'])) + "ms | Max: " + str(int(stats['max'])) + "ms | Avg: " + str(int(stats['avg'])) + "ms")
        print("  Median: " + str(int(stats['median'])) + "ms | P95: " + str(int(stats['p95'])) + "ms | Count: " + str(stats['count']))
    
    print("\n" + "=" * 70)
    print(Colors.BOLD + "SUMMARY" + Colors.RESET)
    print("=" * 70)
    
    total = results.passed + results.failed + results.warnings
    print(Colors.GREEN + "Passed:   " + str(results.passed) + "/" + str(total) + Colors.RESET)
    print(Colors.RED + "Failed:   " + str(results.failed) + "/" + str(total) + Colors.RESET)
    print(Colors.YELLOW + "Warnings: " + str(results.warnings) + "/" + str(total) + Colors.RESET)
    
    if results.failed == 0:
        print("\n" + Colors.GREEN + Colors.BOLD + "ALL TESTS PASSED!" + Colors.RESET)
        return 0
    else:
        print("\n" + Colors.RED + Colors.BOLD + str(results.failed) + " TEST(S) FAILED" + Colors.RESET)
        return 1

def main():
    print(Colors.BOLD + "=" * 70)
    print("COMICLINGUA KIDS - ADVANCED TEST SUITE")
    print("=" * 70 + Colors.RESET)
    
    # Check if server is already running, if not start it
    print("\n" + Colors.CYAN + "Checking server..." + Colors.RESET)
    
    server = None
    try:
        status, _, _ = http_request("GET", "/", timeout=3)
        if status == 200:
            print(Colors.GREEN + "Server already running on port 3000" + Colors.RESET)
        else:
            raise Exception("Server not responding")
    except:
        print(Colors.CYAN + "Starting development server..." + Colors.RESET)
        server = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            shell=True
        )
        if not wait_for_server():
            print(Colors.RED + "Server failed to start" + Colors.RESET)
            return 1
    
    try:
        # Run all test suites
        test_basic_routes()
        test_api_endpoints()
        test_auth_protection()
        test_invalid_tokens()
        test_input_validation()
        test_response_headers()
        test_concurrent_requests()
        test_api_response_times()
        test_error_handling()
        test_json_api_format()
        test_rate_limiting_behavior()
        test_special_characters()
        
        return print_summary()
        
    finally:
        if server:
            print("\n" + Colors.CYAN + "Stopping server..." + Colors.RESET)
            server.terminate()
            try:
                server.wait(timeout=5)
            except:
                server.kill()

if __name__ == "__main__":
    sys.exit(main())
