# PDF Editor Pro

## Overview

PDF Editor Pro is a production-ready web-based PDF editor built as a monorepo with separate frontend and backend workspaces. The application provides comprehensive PDF manipulation capabilities including viewing, annotation, editing, conversion to multiple formats (Word, Excel, PowerPoint, HTML), OCR text extraction, merging, compression, encryption, and permission management.

The frontend is a Next.js application with a Microsoft Office-style ribbon interface, while the backend consists of a Node.js/Express API server for file handling and Python scripts for advanced PDF processing operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with React 18 and TypeScript
- **State Management**: Zustand stores for documents, UI state, annotations, text edits, image edits, and history
- **PDF Rendering**: PDF.js (loaded via CDN) for viewing, pdf-lib for editing and manipulation
- **OCR**: Tesseract.js for text extraction from scanned documents
- **Styling**: Tailwind CSS with custom Office-style ribbon components
- **UI Pattern**: Ribbon-based interface with tabs (Home, Comment, Edit, Convert, Page, Merge, Protect, Tools)

### Backend Architecture
- **Node.js Server**: Express with TypeScript for API endpoints
- **File Handling**: Multer for PDF file uploads
- **Python Processing**: Separate Python scripts handle heavy PDF operations:
  - `py_word_excel_html_ppt.py` - Core conversion engine for Word/Excel/PowerPoint/HTML
  - `compress_pdf.py` - PDF compression using PyPDF2
  - `encrypt_pdf.py` - Password protection with AES encryption
  - `set_permissions.py` - Document permission management
  - `pdf_to_text.py` - Text extraction using pdfplumber/PyMuPDF

### Key Design Patterns
- **Adapter Pattern**: PDF library adapters (`pdf-lib.ts`, `pdfjs.ts`, `tesseract.ts`) abstract PDF operations
- **Store Pattern**: Zustand stores manage all application state with persistence middleware for annotations
- **Component Composition**: Ribbon tabs are modular components (HomeTab, CommentTab, EditTab, etc.)
- **Canvas Overlay System**: Multi-layer canvas for PDF rendering, annotations, and drawing

### Data Flow
1. PDF files uploaded via frontend → Multer processes → stored in backend/uploads
2. Frontend uses PDF.js to render pages to canvas
3. Annotations stored in Zustand with localStorage persistence
4. Edits applied via pdf-lib before download
5. Format conversions route through Python scripts via Express API

## External Dependencies

### Frontend Libraries
- **PDF.js** (CDN): PDF rendering engine
- **pdf-lib**: PDF manipulation and editing
- **Tesseract.js**: Client-side OCR
- **react-dropzone**: File upload handling
- **react-hot-toast**: Notifications
- **lucide-react/react-icons**: Icon sets

### Backend/Python Libraries
- **pdf2docx**: PDF to Word conversion
- **PyMuPDF (fitz)**: High-quality PDF extraction
- **openpyxl**: Excel file generation
- **python-pptx**: PowerPoint generation
- **pdfplumber**: Text extraction
- **tabula-py**: Table extraction
- **PyPDF2**: PDF compression and encryption

### Development Tools
- **pnpm**: Package manager (monorepo workspaces)
- **TypeScript**: Type checking across frontend and backend
- **Playwright/Pytest**: Frontend testing framework
- **Dev Container**: Docker-based development environment support

### External Services
- No external API services required - all processing is local
- Tesseract.js models loaded from CDN on first OCR use