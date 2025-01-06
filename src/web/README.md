# Multi-Touch Attribution Analytics Tool Frontend

## Project Overview

Enterprise-grade React application for tracking, analyzing, and attributing marketing touchpoints across the customer journey. The frontend provides an intuitive interface for marketing teams, business analysts, and executives to gain data-driven insights and optimize marketing spend.

### Core Features
- Real-time attribution modeling and visualization
- Interactive customer journey analysis
- Channel performance dashboards
- Custom attribution rule configuration
- Advanced analytics reporting
- Enterprise integration capabilities

### Technology Stack
- React 18.2+ - Component-based UI architecture
- TypeScript 4.9+ - Type-safe development
- Redux Toolkit 1.9+ - State management
- Material-UI 5.0+ - Design system implementation
- D3.js 7.0+ - Data visualization
- Axios 1.4+ - API communication

## Prerequisites

### Required Software
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git >= 2.40.0
- Docker >= 24.0.0

### Recommended Development Tools
- VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Jest
  - Docker
  - GitLens

### System Requirements
- 8GB RAM minimum
- 4 CPU cores recommended
- 10GB free disk space

## Getting Started

### Clone and Setup
```bash
# Clone repository
git clone [repository-url]
cd src/web

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### Environment Configuration
Configure the following in your `.env` file:
```
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_API_VERSION=v1

# Authentication
REACT_APP_AUTH0_DOMAIN=your-domain
REACT_APP_AUTH0_CLIENT_ID=your-client-id
REACT_APP_AUTH0_AUDIENCE=your-audience

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_EXPERIMENTAL=false
```

### Development Server
```bash
# Start development server
npm run dev

# Access application
open http://localhost:3000
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Route-based components
├── services/           # API integrations
├── store/              # Redux state management
├── utils/              # Shared utilities
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitions
├── assets/             # Static resources
├── config/             # App configuration
└── tests/              # Test suites
```

## Available Scripts

```bash
# Development
npm run dev             # Start development server
npm run storybook       # Launch Storybook

# Testing
npm run test           # Run test suites
npm run test:coverage  # Generate coverage report
npm run test:e2e      # Run E2E tests

# Linting & Formatting
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix lint issues
npm run format        # Run Prettier

# Production
npm run build         # Create production build
npm run analyze       # Analyze bundle size
```

## Development Guidelines

### Code Style
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript strict mode
- Maintain 100% type coverage
- Document complex functions and components

### Component Architecture
- Implement atomic design principles
- Use functional components with hooks
- Maintain single responsibility principle
- Document props using TypeScript interfaces

### State Management
- Use Redux Toolkit for global state
- Implement React Query for server state
- Use local state for UI-specific data
- Follow flux architecture patterns

### Testing Requirements
- Unit tests for utilities and hooks
- Integration tests for components
- E2E tests for critical user flows
- Maintain >80% test coverage

### Performance Optimization
- Implement code splitting
- Use React.memo for expensive renders
- Optimize bundle size
- Implement progressive loading

### Accessibility
- Follow WCAG 2.1 Level AA standards
- Implement keyboard navigation
- Maintain proper ARIA attributes
- Support screen readers

## Building for Production

### Build Process
```bash
# Create production build
npm run build

# Analyze bundle
npm run analyze
```

### Docker Deployment
```bash
# Build container
docker build -t attribution-frontend:latest .

# Run container
docker run -p 80:80 attribution-frontend:latest
```

### Environment-Specific Builds
```bash
# Staging build
npm run build:staging

# Production build
npm run build:prod
```

## Browser Support

### Minimum Versions
- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

### Required Features
- ES6+ JavaScript
- CSS Grid/Flexbox
- WebSocket
- LocalStorage/SessionStorage
- Service Workers

## Troubleshooting

### Common Issues
1. Node version mismatch
   - Solution: Use nvm to switch to Node 18

2. Build failures
   - Clear node_modules and package-lock.json
   - Run npm cache clean --force
   - Reinstall dependencies

3. Environment configuration
   - Verify .env file exists
   - Check environment variable names
   - Validate API endpoints

### Support
For additional support:
- Check documentation in `/docs`
- Submit issues via GitHub
- Contact development team

## License
Copyright © 2023 [Company Name]