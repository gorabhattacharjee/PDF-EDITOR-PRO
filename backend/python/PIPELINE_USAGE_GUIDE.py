#!/usr/bin/env python3
"""
USAGE GUIDE: PDF to Excel Conversion via Word Pipeline

IMPLEMENTATION SUMMARY:
========================

You now have a complete PDF to Excel conversion pipeline that:
1. Converts PDF → Word (with exact page size and margins matching)
2. Converts Word → Excel (with proper table structure and formatting)

This approach ensures:
✓ Exact layout preservation from PDF
✓ Proper table structure in Excel
✓ Number format conversion (text to actual numbers)
✓ Professional formatting with borders
✓ Proper alignment (numbers right-aligned, text left-aligned)
✓ Column widths optimized for readability


HOW TO USE:
===========

1. SINGLE PDF TO EXCEL CONVERSION:
   
   From Python code:
   -----------------
   from py_word_excel_html_ppt import pdf_to_excel_via_word
   
   pdf_to_excel_via_word("input.pdf", "output.xlsx")

   From command line:
   ------------------
   python pdf_to_excel_via_word_pipeline.py input.pdf -o output.xlsx


2. BATCH CONVERSION (All PDFs in a directory):
   
   From Python code:
   -----------------
   from py_word_excel_html_ppt import pdf_to_excel_via_word
   import os
   
   pdf_dir = "c:\\path\\to\\pdf\\files"
   for pdf_file in os.listdir(pdf_dir):
       if pdf_file.endswith('.pdf'):
           pdf_path = os.path.join(pdf_dir, pdf_file)
           output_path = pdf_path.replace('.pdf', '.xlsx')
           pdf_to_excel_via_word(pdf_path, output_path)

   From command line:
   ------------------
   python pdf_to_excel_via_word_pipeline.py c:\\path\\to\\pdf\\files -b -o c:\\output\\dir


3. MAIN CONVERSION SCRIPT INTEGRATION:
   
   When using py_word_excel_html_ppt.py directly:
   
   python py_word_excel_html_ppt.py excel input.pdf output.xlsx
   
   Note: The main script now uses the Word pipeline for Excel conversion
         automatically when you request "excel" format.


FEATURES:
=========

✓ Two-step pipeline (PDF → Word → Excel) for optimal structure
✓ Exact page size matching from PDF to Word
✓ Proper margin handling (0.5" all sides)
✓ Automatic number format detection and conversion
✓ Professional borders and alignment
✓ Batch processing support
✓ Comprehensive error handling and reporting


CONVERSION PROCESS:
===================

Step 1: PDF → Word
   • Uses pdf2docx for layout-aware conversion
   • Measures PDF dimensions and applies exact page size to Word
   • Adds 0.5" margins on all sides
   • Preserves text as editable content
   • Maintains table structure
   • Embeds images at original locations

Step 2: Word → Excel
   • Extracts all tables from Word document
   • Converts text-formatted numbers to actual numeric values
   • Applies professional formatting:
     - Thin borders on all cells
     - Right-aligned numbers with 2 decimal places
     - Left-aligned text
     - Optimized column widths (18 units)
   • Removes text wrapping for clean appearance


EXAMPLE CONVERSIONS:
====================

1. Convert a single account statement PDF:
   python pdf_to_excel_via_word_pipeline.py "Account_Statement.pdf"
   
   Output: Account_Statement_converted.xlsx

2. Convert with custom output name:
   python pdf_to_excel_via_word_pipeline.py "Statement.pdf" -o "Statement_Excel.xlsx"

3. Batch convert all PDFs in a directory:
   python pdf_to_excel_via_word_pipeline.py "c:\\PDFs" -b -o "c:\\Excel_Output"
   
   This will convert all .pdf files in c:\\PDFs and save Excel files to c:\\Excel_Output


SUPPORTED FORMATS:
==================

Input:  PDF files
Output: Excel (.xlsx) files

The pipeline works best with:
- Bank statements
- Account statements
- Tables and structured documents
- Any document with tables and formatted text


ERROR HANDLING:
===============

The script includes comprehensive error handling:
- Checks if input files exist
- Validates output directory creation
- Reports success/failure with file sizes
- Provides detailed error messages for troubleshooting


NOTES:
======

• The Word file is temporary and automatically deleted after conversion
• Both file paths can be relative or absolute
• The batch mode will continue even if individual conversions fail
• All conversions are logged with detailed progress information


FILES INVOLVED:
===============

Main conversion script:
  c:\\PDFP\\convt\\script\\test\\done\\py_word_excel_html_ppt.py
  - Contains: word_to_excel(), pdf_to_excel_via_word(), and main conversion functions

Standalone pipeline script:
  c:\\PDFP\\convt\\script\\test\\done\\pdf_to_excel_via_word_pipeline.py
  - Standalone utility with batch processing support
  - Can be used directly from command line


REQUIREMENTS:
==============

Python packages:
  - python-docx (for Word handling)
  - openpyxl (for Excel creation)
  - PyMuPDF/fitz (for PDF extraction)
  - pdf2docx (for PDF to Word conversion)

All are already installed in your environment.
"""

if __name__ == "__main__":
    print(__doc__)
