#!/usr/bin/env python3
"""
PDF Permissions Script using PyPDF2
Sets document permissions (print, copy, modify) with owner password protection
"""

import sys
import os
from PyPDF2 import PdfReader, PdfWriter
from PyPDF2.constants import UserAccessPermissions as Permissions

def set_permissions(input_path, output_path, owner_password, allow_print, allow_copy, allow_modify):
    """
    Set PDF permissions with owner password protection
    
    Args:
        input_path: Path to the input PDF file
        output_path: Path to save the protected PDF
        owner_password: Password for restrictions (required)
        allow_print: Allow printing (bool)
        allow_copy: Allow copying text (bool)
        allow_modify: Allow modifications (bool)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"[Permissions] Reading PDF from: {input_path}")
        
        if not os.path.exists(input_path):
            print(f"[Permissions] Error: Input file not found: {input_path}")
            return False
        
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        print(f"[Permissions] Processing {len(reader.pages)} pages")
        for page in reader.pages:
            writer.add_page(page)
        
        if reader.metadata:
            writer.add_metadata(reader.metadata)
        
        permissions = 0
        if allow_print:
            permissions |= Permissions.PRINT
            permissions |= Permissions.PRINT_TO_REPRESENTATION
        if allow_copy:
            permissions |= Permissions.EXTRACT
            permissions |= Permissions.EXTRACT_TEXT_AND_GRAPHICS
        if allow_modify:
            permissions |= Permissions.MODIFY
            permissions |= Permissions.FILL_FORM_FIELDS
            permissions |= Permissions.ADD_OR_MODIFY
        
        print(f"[Permissions] Setting permissions:")
        print(f"  - Print: {'Allowed' if allow_print else 'Denied'}")
        print(f"  - Copy: {'Allowed' if allow_copy else 'Denied'}")
        print(f"  - Modify: {'Allowed' if allow_modify else 'Denied'}")
        
        writer.encrypt(
            user_password="",
            owner_password=owner_password,
            permissions_flag=permissions
        )
        
        print(f"[Permissions] Writing protected PDF to: {output_path}")
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)
        
        if not os.path.exists(output_path):
            print(f"[Permissions] Error: Output file was not created")
            return False
        
        file_size = os.path.getsize(output_path)
        print(f"[Permissions] Success! Protected PDF created: {output_path}")
        print(f"[Permissions] File size: {file_size} bytes")
        
        return True
        
    except ImportError:
        print("[Permissions] Error: PyPDF2 not installed")
        return False
    except Exception as e:
        print(f"[Permissions] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 7:
        print("Usage: python set_permissions.py <input_pdf> <output_pdf> <owner_password> <allow_print> <allow_copy> <allow_modify>")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    owner_password = sys.argv[3]
    allow_print = sys.argv[4] == '1'
    allow_copy = sys.argv[5] == '1'
    allow_modify = sys.argv[6] == '1'
    
    print(f"[Permissions] Starting PDF permissions process")
    
    success = set_permissions(input_pdf, output_pdf, owner_password, allow_print, allow_copy, allow_modify)
    
    sys.exit(0 if success else 1)
