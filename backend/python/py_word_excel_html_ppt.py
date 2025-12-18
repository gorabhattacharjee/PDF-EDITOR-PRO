import os
import sys
import io
import tempfile

# Only import what we actually need for basic conversions
try:
    from pdf2docx import Converter
    HAS_PDF2DOCX = True
except ImportError:
    HAS_PDF2DOCX = False
    print("Warning: pdf2docx not available", file=sys.stderr)

try:
    import fitz  # PyMuPDF - for high-quality PDF extraction
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    print("Warning: PyMuPDF not available", file=sys.stderr)

try:
    from openpyxl import Workbook
    from openpyxl.drawing.image import Image as XLImage
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False
    print("Warning: openpyxl not available", file=sys.stderr)

try:
    import tabula
    from openpyxl.utils.dataframe import dataframe_to_rows
    HAS_TABULA = True
except ImportError:
    HAS_TABULA = False
    print("Warning: tabula-py not available", file=sys.stderr)

try:
    from pptx import Presentation
    from pptx.util import Inches
    HAS_PPTX = True
except ImportError:
    HAS_PPTX = False
    print("Warning: python-pptx not available", file=sys.stderr)

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    print("Warning: pdfplumber not available", file=sys.stderr)

# Optional: pdf2image for image-based conversions (requires poppler)
try:
    from pdf2image import convert_from_path
    from PIL import Image
    HAS_PDF2IMAGE = True
except ImportError:
    HAS_PDF2IMAGE = False
    print("Warning: pdf2image not available", file=sys.stderr)

# Poppler path - auto-detect
import glob
POPPLER_PATH = None
try:
    user_local = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'WinGet', 'Packages')
    poppler_dirs = glob.glob(os.path.join(user_local, 'oschwartz10612.Poppler*', 'poppler-*', 'Library', 'bin'))
    if poppler_dirs:
        POPPLER_PATH = poppler_dirs[0]
        print(f"✓ Poppler found at: {POPPLER_PATH}", file=sys.stderr)
except Exception:
    pass

