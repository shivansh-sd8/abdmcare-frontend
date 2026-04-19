# MediSync ABDM - Frontend

Production-grade React + TypeScript frontend for MediSync ABDM Hospital Information Management System.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Material-UI v5** - Component library
- **Redux Toolkit** - State management
- **React Query** - Server state management
- **React Router v6** - Routing
- **Axios** - HTTP client
- **React Toastify** - Notifications

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- npm (comes with Node.js)

### Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your backend API URL
```

### Development

```bash
# Start development server
npm start

# Runs on http://localhost:3000
```

### Build

```bash
# Create production build
npm run build

# Build output in /build directory
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── common/         # Common components
│   └── layouts/        # Layout components
├── features/           # Feature modules
│   ├── auth/          # Authentication
│   ├── dashboard/     # Dashboard
│   ├── abha/          # ABHA management
│   ├── patient/       # Patient management
│   ├── doctor/        # Doctor management
│   ├── appointment/   # Appointments
│   └── consent/       # Consent management
├── services/          # API services
├── store/             # Redux store
│   └── slices/        # Redux slices
├── hooks/             # Custom hooks
├── utils/             # Utility functions
├── types/             # TypeScript types
├── assets/            # Static assets
├── App.tsx            # Main app component
├── index.tsx          # Entry point
└── theme.ts           # MUI theme configuration
```

## Features

### Implemented
- ✅ Authentication & Authorization
- ✅ Dashboard with statistics
- ✅ ABHA creation workflow
- ✅ Patient management
- ✅ Doctor management
- ✅ Appointment management
- ✅ Consent management
- ✅ Responsive design
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling

### To Be Implemented
- [ ] ABHA profile management
- [ ] Patient search & filters
- [ ] Appointment scheduling
- [ ] Consent request workflow
- [ ] Health records viewer
- [ ] Real-time notifications
- [ ] Reports & analytics

## Environment Variables

```env
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_ENV=development
REACT_APP_NAME=MediSync ABDM
REACT_APP_VERSION=1.0.0
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Create production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## Code Style

- Follow React best practices
- Use functional components with hooks
- Implement proper TypeScript typing
- Follow MUI design patterns
- Keep components focused and reusable

## Contributing

1. Follow the existing code structure
2. Write meaningful commit messages
3. Add tests for new features
4. Update documentation as needed

## License

Proprietary - All rights reserved
