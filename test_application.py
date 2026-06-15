#!/usr/bin/env python3
"""
Nova Learn — Automated Integration Test Suite
Verifies static files, HTML DOM structures, CSS variables, and runs
integration API tests against a background instance of the backend server.
"""

import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.error
from html.parser import HTMLParser

TEST_PORT = 8001
BASE_URL = f"http://localhost:{TEST_PORT}"

# Simple HTML parser to verify key DOM elements
class StudyBuddyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.found_ids = set()
        self.found_classes = set()

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if "id" in attrs_dict:
            self.found_ids.add(attrs_dict["id"])
        if "class" in attrs_dict:
            for cls in attrs_dict["class"].split():
                self.found_classes.add(cls)

def run_tests():
    print("\n==================================================")
    print("🎓 Nova Learn — Starting Application Test Suite")
    print("==================================================\n")

    results = []

    # ----------------------------------------------------
    # Test Case 1: Workspace File Check
    # ----------------------------------------------------
    print("Test Case 1: Checking Workspace File Integrity...")
    required_files = ["index.html", "style.css", "app.js", "server.py", "logo.png"]
    files_ok = True
    for f in required_files:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f)
        exists = os.path.exists(path)
        print(f"  - {f:<12}: {'[FOUND]' if exists else '[MISSING]'}")
        if not exists:
            files_ok = False
    
    results.append(("Workspace Files Exist", files_ok))
    print()

    # ----------------------------------------------------
    # Test Case 2: HTML DOM Structure Check
    # ----------------------------------------------------
    print("Test Case 2: Checking HTML DOM Structure...")
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    html_ok = False
    if os.path.exists(html_path):
        try:
            with open(html_path, "r", encoding="utf-8") as f:
                content = f.read()
            parser = StudyBuddyHTMLParser()
            parser.feed(content)

            critical_elements = [
                ("app-loader", "App loader transition overlay"),
                ("settings-overlay", "AI Settings modal overlay"),
                ("quiz-skeleton", "Quiz loading skeleton container"),
                ("quiz-area", "Quiz container"),
                ("quiz-options", "Quiz multiple-choice options wrapper"),
                ("next-question-btn", "Next question button"),
                ("timer-display", "Pomodoro timer display"),
                ("timer-minutes", "Pomodoro duration input"),
                ("sidebar", "Navigation sidebar"),
                ("theme-toggle", "Dark mode toggler")
            ]

            html_ok = True
            for id_val, desc in critical_elements:
                found = id_val in parser.found_ids
                print(f"  - ID '{id_val:<18}' ({desc}): {'[OK]' if found else '[MISSING]'}")
                if not found:
                    html_ok = False
        except Exception as e:
            print(f"  Error reading index.html: {e}")
            html_ok = False
    
    results.append(("HTML Critical DOM Nodes Present", html_ok))
    print()

    # ----------------------------------------------------
    # Test Case 3: CSS Variables Declaration Check
    # ----------------------------------------------------
    print("Test Case 3: Checking CSS variables declaration...")
    css_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "style.css")
    css_ok = False
    if os.path.exists(css_path):
        try:
            with open(css_path, "r", encoding="utf-8") as f:
                css_content = f.read()
            
            critical_vars = [
                "--bg-primary",
                "--bg-secondary",
                "--accent-primary",
                "--radius-sm",
                "--radius-md",
                "--transition-normal",
                "--bg-card",
                "--primary-color",
                "--bg-glass",
                "--accent-red"
            ]
            css_ok = True
            for var in critical_vars:
                found = var in css_content
                print(f"  - Variable '{var:<20}': {'[DEFINED]' if found else '[UNDEFINED]'}")
                if not found:
                    css_ok = False
        except Exception as e:
            print(f"  Error reading style.css: {e}")
            css_ok = False
            
    results.append(("CSS Variable Declarations Present", css_ok))
    print()

    # ----------------------------------------------------
    # Test Case 4-8: Backend Server API Endpoint Tests
    # ----------------------------------------------------
    print("Test Case 4-8: Launching Test Backend & Calling AI API Endpoints...")
    server_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server.py")
    server_process = None

    try:
        # Start server.py on test port 8001
        env = os.environ.copy()
        # Modify server.py dynamically or pass port check. 
        # Since server.py hardcodes PORT = 8000, we write a small override wrapper
        # or execute it with environment settings if it supports.
        # Wait, server.py uses PORT = 8000. Let's read server.py and start it.
        # To avoid editing server.py, we can read the file, replace PORT = 8000 with PORT = 8001,
        # run it as a temp script, and delete it afterward. This is extremely safe and clean!
        temp_server_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server_test_runner.py")
        with open(server_path, "r", encoding="utf-8") as sf:
            server_code = sf.read()
        
        server_code = server_code.replace("PORT = 8000", f"PORT = {TEST_PORT}")
        with open(temp_server_path, "w", encoding="utf-8") as tsf:
            tsf.write(server_code)

        server_process = subprocess.Popen([sys.executable, temp_server_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("  - Started test server background instance on port 8001")
        time.sleep(2.0) # Wait for server to bind to port

        # Sub-helper to call API
        def query_api(endpoint, payload):
            url = f"{BASE_URL}{endpoint}"
            headers = {"Content-Type": "application/json"}
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))

        # Test Case 4: /api/chat
        try:
            chat_resp = query_api("/api/chat", {"prompt": "What is 1+1? Answer in one word."})
            chat_ok = "result" in chat_resp and len(chat_resp["result"].strip()) > 0
            print(f"  - Endpoint /api/chat      : {'[SUCCESS]' if chat_ok else '[FAILED]'}")
            results.append(("/api/chat (Explainer API)", chat_ok))
        except Exception as e:
            print(f"  - Endpoint /api/chat      : [FAILED] - {e}")
            results.append(("/api/chat (Explainer API)", False))

        # Test Case 5: /api/summarize
        try:
            sum_resp = query_api("/api/summarize", {"prompt": "Mitosis is a process of cell duplication, or reproduction, during which one cell gives rise to two genetically identical daughter cells."})
            sum_ok = "result" in sum_resp and len(sum_resp["result"].strip()) > 0
            print(f"  - Endpoint /api/summarize : {'[SUCCESS]' if sum_ok else '[FAILED]'}")
            results.append(("/api/summarize (Note Summarizer API)", sum_ok))
        except Exception as e:
            print(f"  - Endpoint /api/summarize : [FAILED] - {e}")
            results.append(("/api/summarize (Note Summarizer API)", False))

        # Test Case 6: /api/roadmap
        try:
            rm_resp = query_api("/api/roadmap", {"prompt": "1. Intro to Physics\n2. Kinematics\n3. Dynamics"})
            rm_data = json.loads(rm_resp["result"]) if "result" in rm_resp else []
            rm_ok = isinstance(rm_data, list) and len(rm_data) > 0 and "title" in rm_data[0]
            print(f"  - Endpoint /api/roadmap   : {'[SUCCESS]' if rm_ok else '[FAILED]'}")
            results.append(("/api/roadmap (Study Roadmap Plan API)", rm_ok))
        except Exception as e:
            print(f"  - Endpoint /api/roadmap   : [FAILED] - {e}")
            results.append(("/api/roadmap (Study Roadmap Plan API)", False))

        # Test Case 7: /api/materials
        try:
            mat_resp = query_api("/api/materials", {"prompt": "Kinematics"})
            mat_ok = "result" in mat_resp and "href=" in mat_resp["result"] # HTML link formatting
            print(f"  - Endpoint /api/materials : {'[SUCCESS]' if mat_ok else '[FAILED]'}")
            results.append(("/api/materials (Study Materials Generator API)", mat_ok))
        except Exception as e:
            print(f"  - Endpoint /api/materials : [FAILED] - {e}")
            results.append(("/api/materials (Study Materials Generator API)", False))

        # Test Case 8: /api/quiz
        try:
            quiz_resp = query_api("/api/quiz", {"prompt": "Cell biology"})
            quiz_data = json.loads(quiz_resp["result"]) if "result" in quiz_resp else []
            quiz_ok = isinstance(quiz_data, list) and len(quiz_data) == 5 and "question" in quiz_data[0]
            print(f"  - Endpoint /api/quiz      : {'[SUCCESS]' if quiz_ok else '[FAILED]'}")
            results.append(("/api/quiz (Quiz Generator JSON API)", quiz_ok))
        except Exception as e:
            print(f"  - Endpoint /api/quiz      : [FAILED] - {e}")
            results.append(("/api/quiz (Quiz Generator JSON API)", False))

    except Exception as e:
        print(f"  Failed running API integration tests: {e}")
    finally:
        # Shutdown server process
        if server_process:
            server_process.terminate()
            server_process.wait()
            print("  - Stopped test server background instance")
        # Clean up temp test script
        if os.path.exists(temp_server_path):
            os.remove(temp_server_path)
            
    print()

    # ----------------------------------------------------
    # Final Test Report
    # ----------------------------------------------------
    print("==================================================")
    print("📊 Nova Learn — Integration Test Results Summary")
    print("==================================================")
    all_passed = True
    for test_name, passed in results:
        status = "PASSED" if passed else "FAILED"
        print(f"  - {test_name:<45}: {status}")
        if not passed:
            all_passed = False
    print("==================================================")
    if all_passed:
        print("  🎉 ALL TEST CASES PASSED SUCCESSFULLY!")
    else:
        print("  ❌ SOME TEST CASES FAILED. Please review the output.")
    print("==================================================\n")

    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