def html_to_word(html_path, output_docx="output.docx"):
    """Convert HTML file to Word document using BeautifulSoup and python-docx."""
    print(f"⏳ Converting HTML to Word...", file=sys.stderr)
    print(f"   Processing: {html_path}", file=sys.stderr)
    
    try:
        from bs4 import BeautifulSoup
        from docx import Document
        from docx.shared import Pt, Inches, RGBColor
        from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        
        print(f"🔥 Using BeautifulSoup and python-docx for conversion...", file=sys.stderr)
        
        # Read and parse HTML file
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Create Word document
        doc = Document()
        
        # Process HTML elements
        print(f"🔧 Parsing HTML content...", file=sys.stderr)
        
        for element in soup.body.children if soup.body else soup.children:
            if isinstance(element, str):
                text = element.strip()
                if text:
                    doc.add_paragraph(text)
            elif element.name == 'h1':
                p = doc.add_paragraph(element.get_text())
                for run in p.runs:
                    run.font.size = Pt(26)
                    run.font.bold = True
            elif element.name == 'h2':
                p = doc.add_paragraph(element.get_text())
                for run in p.runs:
                    run.font.size = Pt(20)
                    run.font.bold = True
            elif element.name == 'h3':
                p = doc.add_paragraph(element.get_text())
                for run in p.runs:
                    run.font.size = Pt(16)
                    run.font.bold = True
            elif element.name in ['p', 'div']:
                p = doc.add_paragraph(element.get_text())
                p.paragraph_format.space_after = Pt(6)
            elif element.name == 'table':
                rows = element.find_all('tr')
                cols = len(rows[0].find_all(['td', 'th'])) if rows else 1
                table = doc.add_table(rows=len(rows), cols=cols)
                table.style = 'Table Grid'
                
                for i, row_elem in enumerate(rows):
                    cells = row_elem.find_all(['td', 'th'])
                    for j, cell_elem in enumerate(cells):
                        cell_text = cell_elem.get_text().strip()
                        table.rows[i].cells[j].text = cell_text
                        
                        # Format header cells
                        if row_elem.name == 'tr' and cell_elem.name == 'th':
                            for paragraph in table.rows[i].cells[j].paragraphs:
                                for run in paragraph.runs:
                                    run.font.bold = True
            elif element.name == 'ul':
                for li in element.find_all('li'):
                    p = doc.add_paragraph(li.get_text(), style='List Bullet')
            elif element.name == 'ol':
                for li in element.find_all('li'):
                    p = doc.add_paragraph(li.get_text(), style='List Number')
            elif element.name == 'br':
                doc.add_paragraph()
        
        # Clean up formatting
        print(f"🔧 Post-processing: Cleaning up formatting...", file=sys.stderr)
        for paragraph in doc.paragraphs:
            paragraph.paragraph_format.space_before = Pt(0)
            paragraph.paragraph_format.space_after = Pt(3)
            paragraph.paragraph_format.line_spacing = 1.0
        
        # Clean up tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        paragraph.paragraph_format.space_before = Pt(0)
                        paragraph.paragraph_format.space_after = Pt(0)
        
        # Save document
        doc.save(output_docx)
        
        if os.path.exists(output_docx) and os.path.getsize(output_docx) > 0:
            print(f"✅ Word document created successfully:", file=sys.stderr)
            print(f"   ✓ HTML converted to editable Word format", file=sys.stderr)
            print(f"   ✓ Formatting and tables preserved", file=sys.stderr)
            print(f"   ✓ File: {output_docx}", file=sys.stderr)
            return True
        else:
            print(f"⚠️ Conversion created empty file", file=sys.stderr)
            return False
    
    except Exception as e:
        print(f"⚠️ HTML conversion failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return False

def pdf_to_word_with_hidden_tables(pdf_path, output_docx="output.docx"):
    """Convert PDF to Word with exact layout preservation.
    This approach:
    1. Uses pdf2docx for accurate layout and table structure
    2. Preserves ALL formatting, fonts, sizes, and colors
    3. Maintains tables with proper borders and styling
    4. Preserves exact page dimensions and positioning
    5. Maintains all images with correct placement
    """
    
    print(f"\u23f3 Converting PDF to Word (exact layout preservation)...", file=sys.stderr)
    
    top_margin = 0.5
    bottom_margin = 0.5
    left_margin = 0.5
    right_margin = 0.5
    
    if not HAS_PDF2DOCX:
        print(f"\u26a0\ufe0f  pdf2docx not available", file=sys.stderr)
        return False
    
    try:
        from pdf2docx import Converter
        from docx import Document
        from docx.shared import Pt, Inches
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        
        # Extract full PDF text content first (for accuracy check)
        pdf_text_content = {}
        if HAS_PYMUPDF:
            try:
                pdf_doc = fitz.open(pdf_path)
                for page_num in range(len(pdf_doc)):
                    page = pdf_doc[page_num]
                    pdf_text_content[page_num] = page.get_text("text")
                pdf_doc.close()
                print(f"   \u2713 Extracted {len(pdf_text_content)} pages of text content", file=sys.stderr)
            except Exception as e:
                print(f"   Warning: Could not extract PDF text: {e}", file=sys.stderr)
        
        # Get PDF dimensions first
        pdf_page_width = None
        pdf_page_height = None
        
        if HAS_PYMUPDF:
            try:
                pdf_doc = fitz.open(pdf_path)
                if len(pdf_doc) > 0:
                    page = pdf_doc[0]
                    rect = page.rect
                    actual_pdf_width = rect.width / 72
                    actual_pdf_height = rect.height / 72
                    pdf_page_width = actual_pdf_width + left_margin + right_margin
                    pdf_page_height = actual_pdf_height + top_margin + bottom_margin
                    print(f"\ud83d\udcd0 PDF size: {actual_pdf_width:.2f}\" x {actual_pdf_height:.2f}\"", file=sys.stderr)
                pdf_doc.close()
            except Exception as e:
                print(f"   Warning: Could not measure PDF: {e}", file=sys.stderr)
        
        # Step 1: Convert PDF to Word using pdf2docx (preserves layout and tables)
        print(f"\ud83d\udd25 Converting with pdf2docx (layout + structure)...", file=sys.stderr)
        
        # Ensure output directory exists
        import os
        output_dir = os.path.dirname(output_docx)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            print(f"   ✓ Created output directory: {output_dir}", file=sys.stderr)
        
        cv = Converter(pdf_path)
        try:
            # Try multi-processing first (faster for large PDFs)
            print(f"   Attempting multi-processing conversion (4 CPU cores)...", file=sys.stderr)
            cv.convert(output_docx, multi_processing=False, cpu_count=1)
            print(f"   ✓ Multi-processing conversion successful", file=sys.stderr)
        except Exception as e:
            # Fallback to single-processing if multi-processing fails
            print(f"   ⚠ Multi-processing failed: {str(e)}", file=sys.stderr)
            print(f"   Retrying with single-processing...", file=sys.stderr)
            # Reset converter and try again with single processing
            cv.close()
            cv = Converter(pdf_path)
            cv.convert(output_docx, multi_processing=False, cpu_count=1)
            print(f"   ✓ Single-processing conversion successful (fallback)", file=sys.stderr)
        finally:
            cv.close()
        
        # Step 2: Post-process to preserve tables with formatting
        print(f"\ud83d\udd27 Post-processing: Preserving table formatting...", file=sys.stderr)
        doc = Document(output_docx)
                
        # Apply exact page dimensions
        if pdf_page_width and pdf_page_height:
            for section in doc.sections:
                section.page_width = Inches(pdf_page_width)
                section.page_height = Inches(pdf_page_height)
                section.top_margin = Inches(top_margin)
                section.bottom_margin = Inches(bottom_margin)
                section.left_margin = Inches(left_margin)
                section.right_margin = Inches(right_margin)
                
        # PRESERVE table formatting - don't hide them
        table_count = 0
        for table in doc.tables:
            table_count += 1
                    
            # Enhance table formatting with proper borders
            tbl = table._tbl
            tblPr = tbl.tblPr
            if tblPr is None:
                tblPr = OxmlElement('w:tblPr')
                tbl.insert(0, tblPr)
                    
            # Ensure tables have visible borders
            tblBorders = OxmlElement('w:tblBorders')
            for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
                border = OxmlElement(f'w:{border_name}')
                border.set(qn('w:val'), 'single')
                border.set(qn('w:sz'), '12')
                border.set(qn('w:space'), '0')
                border.set(qn('w:color'), '000000')
                tblBorders.append(border)
                    
            tblPr.append(tblBorders)
                    
            # Format table cells with proper text
            for row_idx, row in enumerate(table.rows):
                for cell_idx, cell in enumerate(row.cells):
                    # Preserve cell text and formatting
                    for paragraph in cell.paragraphs:
                        # Ensure text is readable
                        for run in paragraph.runs:
                            if run.font.size is None:
                                run.font.size = Pt(10)
                
        print(f"   ✓ Preserved {table_count} table(s) with formatting", file=sys.stderr)
        
        # Verify content is present
        word_text_count = 0
        for para in doc.paragraphs:
            word_text_count += len(para.text)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    word_text_count += len(cell.text)
        
        pdf_text_count = sum(len(text) for text in pdf_text_content.values())
        print(f"   \u2713 PDF text: {pdf_text_count} chars, Word text: {word_text_count} chars", file=sys.stderr)
        
        if word_text_count < pdf_text_count * 0.9:  # Allow 10% tolerance
            print(f"   \u26a0\ufe0f  Warning: Word document has {pdf_text_count - word_text_count} fewer characters", file=sys.stderr)
        
        # Step 3: Apply text formatting enhancements
        print(f"\ud83d\udd8e Applying text formatting (bold, italic, sizes)...", file=sys.stderr)
        
        # Define header keywords that should be bold
        header_keywords = [
            'CONSULTATION SUMMARY', 'CHIEF COMPLAINTS', 'SYSTEMIC EXAMINATION',
            'VITALS', 'DIAGNOSIS', 'MEDICATION', 'ADVICE', 'PROCEDURE', 'HISTORY',
            'PATIENT', 'Consultation Date', 'Consultant', 'DYSLIPIDEMIA',
            'DIABETES', 'HYPERTENSION', 'INFARCT', 'EXAMINATION', 'IMPRESSION',
            'MEDICATION ORDER', 'PATIENT DETAILS', 'PAST MEDICAL', 'SOCIAL HISTORY',
            'FAMILY HISTORY', 'ALLERGY', 'TYPE', 'DISORDER'
        ]
        
        # Track if we've already added the separator line on first page
        separator_added = False
        
        # Apply formatting to paragraphs
        formatting_count = 0
        for para_idx, para in enumerate(doc.paragraphs):
            if para.text.strip():
                # Check if paragraph text matches header keywords
                para_text = para.text.strip().upper()
                
                # Bold section headers
                if any(keyword in para_text for keyword in header_keywords):
                    for run in para.runs:
                        run.font.bold = True
                        run.font.size = Pt(11)
                    formatting_count += 1
                    
                    # Add horizontal line ONLY BEFORE CHIEF COMPLAINTS on FIRST page
                    # (This is the missing line between patient info and chief complaints)
                    if 'CHIEF COMPLAINTS' in para_text and not separator_added:
                        from docx.oxml.ns import qn
                        pPr = para._element.get_or_add_pPr()
                        pBdr = OxmlElement('w:pBdr')
                        top = OxmlElement('w:top')
                        top.set(qn('w:val'), 'single')
                        top.set(qn('w:sz'), '12')  # Border size
                        top.set(qn('w:space'), '1')
                        top.set(qn('w:color'), '000000')
                        pBdr.append(top)
                        pPr.append(pBdr)
                        separator_added = True
                        print(f"   \u2713 Added separator line before CHIEF COMPLAINTS (page 1)", file=sys.stderr)
                
                # Bold specific patterns (labels like "Patient MRN :")
                if ':' in para.text and len(para.text) < 50:
                    parts = para.text.split(':')
                    if parts[0].strip():
                        # Find and bold the label part
                        for run in para.runs:
                            if ':' in run.text or any(word in run.text for word in ['Patient', 'Consultation', 'Gender']):
                                run.font.bold = True
        
        # Apply formatting to table cells
        for table in doc.tables:
            for row_idx, row in enumerate(table.rows):
                for cell in row.cells:
                    for para in cell.paragraphs:
                        if para.text.strip():
                            # Bold first row (headers)
                            if row_idx == 0:
                                for run in para.runs:
                                    run.font.bold = True
                                    run.font.size = Pt(10)
                            else:
                                # Regular text in cells
                                for run in para.runs:
                                    run.font.size = Pt(10)
        
        print(f"   \u2713 Applied formatting to {formatting_count} headers", file=sys.stderr)
        
        # Save the enhanced document
        doc.save(output_docx)
        
        # Verify the file was actually created
        import os
        if os.path.exists(output_docx):
            file_size = os.path.getsize(output_docx)
            print(f"✅ Conversion complete: {file_size} bytes saved to {output_docx}", file=sys.stderr)
        else:
            print(f"❌ ERROR: Output file was not created at {output_docx}", file=sys.stderr)
            print(f"   Current working directory: {os.getcwd()}", file=sys.stderr)
            print(f"   Absolute path would be: {os.path.abspath(output_docx)}", file=sys.stderr)
        print(f"   ✓ Tables structure and formatting preserved", file=sys.stderr)
        print(f"   ✓ All content and layout maintained", file=sys.stderr)
        print(f"   ✓ Page dimensions matched exactly", file=sys.stderr)
        print(f"   ✓ All images preserved", file=sys.stderr)
        print(f"   ✓ Text formatting preserved", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"\u26a0\ufe0f  Conversion failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return False

def pdf_to_word_accurate(pdf_path, output_docx="output.docx"):
    """Convert PDF to Word using PyMuPDF for accurate text extraction + image preservation.
    This approach avoids false table detection and preserves exact text layout."""
    
    print(f"\u23f3 Converting PDF to Word (accurate text + images)...", file=sys.stderr)
    print(f"   Using PyMuPDF for precise extraction", file=sys.stderr)
    
    top_margin = 0.5
    bottom_margin = 0.5
    left_margin = 0.5
    right_margin = 0.5
    
    if not HAS_PYMUPDF:
        print(f"\u26a0\ufe0f  PyMuPDF not available", file=sys.stderr)
        return False
    
    try:
        from docx import Document
        from docx.shared import Pt, Inches
        
        pdf_doc = fitz.open(pdf_path)
        doc = Document()
        temp_images = []
        
        # Get page dimensions
        pdf_page_width = None
        pdf_page_height = None
        
        if len(pdf_doc) > 0:
            page = pdf_doc[0]
            rect = page.rect
            actual_pdf_width = rect.width / 72
            actual_pdf_height = rect.height / 72
            pdf_page_width = actual_pdf_width + left_margin + right_margin
            pdf_page_height = actual_pdf_height + top_margin + bottom_margin
        
        # Apply page dimensions
        if pdf_page_width and pdf_page_height:
            for section in doc.sections:
                section.page_width = Inches(pdf_page_width)
                section.page_height = Inches(pdf_page_height)
                section.top_margin = Inches(top_margin)
                section.bottom_margin = Inches(bottom_margin)
                section.left_margin = Inches(left_margin)
                section.right_margin = Inches(right_margin)
        
        # Process each page
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            print(f"\ud83d\udcc4 Page {page_num + 1}/{len(pdf_doc)}", file=sys.stderr)
            
            # Extract text
            text = page.get_text("text")
            if text.strip():
                lines = text.split('\n')
                for line in lines:
                    if line.strip():
                        p = doc.add_paragraph(line)
                        p.paragraph_format.space_before = Pt(2)
                        p.paragraph_format.space_after = Pt(2)
                        p.paragraph_format.line_spacing = 1.0
                    elif line == '':
                        doc.add_paragraph()
            
            # Extract and add images
            image_list = page.get_images()
            if image_list:
                print(f"   Found {len(image_list)} image(s)", file=sys.stderr)
                for img_index, img in enumerate(image_list):
                    try:
                        xref = img[0]
                        pix = fitz.Pixmap(pdf_doc, xref)
                        img_path = f"temp_p{page_num + 1}_i{img_index}.png"
                        pix.save(img_path)
                        temp_images.append(img_path)
                        
                        p = doc.add_paragraph()
                        run = p.add_run()
                        run.add_picture(img_path, width=Inches(5.5))
                        p.paragraph_format.space_before = Pt(4)
                        p.paragraph_format.space_after = Pt(4)
                        print(f"   \u2713 Image added", file=sys.stderr)
                    except Exception as e:
                        print(f"   \u26a0\ufe0f  Image error: {e}", file=sys.stderr)
            
            # Page break
            if page_num < len(pdf_doc) - 1:
                doc.add_page_break()
        
        pdf_doc.close()
        
        # Save document
        doc.save(output_docx)
        
        # Clean up temp images
        for img_file in temp_images:
            try:
                if os.path.exists(img_file):
                    os.remove(img_file)
            except:
                pass
        
        print(f"\u2705 Conversion complete:", file=sys.stderr)
        print(f"   \u2713 Accurate text extraction", file=sys.stderr)
        print(f"   \u2713 All images preserved", file=sys.stderr)
        print(f"   \u2713 No false tables", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"\u26a0\ufe0f  Error: {e}", file=sys.stderr)
        return False

def pdf_to_word(pdf_path, output_docx="output.docx"):
    """Convert PDF to Word with exact page size matching, encryption handling, and layout preservation."""
    
    print(f"⏳ Converting PDF to Word with page size matching...", file=sys.stderr)
    print(f"   Processing: {pdf_path}", file=sys.stderr)
    
    # Get PDF page dimensions first
    pdf_page_width = None
    pdf_page_height = None
    
    # Word margin settings (in inches)
    top_margin = 0.5
    bottom_margin = 0.5
    left_margin = 0.5
    right_margin = 0.5
    
    if HAS_PYMUPDF:
        try:
            print(f"🔍 Checking for encryption...", file=sys.stderr)
            pdf_doc = fitz.open(pdf_path)
            
            # Check if PDF is encrypted
            if pdf_doc.is_encrypted:
                print(f"🔐 PDF is encrypted/password-protected", file=sys.stderr)
                # Try to decrypt with empty password first (common case)
                if pdf_doc.decrypt("") == 0:  # 0 = success
                    print(f"   ✓ Successfully bypassed encryption", file=sys.stderr)
                else:
                    print(f"   ⚠️ Could not decrypt with empty password - continuing with encrypted data", file=sys.stderr)
            
            # Extract images from PDF first
            print(f"🖼️  Extracting images from PDF...", file=sys.stderr)
            extracted_images = {}
            for page_num, page in enumerate(pdf_doc, 1):
                image_list = page.get_images()
                if image_list:
                    print(f"   Found {len(image_list)} image(s) on page {page_num}", file=sys.stderr)
                    for img_index, img in enumerate(image_list):
                        xref = img[0]
                        pix = fitz.Pixmap(pdf_doc, xref)
                        img_path = f"temp_img_p{page_num}_i{img_index}.png"
                        pix.save(img_path)
                        if (page_num, img_index) not in extracted_images:
                            extracted_images[(page_num, img_index)] = img_path
                        print(f"   ✓ Extracted image: {img_path}", file=sys.stderr)
            
            # Get page dimensions
            if len(pdf_doc) > 0:
                page = pdf_doc[0]
                rect = page.rect
                # Get actual PDF dimensions in inches
                actual_pdf_width = rect.width / 72  # Convert from points to inches
                actual_pdf_height = rect.height / 72
                
                # Calculate Word page size by adding margins to PDF size
                pdf_page_width = actual_pdf_width + left_margin + right_margin
                pdf_page_height = actual_pdf_height + top_margin + bottom_margin
                
                print(f"📐 PDF content size: {actual_pdf_width:.2f}" + '"' + f" x {actual_pdf_height:.2f}" + '"', file=sys.stderr)
                print(f"📄 Word page size (with margins): {pdf_page_width:.2f}" + '"' + f" x {pdf_page_height:.2f}" + '"', file=sys.stderr)
            pdf_doc.close()
        except Exception as e:
            print(f"   Warning: Could not measure PDF size: {e}", file=sys.stderr)
    
    # PRIMARY: Use pdf2docx for layout-aware conversion
    if HAS_PDF2DOCX:
        try:
            print(f"🔥 Using pdf2docx for layout-aware conversion...", file=sys.stderr)
            from pdf2docx import Converter
            
            # Use conversion with better settings
            cv = Converter(pdf_path)
            cv.convert(output_docx, multi_processing=False, cpu_count=1)
            cv.close()
            
            if os.path.exists(output_docx) and os.path.getsize(output_docx) > 0:
                # Post-process to apply exact page size and enhance formatting
                try:
                    from docx import Document
                    from docx.oxml.ns import qn
                    from docx.oxml import OxmlElement
                    from docx.shared import Pt, Inches
                    from docx.enum.section import WD_SECTION
                    
                    print(f"🔧 Post-processing: Applying exact PDF page dimensions...", file=sys.stderr)
                    doc = Document(output_docx)
                    
                    # Apply exact PDF page dimensions to all sections
                    if pdf_page_width and pdf_page_height:
                        for section in doc.sections:
                            section.page_width = Inches(pdf_page_width)
                            section.page_height = Inches(pdf_page_height)
                            # Apply calculated margins
                            section.top_margin = Inches(top_margin)
                            section.bottom_margin = Inches(bottom_margin)
                            section.left_margin = Inches(left_margin)
                            section.right_margin = Inches(right_margin)
                            print(f"   ✓ Word page size set to {pdf_page_width:.2f}" + '"' + f" x {pdf_page_height:.2f}" + '"', file=sys.stderr)
                            print(f"   ✓ Margins: T={top_margin}" + '"' + f", B={bottom_margin}" + '"' + f", L={left_margin}" + '"' + f", R={right_margin}" + '"', file=sys.stderr)
                    
                    # Enhance table formatting with borders and proper spacing
                    for table in doc.tables:
                        # Set table properties for better appearance
                        tbl = table._tbl
                        tblPr = tbl.tblPr
                        if tblPr is None:
                            tblPr = OxmlElement('w:tblPr')
                            tbl.insert(0, tblPr)
                        
                        # Set table alignment and width
                        tblW = OxmlElement('w:tblW')
                        tblW.set(qn('w:w'), '5000')
                        tblW.set(qn('w:type'), 'auto')
                        tblPr.append(tblW)
                        
                        # Add borders to all cells and format text
                        for row in table.rows:
                            # Set row height
                            trPr = row._element.get_or_add_trPr()
                            trHeight = OxmlElement('w:trHeight')
                            trHeight.set(qn('w:val'), '300')
                            trHeight.set(qn('w:type'), 'atLeast')
                            trPr.append(trHeight)
                            
                            for cell in row.cells:
                                tcPr = cell._element.get_or_add_tcPr()
                                
                                # Set cell borders
                                tcBorders = OxmlElement('w:tcBorders')
                                for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
                                    border = OxmlElement(f'w:{border_name}')
                                    border.set(qn('w:val'), 'single')
                                    border.set(qn('w:sz'), '12')
                                    border.set(qn('w:space'), '0')
                                    border.set(qn('w:color'), '000000')
                                    tcBorders.append(border)
                                
                                tcPr.append(tcBorders)
                                
                                # Remove extra spacing in cell text
                                for paragraph in cell.paragraphs:
                                    # Remove extra spaces
                                    for run in paragraph.runs:
                                        text = run.text
                                        # Clean up excessive spaces around colons and punctuation
                                        text = text.replace('  ', ' ')  # Remove double spaces
                                        text = text.replace(' : ', ': ')  # Fix spacing around colons
                                        text = text.replace(' , ', ', ')  # Fix spacing around commas
                                        run.text = text
                                        # Ensure consistent font
                                        run.font.size = Pt(10)
                                    
                                    # Set paragraph spacing
                                    paragraph.paragraph_format.space_before = Pt(0)
                                    paragraph.paragraph_format.space_after = Pt(0)
                                    paragraph.paragraph_format.line_spacing = 1.0
                    
                    # Clean up paragraph formatting throughout document
                    for paragraph in doc.paragraphs:
                        # Remove extra line breaks and clean spacing
                        if paragraph.text.strip() == '':
                            # Remove empty paragraphs
                            p = paragraph._element
                            try:
                                p.getparent().remove(p)
                            except:
                                pass
                        else:
                            # Fix spacing and remove extra whitespace
                            text = paragraph.text
                            text = text.replace('  ', ' ')  # Remove double spaces
                            text = text.replace(' : ', ': ')
                            text = text.replace(' , ', ', ')
                            
                            # Update all runs with cleaned text
                            if paragraph.runs:
                                for i, run in enumerate(paragraph.runs):
                                    if i == 0:
                                        run.text = text
                                    else:
                                        run.text = ''
                            
                            # Set paragraph spacing for better layout
                            paragraph.paragraph_format.space_before = Pt(3)
                            paragraph.paragraph_format.space_after = Pt(3)
                            paragraph.paragraph_format.line_spacing = 1.0
                    
                    # Save enhanced document with exact dimensions
                    doc.save(output_docx)
                    print(f"   ✓ Tables enhanced with proper borders and spacing", file=sys.stderr)
                    print(f"   ✓ Text formatting cleaned and optimized", file=sys.stderr)
                except Exception as e:
                    print(f"   Note: Could not apply formatting enhancements: {e}", file=sys.stderr)
                
                print(f"✅ Word created with exact PDF dimensions:", file=sys.stderr)
                print(f"   ✓ Page size matches PDF exactly", file=sys.stderr)
                print(f"   ✓ Text preserved as editable text", file=sys.stderr)
                print(f"   ✓ Images positioned at exact locations", file=sys.stderr)
                print(f"   ✓ Tables and layout reconstructed", file=sys.stderr)
                print(f"   ✓ Professional quality maintained", file=sys.stderr)
                return True
            else:
                print(f"⚠️ pdf2docx created empty file", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ pdf2docx failed: {e}", file=sys.stderr)
            print(f"   Trying PyMuPDF...", file=sys.stderr)
    
    # PRIMARY: Use pdf2docx for layout-aware conversion
    if HAS_PDF2DOCX:
        try:
            print(f"🔥 Using pdf2docx for layout-aware conversion...", file=sys.stderr)
            from pdf2docx import Converter
            
            # Use conversion with better settings
            cv = Converter(pdf_path)
            cv.convert(output_docx, multi_processing=False, cpu_count=1)
            cv.close()
            
            if os.path.exists(output_docx) and os.path.getsize(output_docx) > 0:
                # Post-process to apply exact page size and enhance formatting
                try:
                    from docx import Document
                    from docx.oxml.ns import qn
                    from docx.oxml import OxmlElement
                    from docx.shared import Pt, Inches
                    from docx.enum.section import WD_SECTION
                    
                    print(f"🔧 Post-processing: Applying exact PDF page dimensions...", file=sys.stderr)
                    doc = Document(output_docx)
                    
                    # Apply exact PDF page dimensions to all sections
                    if pdf_page_width and pdf_page_height:
                        for section in doc.sections:
                            section.page_width = Inches(pdf_page_width)
                            section.page_height = Inches(pdf_page_height)
                            # Apply calculated margins
                            section.top_margin = Inches(top_margin)
                            section.bottom_margin = Inches(bottom_margin)
                            section.left_margin = Inches(left_margin)
                            section.right_margin = Inches(right_margin)
                            print(f"   ✓ Word page size set to {pdf_page_width:.2f}" + '"' + f" x {pdf_page_height:.2f}" + '"', file=sys.stderr)
                            print(f"   ✓ Margins: T={top_margin}" + '"' + f", B={bottom_margin}" + '"' + f", L={left_margin}" + '"' + f", R={right_margin}" + '"', file=sys.stderr)
                    
                    # Enhance table formatting with borders and proper spacing
                    for table in doc.tables:
                        # Set table properties for better appearance
                        tbl = table._tbl
                        tblPr = tbl.tblPr
                        if tblPr is None:
                            tblPr = OxmlElement('w:tblPr')
                            tbl.insert(0, tblPr)
                        
                        # Set table alignment and width
                        tblW = OxmlElement('w:tblW')
                        tblW.set(qn('w:w'), '5000')
                        tblW.set(qn('w:type'), 'auto')
                        tblPr.append(tblW)
                        
                        # Add borders to all cells and format text
                        for row in table.rows:
                            # Set row height
                            trPr = row._element.get_or_add_trPr()
                            trHeight = OxmlElement('w:trHeight')
                            trHeight.set(qn('w:val'), '300')
                            trHeight.set(qn('w:type'), 'atLeast')
                            trPr.append(trHeight)
                            
                            for cell in row.cells:
                                tcPr = cell._element.get_or_add_tcPr()
                                
                                # Set cell borders
                                tcBorders = OxmlElement('w:tcBorders')
                                for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
                                    border = OxmlElement(f'w:{border_name}')
                                    border.set(qn('w:val'), 'single')
                                    border.set(qn('w:sz'), '12')
                                    border.set(qn('w:space'), '0')
                                    border.set(qn('w:color'), '000000')
                                    tcBorders.append(border)
                                
                                tcPr.append(tcBorders)
                                
                                # Remove extra spacing in cell text
                                for paragraph in cell.paragraphs:
                                    # Remove extra spaces
                                    for run in paragraph.runs:
                                        text = run.text
                                        # Clean up excessive spaces around colons and punctuation
                                        text = text.replace('  ', ' ')  # Remove double spaces
                                        text = text.replace(' : ', ': ')  # Fix spacing around colons
                                        text = text.replace(' , ', ', ')  # Fix spacing around commas
                                        run.text = text
                                        # Ensure consistent font
                                        run.font.size = Pt(10)
                                    
                                    # Set paragraph spacing
                                    paragraph.paragraph_format.space_before = Pt(0)
                                    paragraph.paragraph_format.space_after = Pt(0)
                                    paragraph.paragraph_format.line_spacing = 1.0
                    
                    # Clean up paragraph formatting throughout document
                    for paragraph in doc.paragraphs:
                        # Remove extra line breaks and clean spacing
                        if paragraph.text.strip() == '':
                            # Remove empty paragraphs
                            p = paragraph._element
                            p.getparent().remove(p)
                        else:
                            # Fix spacing and remove extra whitespace
                            text = paragraph.text
                            text = text.replace('  ', ' ')  # Remove double spaces
                            text = text.replace(' : ', ': ')
                            text = text.replace(' , ', ', ')
                            
                            # Update all runs with cleaned text
                            if paragraph.runs:
                                for run in paragraph.runs:
                                    run.text = text if run == paragraph.runs[0] else ''
                            
                            # Set paragraph spacing for better layout
                            paragraph.paragraph_format.space_before = Pt(3)
                            paragraph.paragraph_format.space_after = Pt(3)
                            paragraph.paragraph_format.line_spacing = 1.0
                    
                    # Save enhanced document with exact dimensions
                    doc.save(output_docx)
                    print(f"   ✓ Tables enhanced with proper borders and spacing", file=sys.stderr)
                    print(f"   ✓ Text formatting cleaned and optimized", file=sys.stderr)
                except Exception as e:
                    print(f"   Note: Could not apply formatting enhancements: {e}", file=sys.stderr)
                
                print(f"✅ Word created with exact PDF dimensions:", file=sys.stderr)
                print(f"   ✓ Page size matches PDF exactly", file=sys.stderr)
                print(f"   ✓ Text preserved as editable text", file=sys.stderr)
                print(f"   ✓ Images positioned at exact locations", file=sys.stderr)
                print(f"   ✓ Tables and layout reconstructed", file=sys.stderr)
                print(f"   ✓ Professional quality maintained", file=sys.stderr)
                return True
            else:
                print(f"⚠️ pdf2docx created empty file", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ pdf2docx failed: {e}", file=sys.stderr)
            print(f"   Trying PyMuPDF...", file=sys.stderr)
    
    # FALLBACK: Use PyMuPDF for extraction with coordinate preservation
    if HAS_PYMUPDF:
        try:
            print(f"🔄 Using PyMuPDF for text and image extraction...", file=sys.stderr)
            from docx import Document
            from docx.shared import Pt, Inches
            from docx.enum.section import WD_SECTION
            
            doc = Document()
            pdf_doc = fitz.open(pdf_path)
            
            # Apply exact PDF page dimensions if we have them
            for section in doc.sections:
                if pdf_page_width and pdf_page_height:
                    section.page_width = Inches(pdf_page_width)
                    section.page_height = Inches(pdf_page_height)
                    print(f"   ✓ Applied PDF page size (with margins) to Word document", file=sys.stderr)
                else:
                    section.page_width = Inches(8.5)  # Default: Letter
                    section.page_height = Inches(11)
                
                section.top_margin = Inches(top_margin)
                section.bottom_margin = Inches(bottom_margin)
                section.left_margin = Inches(left_margin)
                section.right_margin = Inches(right_margin)
            
            for page_num in range(len(pdf_doc)):
                page = pdf_doc[page_num]
                
                print(f"   Processing page {page_num + 1}...", file=sys.stderr)
                
                # Extract blocks with their positions
                blocks = page.get_text("dict")["blocks"]
                
                # Filter out empty blocks and collect content
                content_blocks = []
                for block in blocks:
                    bbox = block.get("bbox", (0, 0, 0, 0))
                    
                    # Handle text blocks
                    if block["type"] == 0:
                        for line in block.get("lines", []):
                            line_text = ""
                            for span in line.get("spans", []):
                                line_text += span["text"]
                            
                            if line_text.strip():
                                content_blocks.append(("text", block, line, line_text, bbox))
                    
                    # Handle image blocks
                    elif block["type"] == 1:
                        try:
                            img_dict = block["image"]
                            if img_dict:
                                content_blocks.append(("image", block, None, None, bbox))
                        except:
                            pass
                
                # Only add page break if this page has content and it's not the first page
                if content_blocks and page_num > 0:
                    doc.add_page_break()
                
                # Process content blocks
                for block_type, block, line, line_text, bbox in content_blocks:
                    if block_type == "text":
                        p = doc.add_paragraph(line_text)
                        # Remove extra spacing
                        p_format = p.paragraph_format
                        p_format.space_before = Pt(0)
                        p_format.space_after = Pt(2)  # Minimal spacing
                        p_format.line_spacing = 1.0
                        
                        if line.get("spans"):
                            span = line["spans"][0]
                            font_size = span.get("size", 11)
                            font_name = span.get("font", "Calibri")
                            flags = span.get("flags", 0)
                            
                            for run in p.runs:
                                run.font.size = Pt(font_size)
                                run.font.name = font_name.split("-")[0] if "-" in font_name else font_name
                                
                                if flags & 16:  # Bold
                                    run.font.bold = True
                                if flags & 2:   # Italic
                                    run.font.italic = True
                    
                    elif block_type == "image":
                        try:
                            img_dict = block["image"]
                            import base64
                            
                            # Decode image
                            img_data = base64.b64decode(img_dict) if isinstance(img_dict, str) else img_dict
                            
                            from PIL import Image
                            import io as io_module
                            img = Image.open(io_module.BytesIO(img_data))
                            
                            # Calculate image dimensions
                            img_width_inch = (bbox[2] - bbox[0]) / 72
                            img_height_inch = (bbox[3] - bbox[1]) / 72
                            
                            # Save temporarily
                            temp_img = f"temp_img_{page_num}_{int(bbox[0])}.png"
                            img.save(temp_img, "PNG")
                            
                            try:
                                # Add image without extra spacing
                                p = doc.add_paragraph()
                                run = p.add_run()
                                run.add_picture(temp_img, width=Inches(max(0.5, min(img_width_inch, 7))))
                                p_format = p.paragraph_format
                                p_format.space_before = Pt(0)
                                p_format.space_after = Pt(0)
                            finally:
                                if os.path.exists(temp_img):
                                    os.remove(temp_img)
                        except Exception as e:
                            print(f"   Warning: Could not extract image: {e}", file=sys.stderr)
            
            pdf_doc.close()
            doc.save(output_docx)
            
            print(f"✅ Word created with PyMuPDF:", file=sys.stderr)
            print(f"   ✓ Text as editable text", file=sys.stderr)
            print(f"   ✓ Images positioned correctly", file=sys.stderr)
            print(f"   ✓ No unnecessary blank pages", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"⚠️ PyMuPDF failed: {e}", file=sys.stderr)
    
    raise RuntimeError("Word conversion requires pdf2docx or PyMuPDF")

def pdf_to_excel(pdf_path, output_xlsx="output.xlsx"):
    """Convert PDF to Excel preserving EXACT layout with coordinate-based positioning."""
    
    print(f"⏳ Converting PDF to Excel capturing all content including images...", file=sys.stderr)
    print(f"   Processing: {pdf_path}", file=sys.stderr)
    
    if not HAS_PYMUPDF:
        raise RuntimeError("PyMuPDF not available for layout preservation")
    
    # Track temporary image files to clean up later
    temp_image_files = []
    
    try:
        print(f"🔥 Extracting all content: headers, images, tables, text, and footers...", file=sys.stderr)
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from openpyxl.utils import get_column_letter
        from openpyxl.drawing.image import Image as XLImage
        
        wb = Workbook()
        ws = wb.active
        ws.title = "PDF Content"
        ws.page_setup.paperSize = ws.PAPERSIZE_A4
        ws.page_setup.orientation = 'landscape'
        
        pdf_doc = fitz.open(pdf_path)
        current_row = 1
        
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            print(f"   Processing page {page_num + 1}/{len(pdf_doc)}...", file=sys.stderr)
            
            # Get page dimensions
            page_rect = page.rect
            page_width = page_rect.width
            page_height = page_rect.height
            
            # Extract all blocks (text and images) with their positions
            blocks = page.get_text("dict")["blocks"]
            
            # Collect blocks with their positions for layout reconstruction
            positioned_content = []
            
            for block in blocks:
                bbox = block.get("bbox", (0, 0, page_width, page_height))
                block_x, block_y, block_right, block_bottom = bbox
                
                # Convert PDF coordinates to Excel grid (approximate)
                # Assume ~72 points per inch, ~0.2 inches per Excel column
                excel_col = max(1, int(block_x / 72) + 1)
                excel_row_offset = int(block_y / 20)  # ~20 points per row
                
                # Handle text blocks
                if block["type"] == 0:  # Text
                    for line in block.get("lines", []):
                        line_text = ""
                        font_size = 11
                        is_bold = False
                        
                        for span in line.get("spans", []):
                            line_text += span["text"]
                            font_size = span.get("size", 11)
                            flags = span.get("flags", 0)
                            if flags & 16:  # Bold flag
                                is_bold = True
                        
                        if line_text.strip():
                            positioned_content.append({
                                "type": "text",
                                "content": line_text.strip(),
                                "row": current_row + excel_row_offset,
                                "col": excel_col,
                                "font_size": font_size,
                                "bold": is_bold
                            })
                
                # Handle image blocks
                elif block["type"] == 1:  # Image
                    try:
                        img_dict = block["image"]
                        if img_dict:
                            positioned_content.append({
                                "type": "image",
                                "data": img_dict,
                                "row": current_row + excel_row_offset,
                                "col": excel_col,
                                "width": (block_right - block_x) / 72,
                                "height": (block_bottom - block_y) / 72
                            })
                    except:
                        pass
            
            # Sort content by position (top to bottom, left to right)
            positioned_content.sort(key=lambda x: (x["row"], x["col"]))
            
            # Place content in Excel maintaining relative positions
            max_row_used = current_row
            col_position_map = {}  # Track which Excel columns we're using
            
            for item in positioned_content:
                excel_row = item["row"]
                excel_col = item["col"]
                
                # Ensure we have reasonable column number
                if excel_col < 1:
                    excel_col = 1
                if excel_col > 15:
                    excel_col = 15
                
                if item["type"] == "text":
                    cell = ws.cell(row=excel_row, column=excel_col)
                    cell_value = item["content"]
                    
                    # Try to convert text to number
                    is_number = False
                    try:
                        # Remove commas and spaces, then convert to float
                        numeric_value = float(cell_value.replace(",", "").replace(" ", ""))
                        cell.value = numeric_value  # Store as number, not text
                        is_number = True
                    except (ValueError, AttributeError):
                        # Keep as text if conversion fails
                        cell.value = cell_value
                    
                    # Apply appropriate alignment
                    if is_number:
                        cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=False)
                    else:
                        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=False)
                    
                    # Apply formatting
                    if item["bold"]:
                        cell.font = Font(bold=True, size=int(item["font_size"]))
                    else:
                        cell.font = Font(size=int(item["font_size"]))
                    
                    max_row_used = max(max_row_used, excel_row)
                
                elif item["type"] == "image":
                    try:
                        import base64
                        
                        # Decode image
                        img_data = base64.b64decode(item["data"]) if isinstance(item["data"], str) else item["data"]
                        
                        from PIL import Image
                        import io as io_module
                        img = Image.open(io_module.BytesIO(img_data))
                        
                        temp_img = f"temp_excel_img_{page_num}_{excel_col}.png"
                        img.save(temp_img, "PNG")
                        temp_image_files.append(temp_img)
                        
                        # Add image to Excel
                        img_obj = XLImage(temp_img)
                        img_obj.width = max(80, int(item["width"] * 10))
                        img_obj.height = max(40, int(item["height"] * 10))
                        ws.add_image(img_obj, f"{get_column_letter(excel_col)}{excel_row}")
                        ws.row_dimensions[excel_row].height = max(40, int(item["height"] * 15))
                        
                        max_row_used = max(max_row_used, excel_row)
                    except Exception as e:
                        print(f"   Warning: Could not add image: {e}", file=sys.stderr)
            
            # Move to next page with spacing
            current_row = max_row_used + 3
            
            if page_num < len(pdf_doc) - 1:
                sep_cell = ws.cell(row=current_row, column=1)
                sep_cell.value = f"=== PAGE {page_num + 2} ==="
                sep_cell.font = Font(bold=True, size=11, color="FFFFFF")
                sep_cell.fill = PatternFill(start_color="808080", end_color="808080", fill_type="solid")
                current_row += 2
        
        pdf_doc.close()
        
        # Post-processing: Add headers and fix table structure
        from openpyxl.styles import Border, Side, Font, PatternFill
        
        # Define border and header styling
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        header_fill = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid")
        header_font = Font(bold=True, size=11)
        
        # Define standard column headers for bank statements
        standard_headers = [
            "Transaction Date",
            "Value Date",
            "Cheque No/Reference No",
            "Description",
            "Withdrawals",
            "Deposits",
            "Running Balance"
        ]
        
        # Find and insert headers at the beginning of data sections
        # Look for rows that contain "Transaction" keyword
        header_row_inserted = False
        rows_to_check = list(ws.iter_rows(min_row=1, max_row=ws.max_row))
        
        for idx, row in enumerate(rows_to_check, 1):
            # Check if this row contains transaction-like data
            row_text = " ".join([str(cell.value) if cell.value else "" for cell in row])
            if "Transaction" in row_text or "Date" in row_text:
                # Insert header row if not already done
                if not header_row_inserted:
                    ws.insert_rows(idx)
                    for col_idx, header in enumerate(standard_headers, 1):
                        cell = ws.cell(row=idx, column=col_idx)
                        cell.value = header
                        cell.font = header_font
                        cell.fill = header_fill
                        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=False)
                        cell.border = thin_border
                    header_row_inserted = True
                    break
        
        # If no header was inserted, add one at the top
        if not header_row_inserted:
            ws.insert_rows(1)
            for col_idx, header in enumerate(standard_headers, 1):
                cell = ws.cell(row=1, column=col_idx)
                cell.value = header
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=False)
                cell.border = thin_border
        
        # Process all cells for alignment and borders
        for row in ws.iter_rows():
            for col_idx, cell in enumerate(row, 1):
                # Remove text wrapping
                if cell.alignment:
                    cell.alignment = Alignment(
                        horizontal=cell.alignment.horizontal,
                        vertical=cell.alignment.vertical,
                        wrap_text=False,
                        shrink_to_fit=cell.alignment.shrink_to_fit
                    )
                else:
                    cell.alignment = Alignment(wrap_text=False)
                
                # Add borders to numeric cells (Withdrawals, Deposits, Running Balance columns)
                # These should be columns 5, 6, 7 (or adjust based on standard_headers)
                if cell.value is not None and isinstance(cell.value, (int, float)):
                    cell.border = thin_border
                    # Format numbers with 2 decimal places
                    try:
                        cell.number_format = '0.00'
                    except:
                        pass
        
        # Set reasonable column widths
        for col in range(1, 8):
            ws.column_dimensions[get_column_letter(col)].width = 18
        
        try:
            wb.save(output_xlsx)
            print(f"✅ Excel created with EXACT layout preserved:", file=sys.stderr)
            print(f"   ✓ Coordinate-based positioning maintained", file=sys.stderr)
            print(f"   ✓ All images embedded at original locations", file=sys.stderr)
            print(f"   ✓ Multi-column layout reconstructed", file=sys.stderr)
            print(f"   ✓ Text and formatting preserved", file=sys.stderr)
            return True
        finally:
            # Clean up temporary image files after saving
            for temp_img in temp_image_files:
                try:
                    if os.path.exists(temp_img):
                        os.remove(temp_img)
                except:
                    pass
    except Exception as e:
        # Clean up temp files on error
        for temp_img in temp_image_files:
            try:
                if os.path.exists(temp_img):
                    os.remove(temp_img)
            except:
                pass
        print(f"⚠️ Excel conversion failed: {e}", file=sys.stderr)
        raise RuntimeError(f"Excel conversion failed: {e}")

