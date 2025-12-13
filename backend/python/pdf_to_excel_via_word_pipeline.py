#!/usr/bin/env python3
"""
PDF to Excel Conversion via Word Pipeline

This script converts any PDF document to Excel using a two-step pipeline:
1. PDF → Word (with exact page size and margins matching)
2. Word → Excel (with proper table structure and formatting)

This approach ensures:
- Exact layout preservation from PDF
- Proper table structure in Excel
- Number format conversion
- Professional formatting with borders and proper alignment
"""

import sys
import os
import argparse

# Import conversion functions
from py_word_excel_html_ppt import pdf_to_excel_via_word

def convert_pdf_to_excel(pdf_file, output_file=None):
    """Convert a single PDF to Excel using the Word pipeline."""
    
    if not os.path.exists(pdf_file):
        print(f"❌ Error: PDF file not found: {pdf_file}")
        return False
    
    # Generate output filename if not provided
    if output_file is None:
        base_name = os.path.splitext(os.path.basename(pdf_file))[0]
        output_file = os.path.join(os.path.dirname(pdf_file), f"{base_name}_converted.xlsx")
    
    print()
    print("=" * 80)
    print("PDF to Excel Conversion (via Word Pipeline)")
    print("=" * 80)
    print(f"Input PDF:    {pdf_file}")
    print(f"Output Excel: {output_file}")
    print()
    
    try:
        pdf_to_excel_via_word(pdf_file, output_file)
        
        # Check if output file was created
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file) / (1024 * 1024)  # Convert to MB
            print()
            print("=" * 80)
            print("✅ Conversion Successful!")
            print("=" * 80)
            print(f"Output file: {output_file}")
            print(f"File size:   {file_size:.2f} MB")
            print()
            return True
        else:
            print()
            print("=" * 80)
            print("⚠️ Warning: Output file was not created")
            print("=" * 80)
            return False
            
    except Exception as e:
        print()
        print("=" * 80)
        print(f"❌ Conversion Failed: {e}")
        print("=" * 80)
        import traceback
        traceback.print_exc()
        return False

def batch_convert(input_dir, output_dir=None):
    """Convert all PDF files in a directory to Excel."""
    
    if not os.path.isdir(input_dir):
        print(f"❌ Error: Directory not found: {input_dir}")
        return False
    
    if output_dir is None:
        output_dir = input_dir
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Find all PDF files
    pdf_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print(f"❌ No PDF files found in: {input_dir}")
        return False
    
    print(f"Found {len(pdf_files)} PDF file(s) to convert")
    print()
    
    success_count = 0
    failed_count = 0
    
    for idx, pdf_file in enumerate(pdf_files, 1):
        pdf_path = os.path.join(input_dir, pdf_file)
        base_name = os.path.splitext(pdf_file)[0]
        output_file = os.path.join(output_dir, f"{base_name}.xlsx")
        
        print(f"\n[{idx}/{len(pdf_files)}] Processing: {pdf_file}")
        print("-" * 80)
        
        if convert_pdf_to_excel(pdf_path, output_file):
            success_count += 1
        else:
            failed_count += 1
    
    print()
    print("=" * 80)
    print("Batch Conversion Summary")
    print("=" * 80)
    print(f"Total files:    {len(pdf_files)}")
    print(f"Successful:     {success_count}")
    print(f"Failed:         {failed_count}")
    print(f"Output folder:  {output_dir}")
    print("=" * 80)
    print()
    
    return failed_count == 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert PDF documents to Excel using Word as intermediate format"
    )
    parser.add_argument("input", help="PDF file or directory containing PDF files")
    parser.add_argument("-o", "--output", help="Output Excel file or directory")
    parser.add_argument("-b", "--batch", action="store_true", help="Batch convert all PDFs in directory")
    
    args = parser.parse_args()
    
    if args.batch or os.path.isdir(args.input):
        # Batch mode
        success = batch_convert(args.input, args.output)
        sys.exit(0 if success else 1)
    else:
        # Single file mode
        success = convert_pdf_to_excel(args.input, args.output)
        sys.exit(0 if success else 1)
