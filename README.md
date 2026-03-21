# AI Intent-Based App Builder

A modern web platform that allows users to describe their app in plain English and generate a full-stack application with AI assistance.

## Features

- **3D Wave Animation Background**: Immersive animated waves in pink and dark blue gradient
- **AI-Powered Architecture**: Describe your app idea and get an auto-generated architecture
- **Modern UI**: Professional glassmorphism design inspired by Sealos.io
- **Multi-Step Workflow**: Intent → Translation → Validation → Output
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Professional Typography**: Google Fonts Inter for clean, modern text

## Tech Stack

- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS + Custom CSS
- **Animations**: Vanta.js for 3D wave effects
- **Navigation**: React Router v7
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-intent-platform.git
cd ai-intent-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5174
```

## Project Structure

```
src/
├── components/
│   └── VantaBackground.jsx    # 3D wave animation component
├── pages/
│   ├── IntentPage.jsx         # Home/Hero page
│   ├── TranslationPage.jsx    # Architecture generation
│   ├── ValidationPage.jsx     # Security/compliance checks
│   └── OutputPage.jsx         # Generated app display
├── App.jsx                    # Main app component
├── main.jsx                   # Entry point
└── index.css                  # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features Breakdown

### IntentPage (Hero)
- Navigation bar
- Hero section with title and description
- Input textarea for app description
- Feature preview cards

### TranslationPage (Architecture Generation)
- Progress visualization
- 4 stages of app generation:
  - Architecture design
  - Database setup
  - API creation
  - UI design

### ValidationPage (Validation)
- Security checks
- Compliance verification
- Test cases validation

### OutputPage (Results)
- Display generated app specs
- Show user prompt
- Display technical stack
- Deploy and download options

## Customization

### Change Wave Colors
Edit `src/components/VantaBackground.jsx`:
```javascript
color: 0xffb6c1,           // light pink waves
color2: 0x1e3a8a,          // dark blue highlight
backgroundColor: 0x0f172a, // deep dark blue background
```

### Modify Typography
Edit `src/index.css` to change the font family or weights.

## Future Enhancements

- Backend API integration
- User authentication
- Actual app generation using AI APIs
- Database storage for app configurations
- Deployment automation
- Code download and preview features

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ by Manoj