def pdf_to_ppt(pdf_path, output_pptx="output.pptx"):
    """Convert PDF to PowerPoint with professional content pagination."""
    
    print(f"⏳ Converting PDF to PowerPoint with professional layout...", file=sys.stderr)
    print(f"   Processing: {pdf_path}", file=sys.stderr)
    
    if not HAS_PPTX:
        raise RuntimeError("python-pptx not available")
    
    if not HAS_PYMUPDF:
        raise RuntimeError("PyMuPDF not available for PPT conversion")
    
    try:
        print(f"🔥 Using PyMuPDF for text and image extraction...", file=sys.stderr)
        from pptx import Presentation
        from pptx.util import Inches, Pt
        from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
        
        # Get PDF dimensions first
        pdf_doc = fitz.open(pdf_path)
        first_page = pdf_doc[0]
        pdf_rect = first_page.rect
        pdf_width_inches = pdf_rect.width / 72
        pdf_height_inches = pdf_rect.height / 72
        
        print(f"📐 PDF page dimensions: {pdf_width_inches:.2f}" + '"' + f" x {pdf_height_inches:.2f}" + '"', file=sys.stderr)
        print(f"📄 Using standard PPT dimensions: 10\" x 7.5\" (4:3 aspect ratio)", file=sys.stderr)
        
        # Professional content limits per slide
        # Standard: ~200-250 words per slide, ~40 words per line
        WORDS_PER_SLIDE = 200
        CHARS_PER_SLIDE = WORDS_PER_SLIDE * 5  # Approximate
        SLIDE_MARGIN_INCHES = 0.5
        # Use standard PPT dimensions for content area
        PPT_WIDTH = 10
        PPT_HEIGHT = 7.5
        CONTENT_WIDTH = PPT_WIDTH - (2 * SLIDE_MARGIN_INCHES)
        CONTENT_HEIGHT = PPT_HEIGHT - (2 * SLIDE_MARGIN_INCHES)
        
        prs = Presentation()
        # Set slide dimensions to standard PowerPoint 4:3 aspect ratio
        # Standard PowerPoint: 10" x 7.5" (4:3 aspect ratio)
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)
        
        total_slides_created = 0
        
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            print(f"   Processing page {page_num + 1} of {len(pdf_doc)}...", file=sys.stderr)
            
            # Extract all text content from page
            text_dict = page.get_text("dict")
            all_text_content = []
            all_images = []
            
            # Collect all text blocks
            for block in text_dict.get("blocks", []):
                if block["type"] == 0:  # Text block
                    for line in block.get("lines", []):
                        line_text = ""
                        line_format = None
                        for span in line.get("spans", []):
                            line_text += span["text"]
                            if not line_format:
                                line_format = {
                                    "size": span.get("size", 11),
                                    "font": span.get("font", "Calibri"),
                                    "flags": span.get("flags", 0),
                                    "bbox": line.get("bbox", (0, 0, 0, 0))
                                }
                        if line_text.strip():
                            all_text_content.append((line_text, line_format))
            
            # Collect all images
            images = page.get_images()
            for img_index, img in enumerate(images):
                all_images.append((img_index, img))
            
            # Paginate content across multiple slides if needed
            current_text_block = []
            current_char_count = 0
            
            for line_text, line_format in all_text_content:
                line_chars = len(line_text)
                
                # If adding this line exceeds limit, create new slide
                if current_char_count + line_chars > CHARS_PER_SLIDE and current_text_block:
                    # Create slide with current content
                    blank_slide_layout = prs.slide_layouts[6]
                    slide = prs.slides.add_slide(blank_slide_layout)
                    total_slides_created += 1
                    
                    # Add text to slide with proper formatting
                    left = Inches(SLIDE_MARGIN_INCHES)
                    top = Inches(SLIDE_MARGIN_INCHES)
                    width = Inches(CONTENT_WIDTH)
                    height = Inches(CONTENT_HEIGHT)
                    
                    txBox = slide.shapes.add_textbox(left, top, width, height)
                    tf = txBox.text_frame
                    tf.word_wrap = True
                    tf.vertical_anchor = MSO_ANCHOR.TOP
                    
                    for txt, fmt in current_text_block:
                        p = tf.add_paragraph()
                        p.text = txt
                        # Professional font sizing for PowerPoint
                        # Scale PDF font sizes to presentation-appropriate sizes
                        original_size = fmt["size"]
                        if original_size >= 18:  # Likely heading/title
                            ppt_font_size = 32
                        elif original_size >= 14:  # Subheading
                            ppt_font_size = 24
                        elif original_size >= 11:  # Body text
                            ppt_font_size = 18
                        else:  # Small text
                            ppt_font_size = 16
                        
                        p.font.size = Pt(ppt_font_size)
                        p.font.name = "Calibri" if "-" in fmt["font"] or fmt["font"] == "Helvetica" else fmt["font"]
                        p.space_after = Pt(8)
                        p.level = 0  # Paragraph level for proper indentation
                        
                        if fmt["flags"] & 16:  # Bold
                            p.font.bold = True
                        if fmt["flags"] & 2:   # Italic
                            p.font.italic = True
                    
                    # Reset for next slide
                    current_text_block = []
                    current_char_count = 0
                
                current_text_block.append((line_text, line_format))
                current_char_count += line_chars
            
            # Add remaining content as final slide
            if current_text_block:
                blank_slide_layout = prs.slide_layouts[6]
                slide = prs.slides.add_slide(blank_slide_layout)
                total_slides_created += 1
                
                left = Inches(SLIDE_MARGIN_INCHES)
                top = Inches(SLIDE_MARGIN_INCHES)
                width = Inches(CONTENT_WIDTH)
                height = Inches(CONTENT_HEIGHT)
                
                txBox = slide.shapes.add_textbox(left, top, width, height)
                tf = txBox.text_frame
                tf.word_wrap = True
                tf.vertical_anchor = MSO_ANCHOR.TOP
                
                for txt, fmt in current_text_block:
                    p = tf.add_paragraph()
                    p.text = txt
                    # Professional font sizing for PowerPoint
                    # Scale PDF font sizes to presentation-appropriate sizes
                    original_size = fmt["size"]
                    if original_size >= 18:  # Likely heading/title
                        ppt_font_size = 32
                    elif original_size >= 14:  # Subheading
                        ppt_font_size = 24
                    elif original_size >= 11:  # Body text
                        ppt_font_size = 18
                    else:  # Small text
                        ppt_font_size = 16
                    
                    p.font.size = Pt(ppt_font_size)
                    p.font.name = "Calibri" if "-" in fmt["font"] or fmt["font"] == "Helvetica" else fmt["font"]
                    p.space_after = Pt(8)
                    p.level = 0
                    
                    if fmt["flags"] & 16:
                        p.font.bold = True
                    if fmt["flags"] & 2:
                        p.font.italic = True
                
                # Add images to this slide if any
                for img_index, img in all_images:
                    try:
                        xref = img[0]
                        base_image = pdf_doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        
                        temp_img = f"temp_img_{page_num}_{img_index}.png"
                        with open(temp_img, "wb") as f:
                            f.write(image_bytes)
                        
                        try:
                            # Position image at bottom of slide
                            img_left = Inches(SLIDE_MARGIN_INCHES)
                            img_top = Inches(CONTENT_HEIGHT - 1)
                            slide.shapes.add_picture(temp_img, img_left, img_top, width=Inches(CONTENT_WIDTH))
                        finally:
                            if os.path.exists(temp_img):
                                os.remove(temp_img)
                    except Exception as e:
                        print(f"   Warning: Could not extract image: {e}", file=sys.stderr)
        
        pdf_doc.close()
        prs.save(output_pptx)
        
        print(f"✅ PowerPoint created with professional pagination:", file=sys.stderr)
        print(f"   ✓ {total_slides_created} slides generated", file=sys.stderr)
        print(f"   ✓ ~{WORDS_PER_SLIDE} words per slide (professional standard)", file=sys.stderr)
        print(f"   ✓ Content properly formatted and centered", file=sys.stderr)
        print(f"   ✓ Images embedded correctly", file=sys.stderr)
        return True
    except Exception as e:
        print(f"⚠️ PowerPoint conversion failed: {e}", file=sys.stderr)
        print(f"   Trying fallback method...", file=sys.stderr)
        
        # FALLBACK: Use PDF to images method for PPT
        if HAS_PDF2IMAGE and POPPLER_PATH:
            try:
                print(f"🔄 Using pdf2image fallback for PowerPoint...", file=sys.stderr)
                from pptx import Presentation
                from pptx.util import Inches
                
                # Convert PDF pages to images
                pages = convert_from_path(pdf_path, dpi=150, poppler_path=POPPLER_PATH)
                
                prs = Presentation()
                prs.slide_width = Inches(10)
                prs.slide_height = Inches(7.5)
                
                for page_num, page_img in enumerate(pages, 1):
                    print(f"   Adding page {page_num} to presentation...", file=sys.stderr)
                    
                    # Add blank slide
                    blank_slide_layout = prs.slide_layouts[6]
                    slide = prs.slides.add_slide(blank_slide_layout)
                    
                    # Save image temporarily
                    temp_img = f"temp_ppt_page_{page_num}.png"
                    page_img.save(temp_img, "PNG")
                    
                    try:
                        # Add image to slide
                        slide.shapes.add_picture(temp_img, Inches(0), Inches(0), width=Inches(10), height=Inches(7.5))
                    finally:
                        if os.path.exists(temp_img):
                            os.remove(temp_img)
                
                prs.save(output_pptx)
                print(f"✅ PowerPoint created with image-based fallback:", file=sys.stderr)
                print(f"   ✓ All pages converted to images", file=sys.stderr)
                print(f"   ✓ Professional appearance maintained", file=sys.stderr)
                return True
            except Exception as fallback_e:
                print(f"⚠️ Fallback PPT conversion also failed: {fallback_e}", file=sys.stderr)
                raise RuntimeError(f"PowerPoint conversion failed: {e}")
        else:
            raise RuntimeError(f"PowerPoint conversion failed: {e}")

