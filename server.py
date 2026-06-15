#!/usr/bin/env python3
"""
AI Study Buddy — Python Backend Server
Serves static files and provides AI API endpoints.
Supports both Groq and Gemini API providers.
"""

import http.server
import json
import urllib.request
import urllib.error
import os
import sys

# Load environment variables from .env file if it exists
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                try:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()
                except ValueError:
                    pass

PORT = int(os.environ.get("PORT", 8000))

# --- AI API Callers ---

def call_groq(api_key, system_prompt, user_prompt, model="llama-3.3-70b-versatile", temperature=0.7):
    """Call the Groq API (OpenAI-compatible endpoint)."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": 2048,
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else str(e)
        raise Exception(f"Groq API error ({e.code}): {error_body}")


def call_ai(provider, api_key, system_prompt, user_prompt, model="llama-3.3-70b-versatile", temperature=0.7):
    """Route to the correct AI provider."""
    # We now only use Groq, ignore the provider variable
    return call_groq(api_key, system_prompt, user_prompt, model=model, temperature=temperature)


# --- System Prompts ---

PROMPTS = {
    "chat": (
        "You are an expert tutor and AI Study Buddy. Explain concepts in simple, "
        "easy-to-understand language. Use bullet points and analogies when helpful. "
        "Keep your response concise (under 300 words)."
    ),
    "summarize": (
        "You are an expert note summarizer. Given messy lecture notes, extract the key "
        "points and present them as a clean, structured summary with bullet points. "
        "Include a 'Main Topic', numbered 'Key Points', and a brief 'Conclusion'. "
        "Use HTML formatting: <h4>, <ul>, <li>, <strong> tags."
    ),
    "quiz": (
        "You are a quiz generator for students. Based on the given topic/syllabus, "
        "generate exactly 5 multiple-choice questions with 4 options each. "
        "Return ONLY valid JSON in this exact format, with no markdown formatting:\n"
        '[{"question":"...","options":["A","B","C","D"],"correct":0}]\n'
        "Where 'correct' is the 0-based index of the correct option."
    ),
    "roadmap": (
        "You are a study planner. Given a syllabus or list of topics, create a structured "
        "study roadmap with 4-6 milestones. For each milestone provide a short title and a "
        "one-sentence description. Return ONLY valid JSON array, with no markdown formatting:\n"
        '[{"title":"Milestone 1: ...","description":"..."}]'
    ),
    "materials": (
        "You are an expert study material creator. Based on the given syllabus/roadmap, "
        "generate comprehensive study materials with:\n"
        "- Clear section headings for each topic\n"
        "- Key definitions and explanations\n"
        "- Bullet points for important facts\n"
        "- Recommended online resources (Khan Academy, YouTube, Coursera, MIT OCW links)\n"
        "Format the output as clean HTML using <h1>, <h2>, <p>, <ul>, <li>, <a>, <strong> tags. "
        "Make links clickable with target='_blank'. Use style='color:#6d28d9' for links."
    ),
}


# --- API Keys ---
# Groq API key is read dynamically from environment variables

# --- HTTP Request Handler ---

class StudyBuddyHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler that serves static files AND handles API routes."""

    def do_POST(self):
        """Handle POST requests to API endpoints."""
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            self._send_json(500, {"error": "GROQ_API_KEY environment variable is not configured"})
            return
        prompt = data.get("prompt", "")
        model = data.get("model", "llama-3.3-70b-versatile")
        style = data.get("style", "ELI5")
        level = data.get("level", "college")
        length = data.get("length", "comprehensive")
        try:
            temperature = float(data.get("temperature", 0.7))
        except (ValueError, TypeError):
            temperature = 0.7

        if not prompt:
            self._send_json(400, {"error": "Missing 'prompt'"})
            return

        # Validate model selection
        if model not in ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"]:
            model = "llama-3.3-70b-versatile"

        # Route to the correct endpoint
        route_map = {
            "/api/chat": "chat",
            "/api/summarize": "summarize",
            "/api/quiz": "quiz",
            "/api/roadmap": "roadmap",
            "/api/materials": "materials",
        }

        endpoint = route_map.get(self.path)
        if not endpoint:
            self._send_json(404, {"error": f"Unknown endpoint: {self.path}"})
            return

        system_prompt = PROMPTS[endpoint]

        # Don't modify prompts for programmatic outputs like JSON quizzes
        if endpoint in ["chat", "summarize", "materials", "roadmap"]:
            style_desc = {
                "ELI5": "using very simple analogies, explaining concepts as if the user is 5 years old",
                "academic": "using formal, rigorous academic and textbook style explanations with key definitions",
                "practical": "focusing on practical, real-world examples, exercises, and case-studies"
            }.get(style, "ELI5")

            level_desc = {
                "highschool": "at a high school student level of understanding",
                "college": "at an undergraduate college level of study",
                "graduate": "at a graduate level of research and academic expertise"
            }.get(level, "college")

            length_desc = {
                "concise": "Keep the response concise, using brief bullet points and short summaries.",
                "comprehensive": "Provide a comprehensive, detailed, and deep dive explanation."
            }.get(length, "comprehensive")

            modifier = f"\n\n[INSTRUCTION MODIFIERS: Please tailor the explanation {level_desc}. Explain {style_desc}. {length_desc}]"
            system_prompt += modifier

        try:
            result = call_ai("groq", api_key, system_prompt, prompt, model=model, temperature=temperature)
            self._send_json(200, {"result": result})
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def _send_json(self, status, data):
        """Send a JSON response."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        """Custom log format."""
        sys.stderr.write(f"  [{self.log_date_time_string()}] {format % args}\n")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with http.server.HTTPServer(("", PORT), StudyBuddyHandler) as httpd:
        print(f"\n  ╔══════════════════════════════════════════╗")
        print(f"  ║   🎓 AI Study Buddy Server Running       ║")
        print(f"  ║   → http://localhost:{PORT}                ║")
        print(f"  ╚══════════════════════════════════════════╝\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.")
