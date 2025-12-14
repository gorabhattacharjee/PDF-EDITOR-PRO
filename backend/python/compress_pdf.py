#!/usr/bin/env python3
"""
PDF Compression Script using PyPDF2
Compresses PDF by removing duplicate objects and optimizing content streams
"""

import sys
import os
from PyPDF2 import PdfReader, PdfWriter

def compress_pdf(input_path, output_path, quality):
    """
    Compress a PDF file
    
    Args:
        input_path: Path to the input PDF file
        output_path: Path to save the compressed PDF
        quality: Quality level 1-100 (higher = better quality, larger file)
    
    Returns:
        Tuple of (success, original_size, compressed_size)
    """
    try:
        print(f"[Compress] Reading PDF from: {input_path}")
        
        if not os.path.exists(input_path):
            print(f"[Compress] Error: Input file not found: {input_path}")
            return False, 0, 0
        
        original_size = os.path.getsize(input_path)
        print(f"[Compress] Original size: {original_size} bytes")
        
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        print(f"[Compress] Processing {len(reader.pages)} pages")
        print(f"[Compress] Note: Using content stream compression (quality param saved for future image optimization)")
        
        for page in reader.pages:
            # PyPDF2's compress_content_streams applies deflate compression
            # Quality parameter is reserved for future image-based compression
            page.compress_content_streams()
            writer.add_page(page)
        
        if reader.metadata:
            writer.add_metadata(reader.metadata)
        
        print(f"[Compress] Writing compressed PDF to: {output_path}")
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)
        
        if not os.path.exists(output_path):
            print(f"[Compress] Error: Output file was not created")
            return False, original_size, 0
        
        compressed_size = os.path.getsize(output_path)
        reduction = ((original_size - compressed_size) / original_size) * 100 if original_size > 0 else 0
        
        print(f"[Compress] Success!")
        print(f"[Compress] Original: {original_size} bytes")
        print(f"[Compress] Compressed: {compressed_size} bytes")
        print(f"[Compress] Reduction: {reduction:.1f}%")
        
        return True, original_size, compressed_size
        
    except ImportError:
        print("[Compress] Error: PyPDF2 not installed")
        return False, 0, 0
    except Exception as e:
        print(f"[Compress] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, 0, 0

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python compress_pdf.py <input_pdf> <output_pdf> <quality>")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    quality = int(sys.argv[3])
    
    print(f"[Compress] Starting PDF compression")
    
    success, orig, comp = compress_pdf(input_pdf, output_pdf, quality)
    
    if success:
        print(f"RESULT:{orig}:{comp}")
    
    sys.exit(0 if success else 1)