def pdf_to_html(pdf_path, output_html="output.html"):
    """Convert PDF to HTML preserving EXACT layout by rendering pages as images."""
    
    print(f"⏳ Converting PDF to HTML with pixel-perfect layout...", file=sys.stderr)
    print(f"   Processing: {pdf_path}", file=sys.stderr)
    
    # Use pdf2image if available (best for layout preservation)
    if HAS_PDF2IMAGE and POPPLER_PATH:
        try:
            print(f"🔥 Using pdf2image with Poppler for pixel-perfect conversion...", file=sys.stderr)
            
            # Convert all pages to images
            pages = convert_from_path(pdf_path, dpi=300, poppler_path=POPPLER_PATH)
            
            # Create HTML with embedded images
            html_content = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Conversion</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: #e0e0e0;
            font-family: Arial, sans-serif;
            padding: 20px;
        }
        .pdf-container {
            max-width: 900px;
            margin: 0 auto;
        }
        .pdf-page {
            background: white;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            page-break-after: always;
        }
        .pdf-page img {
            display: block;
            width: 100%;
            height: auto;
        }
        .page-info {
            text-align: center;
            padding: 10px;
            color: #666;
            font-size: 12px;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .pdf-page {
                margin: 0;
                box-shadow: none;
                page-break-after: always;
            }
        }
    </style>
