# AI Code Reviewer

A professional, full-stack AI-powered code review tool built with Next.js (App Router), Tailwind CSS, and OpenAI.

## Features
- **AI-Powered Analysis**: Deep scan for bugs and suggestions.
- **Modern UI**: Dark-themed, glassmorphic dashboard.
- **Structured Feedback**: Organized tabs for Bugs, Suggestions, and Rating.
- **Robust API**: Handles various code formats and provides detailed JSON feedback.

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
Create a `.env.local` file in the root directory and add your OpenAI API key:
```bash
OPENAI_API_KEY=your_openai_api_key_here
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
