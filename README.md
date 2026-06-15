# 🎓 AI Study Buddy - Nova Learn

An intelligent, AI-powered study companion platform designed to help students learn effectively through personalized tutoring, study materials generation, quizzes, and interactive learning tools.

## Overview

**AI Study Buddy** is a comprehensive web-based learning platform that leverages artificial intelligence to transform how students study and learn. It combines modern web technologies with powerful AI models to provide an engaging, personalized, and comprehensive study experience.

### Key Highlights
- 🤖 **AI-Powered** - Uses Groq API with cutting-edge LLM models (Llama 3.3, Mixtral, Gemma)
- 🎯 **Multi-Modal Learning** - Chat explainer, quiz generation, study roadmaps, flashcards, and more
- 📚 **Smart Material Generation** - Auto-generates study materials based on syllabi
- 📄 **Document Processing** - Upload PDFs, text files, and markdown for instant analysis
- 🎨 **Beautiful UI** - Modern, responsive design with dark/light mode support
- 🗣️ **Voice Input** - Speak to interact with the AI using Web Speech API
- 💾 **PDF Export** - Download study materials, quizzes, and summaries as PDFs
- ⚡ **Fast & Lightweight** - No heavy dependencies, pure Python backend with vanilla JavaScript

---

## 🌟 Features

### 1. **AI Explainer Chat** 💬
Interactive chat interface for instant tutoring on any topic. Get explanations tailored to your learning style and level.
- **Style Options**: ELI5 (simple), Academic (formal), Practical (real-world examples)
- **Level Options**: High School, College, Graduate
- **Length Options**: Concise or Comprehensive
- **Upload Documents**: Provide context files for the AI to reference
- **Voice Input**: Speak your questions naturally
- **PDF Download**: Save AI responses as PDFs

### 2. **Study Roadmap Generator** 🗺️
Generate structured study milestones for any syllabus or topic.
- Creates 4-6 learning milestones with clear objectives
- Each milestone includes a title and concise description
- Foundation for effective study planning
- Exportable as PDF for offline reference

### 3. **AI Study Materials Generator** 📖
Automatically creates comprehensive study guides from syllabi.
- Clear section headings for each topic
- Key definitions and explanations
- Bullet points for important facts
- Recommended online resources (Khan Academy, YouTube, Coursera, MIT OCW)
- Professionally formatted HTML output
- Download as PDF for easy distribution

### 4. **Quiz Engine** ✅
AI-generated multiple-choice quizzes to test your knowledge.
- Generates 5 questions per quiz based on any topic/document
- Instant feedback on correct/incorrect answers
- Progress tracking and score calculation
- Detailed quiz reports with explanations
- Upload study materials to create quizzes from them
- Quiz statistics and attempt tracking

### 5. **Notes Summarizer** 📝
Transform messy lecture notes into clean, structured summaries.
- Extracts key points from unorganized notes
- Creates numbered bullet-point summaries
- Includes conclusions for quick review
- Supports PDF, TXT, and Markdown files
- HTML-formatted output with downloadable PDFs

### 6. **Interactive Flashcards** 🎴
Create and study with AI-generated flashcard decks.
- Auto-generates 5-8 flashcards based on topics/documents
- Flip animation for interactive learning
- Navigate through deck with next/previous buttons
- Track your flashcard progress
- Export decks as PDFs
- Perfect for quick review and memorization

### 7. **Task Manager** ✓
Organize your study schedule and track assignments.
- Create, check off, and delete tasks
- Persistent storage in browser localStorage
- Visual feedback for completed tasks
- Never forget an assignment

### 8. **Pomodoro Timer** ⏱️
Built-in productivity timer with visual progress ring.
- Customizable session length (1-180 minutes)
- Circular progress visualization
- Auto-tracks study hours completed
- Pause and reset functionality
- Break reminders and motivation notifications

### 9. **Dashboard (Quick Study Hub)** 🚀
Fast-track to learning with the quick-access dashboard.
- Enter a study query or upload a document
- Instant AI-powered analysis
- Automatically routes to AI Explainer with context
- Voice input support
- Perfect for quick lookups during study sessions

### 10. **Customization & Settings** ⚙️
Fine-tune your learning experience.
- **AI Provider**: Select Groq as your AI backbone
- **Models**: Choose from Llama 3.3 (default), Mixtral, or Gemma 2
- **Temperature Control**: Balance between precise and creative AI responses
- **Learning Style**: Tailor explanations to your preferred style
- **Difficulty Level**: Adjust content complexity
- **Theme Toggle**: Dark and light mode support
- **Persistent Settings**: All preferences saved locally

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables for theming
- **Vanilla JavaScript** - Zero framework dependencies for speed
- **PDF.js** - PDF file parsing
- **html2pdf.js** - Client-side PDF generation
- **Web Speech API** - Voice recognition

### Backend
- **Python 3** - Standard library HTTP server
- **GROQ API** - AI inference via OpenAI-compatible endpoint
- **No external dependencies** - Uses only Python standard library

### Deployment
- Easy to host on any server with Python 3
- CORS support for cross-origin requests
- Environment variable configuration
- Lightweight (~150KB of code)

---

## 📊 Language Composition

- **JavaScript**: 51,216 bytes (40%)
- **CSS**: 28,960 bytes (23%)
- **HTML**: 26,589 bytes (21%)
- **Python**: 20,874 bytes (16%)

Total: ~127 KB of production code

---

## 🚀 Getting Started