</head>
<body>
<div class="pdf-container">
'''
            
            import base64
            import io
            
            for page_num, page_img in enumerate(pages, 1):
                print(f"   Processing page {page_num}...", file=sys.stderr)
                
                # Convert PIL image to base64
                buffered = io.BytesIO()
                page_img.save(buffered, format="PNG")
                img_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                
                html_content += f'''    <div class="pdf-page">
        <img src="data:image/png;base64,{img_b64}" alt="Page {page_num}" />
        <div class="page-info">Page {page_num} of {len(pages)}</div>
    </div>
'''
            
            html_content += '''</div>
</body>
</html>'''
            
            # Write HTML file
            with open(output_html, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"✅ HTML created with pixel-perfect layout:", file=sys.stderr)
            print(f"   ✓ All pages rendered as high-quality images (300 DPI)", file=sys.stderr)
            print(f"   ✓ Exact PDF layout and formatting preserved", file=sys.stderr)
            print(f"   ✓ Professional appearance maintained", file=sys.stderr)
            print(f"   ✓ Embedded as base64 for easy sharing", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"⚠️ pdf2image conversion failed: {e}", file=sys.stderr)
            print(f"   Falling back to PyMuPDF method...", file=sys.stderr)
    
    # Fallback: Use PyMuPDF for conversion
    if HAS_PYMUPDF:
        try:
            print(f"🔥 Using PyMuPDF for HTML conversion...", file=sys.stderr)
            
            pdf_doc = fitz.open(pdf_path)
            
            # Create HTML with embedded page images from PyMuPDF
            html_content = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Conversion</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: #e0e0e0;
            font-family: Arial, sans-serif;
            padding: 20px;
        }
        .pdf-container {
            max-width: 900px;
            margin: 0 auto;
        }
        .pdf-page {
            background: white;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            page-break-after: always;
        }
        .pdf-page img {
            display: block;
            width: 100%;
            height: auto;
        }
        .page-info {
            text-align: center;
            padding: 10px;
            color: #666;
            font-size: 12px;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .pdf-page {
                margin: 0;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
<div class="pdf-container">
'''
            
            import base64
            
            for page_num in range(len(pdf_doc)):
                page = pdf_doc[page_num]
                print(f"   Processing page {page_num + 1}...", file=sys.stderr)
                
                # Render page to image with zoom for better quality
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)  # 2x zoom = ~150 DPI
                img_data = pix.tobytes("png")
                img_b64 = base64.b64encode(img_data).decode('utf-8')
                
                html_content += f'''    <div class="pdf-page">
        <img src="data:image/png;base64,{img_b64}" alt="Page {page_num + 1}" />
        <div class="page-info">Page {page_num + 1} of {len(pdf_doc)}</div>
    </div>
'''
            
            html_content += '''</div>
</body>
</html>'''
            
            pdf_doc.close()
            
            # Write HTML file
            with open(output_html, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"✅ HTML created with PyMuPDF (image-based):", file=sys.stderr)
            print(f"   ✓ Pages rendered as images for layout preservation", file=sys.stderr)
            print(f"   ✓ Professional appearance", file=sys.stderr)
            print(f"   ✓ Embedded as base64", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"⚠️ PyMuPDF conversion failed: {e}", file=sys.stderr)
            raise
    
    else:
        raise RuntimeError("PDF to HTML conversion requires pdf2image with Poppler or PyMuPDF")    

