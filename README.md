# AI Code Reviewer

This is an AI-powered Code Review application. It allows users to input code and receive structured feedback including a code quality score, identified issues, improvement suggestions, and an optimized version of the code. The system processes AI responses in JSON format dynamically, renders results with categorized badges, and ensures a clean and user-friendly interface with proper loading and error handling.

## Features
- **AI-Powered Analysis**: Deep scan for code quality, issue identification, and refactoring using Google Gemini.
- **Modern UI**: Dark-themed, glassmorphic dashboard built with Tailwind CSS.
- **Structured Feedback**: Clean single-page output showing Score (0-100), Issues with categorized badges, Suggestions, and Improved Code views.
- **PDF Export**: Generate structured, academic-friendly analysis reports directly to PDF.
- **Robust API**: Handles various code formats natively and guarantees structured JSON reviews from the LLM.

## Setup Instructions

Follow these steps to set up and run the project locally.

### 1. Prerequisites
- **Node.js**: v18.17.0 or later.
- **npm**: v9.0.0 or later.
- **OpenAI API Key**: required for code analysis.

### 2. Installation
Clone the repository (or navigate to the project folder) and install the dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory and add your Google Gemini API key:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```
*(You can use `.env.example` as a template.)*

### 4. Development
Start the development server:
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

### 5. Build for Production
To create an optimized production build:
```bash
npm run build
npm start
```

## Project Structure
- `app/`: Next.js App Router (Layouts, Pages, Styles, API).
- `app/api/review/`: AI analysis logic.
- `package.json`: Project dependencies and scripts.
- `tailwind.config.mjs`: Styling configuration.