### Prerequisites
- Python 3.7 or higher
- GROQ API key (free from [groq.com](https://console.groq.com))
- Any modern web browser

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/farhannaveed124-lang/ai-study-buddy.git
cd ai-study-buddy
```

2. **Set up environment variables:**
Create a `.env` file in the project root:
```
GROQ_API_KEY=your_groq_api_key_here
PORT=8000
```

3. **Install dependencies (optional):**
```bash
pip install -r requirements.txt
```
(Note: Currently no external dependencies required - uses Python standard library)

4. **Start the server:**
```bash
python3 server.py
```

5. **Access the application:**
Open your browser and navigate to:
```
http://localhost:8000
```

6. **Configure AI Settings:**
- Click the settings icon (⚙️) in the top bar
- Select "Groq" as your AI provider
- Choose your preferred model and learning style
- Save settings

---

## 📁 Project Structure

```
ai-study-buddy/
├── server.py                 # Python backend server
├── app.js                    # Frontend JavaScript application
├── index.html                # Main HTML page
├── style.css                 # Styling and theming
├── requirements.txt          # Python dependencies
├── test_application.py       # Test suite
├── .gitignore               # Git ignore rules
├── logo.png                 # Project branding
└── README.md                # This file
```

---

## 🔌 API Endpoints

The backend provides RESTful API endpoints for AI operations:

### POST `/api/chat`
General-purpose AI tutoring and explanations.
- **Parameters**: `prompt`, `model`, `style`, `level`, `length`, `temperature`
- **Response**: AI-generated explanation

### POST `/api/summarize`
Summarize lecture notes or documents.
- **Parameters**: `prompt`, `model`, `style`, `level`, `length`
- **Response**: Structured summary with bullet points

### POST `/api/quiz`
Generate multiple-choice questions.
- **Parameters**: `prompt`, `model`, `temperature`
- **Response**: JSON array of quiz questions

### POST `/api/roadmap`
Create study roadmaps and milestones.
- **Parameters**: `prompt`, `model`, `temperature`
- **Response**: JSON array of milestones

### POST `/api/materials`
Generate comprehensive study materials.
- **Parameters**: `prompt`, `model`, `style`, `level`, `length`
- **Response**: HTML-formatted study guide

---

## 🎯 Available AI Models

All models available through Groq API:

| Model | Name | Best For |
|-------|------|----------|
| `llama-3.3-70b-versatile` | Llama 3.3 (70B) | General tutoring, balanced quality |
| `mixtral-8x7b-32768` | Mixtral 8x7B | Faster responses, good quality |
| `gemma2-9b-it` | Gemma 2 (9B) | Quick explanations, instruction-tuned |

---

## 🎨 Customization

### Modifying Learning Styles
Edit the style descriptions in `server.py` (lines 165-169):
```python
style_desc = {
    "ELI5": "using very simple analogies...",
    "academic": "using formal, rigorous...",
    "practical": "focusing on practical..."
}
```

### Adjusting System Prompts
Customize system prompts in `server.py` (lines 68-103) to change AI behavior for each feature.

### Theme Customization
Edit CSS variables in `style.css` to customize colors, fonts, and spacing:
```css
:root {
  --primary-color: #6d28d9;
  --text-color: #1e293b;
  /* ... more variables */
}
```

---

## 📊 Data Storage

All user data is stored locally in the browser using `localStorage`:
- Settings preferences
- Study hours tracked
- Quiz attempts count
- Task list
- Theme preference
- Chat history (session-based)

**No data is sent to external servers except to Groq API for AI inference.**

---

## 🔐 Security

- **Backend**: API keys stored in environment variables only
- **Frontend**: No sensitive data stored in code
- **CORS**: Properly configured for local and remote deployments
- **PDFs**: Generated entirely client-side
- **Documents**: Processed in-browser, no uploads to external servers

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📝 License

This project is open source and available under the MIT License. See LICENSE file for details.

---

## 🐛 Troubleshooting

### "GROQ_API_KEY not configured" error
- Ensure your `.env` file contains `GROQ_API_KEY=your_actual_key`
- Restart the server after updating `.env`
- Check that your API key is valid at [console.groq.com](https://console.groq.com)

### PDFs not downloading
- Ensure browser allows file downloads
- Check browser console for errors (F12)
- Try a different browser if issues persist

### Voice input not working
- Not all browsers support Web Speech API (Chrome, Edge, Safari work best)
- Ensure microphone permissions are granted
- Check system microphone is working

### Server won't start
- Verify Python 3.7+ is installed: `python3 --version`
- Check PORT isn't already in use: `lsof -i :8000`
- Try a different port: `PORT=9000 python3 server.py`

---

## 📞 Support & Contact

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check existing discussions for solutions
- Review the documentation above

---

## 🙏 Acknowledgments

- **Groq** for providing fast, reliable AI inference
- **Open source community** for libraries like PDF.js and html2pdf.js
- **Students and educators** who inspire this project

---

## 🚀 Future Enhancements

Planned features for future releases:
- [ ] Real-time collaboration for study groups
- [ ] Spaced repetition algorithm for flashcards
- [ ] Custom quiz templates
- [ ] Integration with popular note-taking apps
- [ ] Mobile app with offline support
- [ ] Analytics dashboard for learning progress
- [ ] Community study materials marketplace
- [ ] Advanced search and filtering

---

## 📈 Statistics

- **Code Size**: ~127 KB total
- **Lines of Code**: ~1,500 (frontend) + 250 (backend)
- **Supported Features**: 10 major features
- **Models Supported**: 3 state-of-the-art AI models
- **Browser Support**: All modern browsers (Chrome, Firefox, Safari, Edge)

---

**Made with ❤️ to help students learn better**

*Last Updated: June 2026*