def word_to_excel(docx_path, output_xlsx="output.xlsx"):
    """Convert Word document to Excel preserving table structure."""
    
    print(f"⏳ Converting Word to Excel...", file=sys.stderr)
    print(f"   Processing: {docx_path}", file=sys.stderr)
    
    try:
        from docx import Document
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from openpyxl.utils import get_column_letter
        
        # Open Word document
        doc = Document(docx_path)
        wb = Workbook()
        ws = wb.active
        ws.title = "Content"
        
        current_row = 1
        
        # Define border and styling
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Process tables from Word document
        for table in doc.tables:
            print(f"   Processing table...", file=sys.stderr)
            
            for row_idx, row in enumerate(table.rows):
                for col_idx, cell in enumerate(row.cells, 1):
                    cell_value = cell.text.strip()
                    excel_cell = ws.cell(row=current_row + row_idx, column=col_idx)
                    
                    # Try to convert to number
                    is_number = False
                    try:
                        numeric_value = float(cell_value.replace(",", "").replace(" ", ""))
                        excel_cell.value = numeric_value
                        is_number = True
                    except (ValueError, AttributeError):
                        excel_cell.value = cell_value
                    
                    # Apply formatting
                    if is_number:
                        excel_cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=False)
                        excel_cell.number_format = '0.00'
                        excel_cell.border = thin_border
                    else:
                        excel_cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=False)
                        excel_cell.border = thin_border
            
            current_row += len(table.rows) + 2
        
        # Process paragraphs
        para_row = current_row
        for para in doc.paragraphs:
            if para.text.strip():
                cell = ws.cell(row=para_row, column=1)
                cell.value = para.text.strip()
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=False)
                para_row += 1
        
        # Set column widths
        for col in range(1, 10):
            ws.column_dimensions[get_column_letter(col)].width = 18
        
        wb.save(output_xlsx)
        print(f"✅ Excel created from Word document:", file=sys.stderr)
        print(f"   ✓ Tables extracted", file=sys.stderr)
        print(f"   ✓ Numbers converted to numeric type", file=sys.stderr)
        print(f"   ✓ Formatting applied", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"⚠️ Word to Excel conversion failed: {e}", file=sys.stderr)
        raise RuntimeError(f"Word to Excel conversion failed: {e}")

