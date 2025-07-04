# Game Frontend

A modern React frontend for the game application, built with Vite, TypeScript, and Tailwind CSS.

## Features

- Modern UI with Tailwind CSS and shadcn/ui components
- Real-time game updates using SignalR
- State management with Zustand
- API integration with React Query
- TypeScript for type safety
- Responsive design

## Prerequisites

- Node.js 18 or later
- npm 9 or later

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── game/         # Game-specific components
│   ├── layout/       # Layout components
│   └── ui/           # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and API clients
├── store/            # Zustand store
├── types/            # TypeScript type definitions
└── utils/            # Helper functions
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production version
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_API_URL=http://localhost:5000/api
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
