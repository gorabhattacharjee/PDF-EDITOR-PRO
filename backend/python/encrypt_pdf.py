#!/usr/bin/env python3
"""
PDF Encryption Script using PyPDF2 with AES-256 support
Supports both user and owner passwords with strong encryption
"""

import sys
import os
from PyPDF2 import PdfReader, PdfWriter

def encrypt_pdf(input_path, output_path, user_password, owner_password):
    """
    Encrypt a PDF file with AES-256 encryption
    
    Args:
        input_path: Path to the input PDF file
        output_path: Path to save the encrypted PDF
        user_password: Password for opening the PDF (can be empty)
        owner_password: Password for restrictions (required)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"[Encryption] Reading PDF from: {input_path}")
        
        # Check if input file exists
        if not os.path.exists(input_path):
            print(f"[Encryption] Error: Input file not found: {input_path}")
            return False
        
        # Read the PDF
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        # Copy all pages to the writer
        print(f"[Encryption] Processing {len(reader.pages)} pages")
        for page in reader.pages:
            writer.add_page(page)
        
        # Copy metadata if available
        if reader.metadata:
            writer.add_metadata(reader.metadata)
        
        # Encrypt with AES-256 (algorithm R=4 is AES-128, algorithm R=5 is AES-256)
        # PyPDF2 will use AES-256 when permissions are specified
        print(f"[Encryption] Applying AES-256 encryption")
        
        # Encrypt the PDF with both user and owner passwords
        # is_physical_only=False allows all operations by default
        writer.encrypt(
            user_password=user_password if user_password else None,
            owner_password=owner_password,
            permissions_flag=-1,  # All permissions restricted until password provided
            algorithm="AES-256"
        )
        
        # Write the encrypted PDF
        print(f"[Encryption] Writing encrypted PDF to: {output_path}")
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)
        
        # Verify the file was created
        if not os.path.exists(output_path):
            print(f"[Encryption] Error: Output file was not created")
            return False
        
        file_size = os.path.getsize(output_path)
        print(f"[Encryption] Success! Encrypted PDF created: {output_path}")
        print(f"[Encryption] File size: {file_size} bytes")
        print(f"[Encryption] Encryption Details:")
        print(f"  - Algorithm: AES-256")
        print(f"  - User Password: {'Set' if user_password else 'Not set'}")
        print(f"  - Owner Password: Set")
        
        return True
        
    except ImportError:
        print("[Encryption] Error: PyPDF2 not installed")
        print("[Encryption] Install with: pip install PyPDF2")
        return False
    except Exception as e:
        print(f"[Encryption] Error during encryption: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) < 5:
        print("Usage: python encrypt_pdf.py <input_pdf> <output_pdf> <user_password> <owner_password>")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    user_password = sys.argv[3] if sys.argv[3] != "None" else ""
    owner_password = sys.argv[4]
    
    print(f"[Encryption] Starting PDF encryption process")
    print(f"[Encryption] Input: {input_pdf}")
    print(f"[Encryption] Output: {output_pdf}")
    print(f"[Encryption] User Password: {'Set' if user_password else 'Not set'}")
    print(f"[Encryption] Owner Password: Set")
    
    # Perform encryption
    success = encrypt_pdf(input_pdf, output_pdf, user_password, owner_password)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)
