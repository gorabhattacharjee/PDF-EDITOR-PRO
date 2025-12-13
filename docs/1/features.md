# PDF Editor Pro - Features & Architecture

## Architecture Overview

### Frontend Stack
- **Framework**: Next.js 14.2.5 (React 18.3)
- **Language**: TypeScript 5.4
- **State**: Zustand (documents, selection, ui, history, jobs)
- **Styling**: Tailwind CSS 3.4
- **PDF Engines**: PDF.js 3.11 (render), pdf-lib 1.17 (edit), Tesseract.js 5.0 (OCR)

### Backend Stack
- **Framework**: Express 4.18
- **Language**: Node.js + TypeScript
- **Features**: File upload (Multer), CORS enabled

### Layout