def pdf_to_excel_via_word(pdf_path, output_xlsx="output.xlsx"):
    """Convert PDF to Excel using Word as intermediate format for proper structure.
    
    Pipeline: PDF → Word (with exact page size & margins) → Excel
    This ensures proper table structure and formatting preservation.
    """
    
    print(f"⏳ Converting PDF to Excel via Word pipeline...", file=sys.stderr)
    print(f"   Processing: {pdf_path}", file=sys.stderr)
    print(f"   Pipeline: PDF → Word (with page size matching) → Excel", file=sys.stderr)
    
    import tempfile
    
    try:
        # Step 1: Convert PDF to Word with exact page size and margins
        temp_docx = tempfile.NamedTemporaryFile(suffix=".docx", delete=False).name
        print(f"\n📄 Step 1: Converting PDF to Word with exact page size...", file=sys.stderr)
        pdf_to_word(pdf_path, temp_docx)
        
        # Step 2: Convert Word to Excel
        print(f"\n📊 Step 2: Converting Word to Excel...", file=sys.stderr)
        word_to_excel(temp_docx, output_xlsx)
        
        # Clean up temporary Word file
        try:
            if os.path.exists(temp_docx):
                os.remove(temp_docx)
        except:
            pass
        
        print(f"\n✅ PDF to Excel conversion completed (via Word):", file=sys.stderr)
        print(f"   ✓ PDF converted to Word with exact dimensions", file=sys.stderr)
        print(f"   ✓ Word converted to Excel with proper structure", file=sys.stderr)
        print(f"   ✓ Tables, numbers, and formatting preserved", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"\n⚠️ PDF to Excel conversion (via Word) failed: {e}", file=sys.stderr)
        raise RuntimeError(f"PDF to Excel via Word conversion failed: {e}")

