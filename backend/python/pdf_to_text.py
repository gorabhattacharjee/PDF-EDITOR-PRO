#!/usr/bin/env python3
"""
PDF to Text Extraction Script
Extracts all text from PDF files with proper formatting and page separation.
"""

import sys
import os

# Text extraction libraries
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    print("Warning: pdfplumber not available", file=sys.stderr)

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    print("Warning: PyMuPDF not available", file=sys.stderr)


def extract_text_with_pdfplumber(pdf_path, output_txt):
    """Extract text using pdfplumber (best for structured text extraction)."""
    try:
        print(f"🔥 Using pdfplumber for text extraction...", file=sys.stderr)
        
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"📄 Total pages: {total_pages}", file=sys.stderr)
            
            all_text = []
            
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    all_text.append(f"\n{'='*80}")
                    all_text.append(f"PAGE {page_num}")
                    all_text.append(f"{'='*80}\n")
                    all_text.append(text)
                print(f"   ✓ Extracted text from page {page_num}", file=sys.stderr)
            
            if all_text:
                with open(output_txt, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(all_text))
                
                print(f"✅ Text extraction completed with pdfplumber:", file=sys.stderr)
                print(f"   ✓ Extracted text from {total_pages} pages", file=sys.stderr)
                print(f"   ✓ Saved to: {output_txt}", file=sys.stderr)
                return True
            else:
                print(f"⚠️ No text extracted from PDF with pdfplumber", file=sys.stderr)
                return False
    except Exception as e:
        print(f"⚠️ pdfplumber extraction failed: {e}", file=sys.stderr)
        return False


def extract_text_with_pymupdf(pdf_path, output_txt):
    """Extract text using PyMuPDF (fallback method)."""
    try:
        print(f"🔄 Using PyMuPDF for text extraction...", file=sys.stderr)
        
        pdf_doc = fitz.open(pdf_path)
        total_pages = len(pdf_doc)
        print(f"📄 Total pages: {total_pages}", file=sys.stderr)
        
        all_text = []
        
        for page_num, page in enumerate(pdf_doc, 1):
            text = page.get_text()
            if text:
                all_text.append(f"\n{'='*80}")
                all_text.append(f"PAGE {page_num}")
                all_text.append(f"{'='*80}\n")
                all_text.append(text)
            print(f"   ✓ Extracted text from page {page_num}", file=sys.stderr)
        
        pdf_doc.close()
        
        if all_text:
            with open(output_txt, 'w', encoding='utf-8') as f:
                f.write('\n'.join(all_text))
            
            print(f"✅ Text extraction completed with PyMuPDF:", file=sys.stderr)
            print(f"   ✓ Extracted text from {total_pages} pages", file=sys.stderr)
            print(f"   ✓ Saved to: {output_txt}", file=sys.stderr)
            return True
        else:
            print(f"⚠️ No text extracted from PDF with PyMuPDF", file=sys.stderr)
            return False
    except Exception as e:
        print(f"⚠️ PyMuPDF extraction failed: {e}", file=sys.stderr)
        return False


def pdf_to_text(pdf_path, output_txt="output.txt"):
    """
    Extract all text from PDF and save as text file.
    Tries pdfplumber first, falls back to PyMuPDF.
    """
    print(f"⏳ Starting text extraction from PDF...", file=sys.stderr)
    print(f"   Processing: {pdf_path}", file=sys.stderr)
    
    # Try pdfplumber first (better for structured text)
    if HAS_PDFPLUMBER:
        if extract_text_with_pdfplumber(pdf_path, output_txt):
            return True
        print(f"   Falling back to PyMuPDF...", file=sys.stderr)
    
    # Fallback to PyMuPDF
    if HAS_PYMUPDF:
        if extract_text_with_pymupdf(pdf_path, output_txt):
            return True
    
    # If both fail, create error message
    error_message = f"""TEXT EXTRACTION FAILED

Could not extract text from: {pdf_path}

Possible reasons:
1. PDF is image-based (scanned document) - requires OCR
2. PDF has no selectable text
3. PDF is encrypted or corrupted
4. Required libraries are missing

Solution: Try exporting to Word (.docx) instead, which may handle the PDF better.
"""
    
    with open(output_txt, 'w', encoding='utf-8') as f:
        f.write(error_message)
    
    print(f"⚠️ Text extraction failed - error message created", file=sys.stderr)
    return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_to_text.py <input_pdf> <output_txt>")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_txt = sys.argv[2]
    
    success = pdf_to_text(input_pdf, output_txt)
    sys.exit(0 if success else 1)
