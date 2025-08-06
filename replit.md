# Advanced Data Analyzer

## Overview

A Flask-based web application that provides a complete data analysis workflow for users to upload, clean, analyze, and visualize CSV and Excel files. The platform features an interactive dashboard with multiple chart types, data cleaning capabilities, and export functionality. Built as a Progressive Web App (PWA) with offline support and mobile-first design using a colorful, vibrant interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: HTML templates with Jinja2 templating engine
- **UI Library**: Bootstrap 5 with custom colorful theme and gradients
- **Styling**: CSS custom properties for theming, responsive design with mobile-first approach
- **JavaScript**: Vanilla JavaScript for UI interactions, form validation, and chart management
- **Visualization**: Plotly.js for interactive charts (bar, line, pie, scatter, box, histogram)
- **PWA Features**: Service worker for caching and offline functionality, web app manifest for installability
- **Icons**: Font Awesome for consistent iconography

### Backend Architecture
- **Framework**: Flask web framework with modular route handling
- **Session Management**: Flask sessions with configurable secret key for user state
- **File Processing**: Werkzeug for secure file uploads with size limitations (16MB max)
- **Middleware**: ProxyFix for handling proxy headers in production environments
- **Logging**: Python's built-in logging system with DEBUG level for development

### Data Processing Pipeline
- **Core Component**: DataProcessor class handling file I/O and data validation
- **File Support**: CSV and Excel formats (.csv, .xlsx, .xls) with multiple encoding fallback
- **Data Cleaning**: Automated handling of missing values, duplicate detection, and outlier identification
- **Analytics Engine**: Integration with scikit-learn's Isolation Forest for outlier detection
- **Performance Optimization**: Row limiting (100K rows max) for browser performance

### Chart Generation System
- **ChartGenerator Class**: Centralized chart creation with consistent theming
- **Supported Charts**: Bar charts, line charts, pie charts, scatter plots, box plots, histograms
- **Theming**: Plotly white theme with custom color palette (Set3) for better visibility
- **Interactivity**: Built-in hover tooltips, zoom, pan, and selection capabilities
- **Error Handling**: Graceful degradation when chart generation fails

### Export and Reporting
- **ExportHandler Class**: Multi-format data export capabilities
- **Supported Formats**: CSV, Excel, JSON for raw data export
- **Report Generation**: Comprehensive analysis reports with multiple Excel sheets
- **File Management**: Timestamped exports with automatic cleanup

### PWA Implementation
- **Service Worker**: Caching strategy for static assets and dynamic content
- **Offline Support**: Fallback pages and queued operations for offline scenarios
- **Install Prompts**: Native app-like installation experience
- **Background Sync**: Retry failed operations when connection restored

## External Dependencies

### Core Libraries
- **Flask**: Web framework for routing, templating, and session management
- **Pandas**: Data manipulation and analysis for CSV/Excel processing
- **NumPy**: Numerical computing support for data operations
- **Plotly**: Interactive visualization library for chart generation
- **scikit-learn**: Machine learning library for outlier detection algorithms

### Frontend Assets (CDN)
- **Bootstrap 5**: UI component library from jsDelivr CDN
- **Font Awesome**: Icon library from Cloudflare CDN
- **Plotly.js**: Visualization library from official Plotly CDN

### Python Data Processing
- **openpyxl**: Excel file reading and writing capabilities
- **xlrd**: Legacy Excel file format support
- **Werkzeug**: WSGI utilities for file handling and security

### Development and Production
- **Logging**: Python's built-in logging for debugging and monitoring
- **UUID**: Unique filename generation for uploaded files
- **datetime**: Timestamp generation for exports and file management

### Browser APIs
- **Service Worker API**: For caching and offline functionality
- **Web App Manifest**: For PWA installation and app-like behavior
- **File API**: For drag-and-drop file uploads
- **Fetch API**: For asynchronous data operations