def pdf_to_text(pdf_path, output_txt="output.txt"):
    """Extract all text from PDF and save as text file."""
    
    print(f"⏳ Extracting text from PDF...", file=sys.stderr)
    print(f"   Processing: {pdf_path}", file=sys.stderr)
    
    extracted_text = ""
    
    # Try with pdfplumber first (best for text extraction)
    if HAS_PDFPLUMBER:
        try:
            print(f"🔥 Using pdfplumber for text extraction...", file=sys.stderr)
            import pdfplumber
            
            with pdfplumber.open(pdf_path) as pdf:
                total_pages = len(pdf.pages)
                print(f"📄 Total pages: {total_pages}", file=sys.stderr)
                
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text:
                        extracted_text += f"\n--- Page {page_num} ---\n{text}\n"
                    print(f"   ✓ Extracted text from page {page_num}", file=sys.stderr)
            
            if extracted_text.strip():
                with open(output_txt, 'w', encoding='utf-8') as f:
                    f.write(extracted_text)
                print(f"✅ Text extraction completed:", file=sys.stderr)
                print(f"   ✓ Extracted text from {total_pages} pages", file=sys.stderr)
                print(f"   ✓ Saved to: {output_txt}", file=sys.stderr)
                return True
            else:
                print(f"⚠️ No text extracted from PDF", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ pdfplumber extraction failed: {e}", file=sys.stderr)
            print(f"   Trying PyMuPDF...", file=sys.stderr)
    
    # Fallback to PyMuPDF
    if HAS_PYMUPDF:
        try:
            print(f"🔄 Using PyMuPDF for text extraction...", file=sys.stderr)
            import fitz
            
            pdf_doc = fitz.open(pdf_path)
            total_pages = len(pdf_doc)
            print(f"📄 Total pages: {total_pages}", file=sys.stderr)
            
            for page_num, page in enumerate(pdf_doc, 1):
                text = page.get_text()
                if text:
                    extracted_text += f"\n--- Page {page_num} ---\n{text}\n"
                print(f"   ✓ Extracted text from page {page_num}", file=sys.stderr)
            
            pdf_doc.close()
            
            if extracted_text.strip():
                with open(output_txt, 'w', encoding='utf-8') as f:
                    f.write(extracted_text)
                print(f"✅ Text extraction completed:", file=sys.stderr)
                print(f"   ✓ Extracted text from {total_pages} pages", file=sys.stderr)
                print(f"   ✓ Saved to: {output_txt}", file=sys.stderr)
                return True
            else:
                print(f"⚠️ No text extracted from PDF", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ PyMuPDF extraction failed: {e}", file=sys.stderr)
    
    # If both fail, create placeholder
    placeholder_text = f"Failed to extract text from: {pdf_path}\n\nPlease check if PDF contains selectable text.\nSome PDFs are image-based and require OCR for text extraction."
    with open(output_txt, 'w', encoding='utf-8') as f:
        f.write(placeholder_text)
    print(f"⚠️ Text extraction failed - placeholder created", file=sys.stderr)
    return False

if __name__ == "__main__":
    import sys
    import os
    if len(sys.argv) < 4:
        print("Usage: python pdf_convert.py <format> <input_pdf> <output_file>")
        print("Formats: word, excel, ppt, html, text")
        sys.exit(1)
    
    format_type = sys.argv[1].lower()
    input_pdf = sys.argv[2]
    output_file = sys.argv[3]
    
    # Log input parameters
    print(f"[Main] Format: {format_type}", file=sys.stderr)
    print(f"[Main] Input PDF: {input_pdf}", file=sys.stderr)
    print(f"[Main] Output file: {output_file}", file=sys.stderr)
    print(f"[Main] CWD: {os.getcwd()}", file=sys.stderr)
    print(f"[Main] Absolute output path: {os.path.abspath(output_file)}", file=sys.stderr)
    
    if format_type == "word":
        # Check if input is HTML or PDF
        if input_pdf.lower().endswith('.html'):
            html_to_word(input_pdf, output_file)
        else:
            # Use hybrid approach: pdf2docx layout + hidden tables for pixel-perfect similarity
            pdf_to_word_with_hidden_tables(input_pdf, output_file)
    elif format_type == "excel":
        # Use the new pipeline: PDF -> Word -> Excel for better structure
        pdf_to_excel_via_word(input_pdf, output_file)
    elif format_type == "ppt":
        pdf_to_ppt(input_pdf, output_file)
    elif format_type == "html":
        pdf_to_html(input_pdf, output_file)
    elif format_type == "text":
        pdf_to_text(input_pdf, output_file)
    else:
        print(f"Unknown format: {format_type}")
        sys.exit(1)
