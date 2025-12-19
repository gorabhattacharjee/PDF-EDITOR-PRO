#!/usr/bin/env python3
"""
PDF to Image Converter
Converts PDF pages to multiple image formats: JPG, PNG, GIF, WebP, AVIF, TIFF, BMP, HEIF, PSD, XCF, SVG, AI, EPS, WMF, EMF, RAW, DNG, ICO, ICNS

Supported formats:
- Native: PNG, JPG, WebP, GIF, BMP, TIFF, SVG (via PIL/Pillow)
- Advanced: AVIF, HEIF (via pillow-heif if available)
- Professional: PSD, XCF, AI, EPS, WMF, EMF, RAW, DNG, ICO, ICNS (via ImageMagick/convert)

Usage:
    python pdf_to_images.py <pdf_path> <output_format> [output_dir] [page_num]
    
Examples:
    python pdf_to_images.py document.pdf png ./output
    python pdf_to_images.py document.pdf jpg ./output 1
    python pdf_to_images.py document.pdf psd ./output
"""

import sys
import os
from pathlib import Path
import subprocess
from typing import Optional, List
import tempfile
import shutil

# Try importing image processing libraries
try:
    from PIL import Image
    import fitz  # PyMuPDF
    HAVE_PIL = True
    HAVE_FITZ = True
except ImportError as e:
    print(f"[Error] Missing required library: {e}", file=sys.stderr)
    print("[Error] Install with: pip install Pillow PyMuPDF", file=sys.stderr)
    HAVE_PIL = False
    HAVE_FITZ = False

# Optional: Advanced image formats
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HAVE_HEIF = True
except ImportError:
    HAVE_HEIF = False
    print("[Warning] pillow-heif not installed. HEIF/HEIC formats will fallback to PNG", file=sys.stderr)

# Check for ImageMagick
HAVE_IMAGEMAGICK = shutil.which('convert') is not None or shutil.which('magick') is not None


class PDFToImageConverter:
    """Convert PDF pages to various image formats"""
    
    # Format definitions
    NATIVE_FORMATS = {
        'png': {'mime': 'image/png', 'pillow_format': 'PNG'},
        'jpg': {'mime': 'image/jpeg', 'pillow_format': 'JPEG'},
        'jpeg': {'mime': 'image/jpeg', 'pillow_format': 'JPEG'},
        'webp': {'mime': 'image/webp', 'pillow_format': 'WEBP'},
        'gif': {'mime': 'image/gif', 'pillow_format': 'GIF'},
        'bmp': {'mime': 'image/bmp', 'pillow_format': 'BMP'},
        'tiff': {'mime': 'image/tiff', 'pillow_format': 'TIFF'},
        'tif': {'mime': 'image/tiff', 'pillow_format': 'TIFF'},
    }
    
    HEIF_FORMATS = {
        'heif': {'mime': 'image/heif', 'pillow_format': 'HEIF'},
        'heic': {'mime': 'image/heic', 'pillow_format': 'HEIC'},
        'avif': {'mime': 'image/avif', 'pillow_format': 'AVIF'},
    }
    
    IMAGEMAGICK_FORMATS = {
        'svg': 'svg',
        'psd': 'psd',
        'xcf': 'xcf',
        'ai': 'ai',
        'eps': 'eps',
        'wmf': 'wmf',
        'emf': 'emf',
        'raw': 'raw',
        'dng': 'dng',
        'ico': 'ico',
        'icns': 'icns',
    }
    
    ALL_FORMATS = {
        **NATIVE_FORMATS,
        **HEIF_FORMATS,
        **IMAGEMAGICK_FORMATS,
    }
    
    def __init__(self, pdf_path: str, output_dir: str = './output'):
        """Initialize converter
        
        Args:
            pdf_path: Path to PDF file
            output_dir: Directory for output images
        """
        if not HAVE_FITZ or not HAVE_PIL:
            raise RuntimeError("PyMuPDF and Pillow are required. Install with: pip install PyMuPDF Pillow")
        
        self.pdf_path = Path(pdf_path)
        self.output_dir = Path(output_dir)
        
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.pdf_doc = fitz.open(self.pdf_path)
        self.page_count = len(self.pdf_doc)
        
        print(f"[Init] Loaded PDF: {self.pdf_path.name}")
        print(f"[Init] Total pages: {self.page_count}")
        print(f"[Init] Output directory: {self.output_dir}")
    
    def _render_page_to_pil(self, page_num: int, dpi: int = 300) -> Image.Image:
        """Render PDF page to PIL Image
        
        Args:
            page_num: Page number (1-indexed)
            dpi: Resolution in DPI
            
        Returns:
            PIL Image object
        """
        try:
            page = self.pdf_doc[page_num - 1]
            # Calculate zoom for DPI (default 72 DPI)
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            
            # Convert to PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            return img
        except Exception as e:
            print(f"[Error] Failed to render page {page_num}: {e}", file=sys.stderr)
            raise
    
    def _convert_native(self, img: Image.Image, output_path: Path, format_id: str, quality: int = 95) -> bool:
        """Convert to native PIL-supported format
        
        Args:
            img: PIL Image object
            output_path: Output file path
            format_id: Format identifier (png, jpg, etc)
            quality: JPEG quality (1-100)
            
        Returns:
            True if successful
        """
        try:
            format_info = self.NATIVE_FORMATS.get(format_id)
            if not format_info:
                return False
            
            pillow_format = format_info['pillow_format']
            
            # Handle RGB/RGBA conversion
            if format_id in ['jpg', 'jpeg']:
                # JPEG doesn't support alpha
                if img.mode in ('RGBA', 'LA', 'P'):
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = rgb_img
                img.save(output_path, format=pillow_format, quality=quality, optimize=True)
            elif format_id == 'webp':
                if img.mode == 'RGBA':
                    img.save(output_path, format='WEBP', quality=quality)
                else:
                    img.save(output_path, format='WEBP', quality=quality)
            elif format_id == 'gif':
                # GIF requires 8-bit or palette mode
                if img.mode != 'P':
                    img = img.convert('P', palette=Image.Palette.ADAPTIVE)
                img.save(output_path, format='GIF')
            else:
                img.save(output_path, format=pillow_format)
            
            print(f"[Success] Converted to {format_id.upper()}: {output_path.name}")
            return True
        except Exception as e:
            print(f"[Error] Native conversion failed for {format_id}: {e}", file=sys.stderr)
            return False
    
    def _convert_heif(self, img: Image.Image, output_path: Path, format_id: str, quality: int = 95) -> bool:
        """Convert to HEIF/AVIF format
        
        Args:
            img: PIL Image object
            output_path: Output file path
            format_id: Format identifier (heif, avif, heic)
            quality: Quality (1-100)
            
        Returns:
            True if successful
        """
        if not HAVE_HEIF:
            print(f"[Warning] pillow-heif not available. {format_id.upper()} will be saved as PNG", file=sys.stderr)
            output_path = output_path.with_suffix('.png')
            return self._convert_native(img, output_path, 'png', quality)
        
        try:
            format_info = self.HEIF_FORMATS.get(format_id)
            if not format_info:
                return False
            
            pillow_format = format_info['pillow_format']
            
            if format_id == 'avif':
                img.save(output_path, format='AVIF', quality=quality)
            elif format_id in ['heif', 'heic']:
                img.save(output_path, format='HEIF', quality=quality)
            
            print(f"[Success] Converted to {format_id.upper()}: {output_path.name}")
            return True
        except Exception as e:
            print(f"[Warning] HEIF conversion failed: {e}. Saving as PNG instead.", file=sys.stderr)
            output_path = output_path.with_suffix('.png')
            return self._convert_native(img, output_path, 'png', quality)
    
    def _convert_imagemagick(self, img: Image.Image, output_path: Path, format_id: str) -> bool:
        """Convert using ImageMagick (for professional formats)
        
        Args:
            img: PIL Image object
            output_path: Output file path
            format_id: Format identifier (psd, svg, etc)
            
        Returns:
            True if successful
        """
        if not HAVE_IMAGEMAGICK:
            print(f"[Warning] ImageMagick not installed. {format_id.upper()} will be saved as PNG", file=sys.stderr)
            output_path = output_path.with_suffix('.png')
            return self._convert_native(img, output_path, 'png')
        
        try:
            # Save as temporary PNG
            temp_dir = tempfile.gettempdir()
            temp_png = Path(temp_dir) / f"temp_{output_path.stem}.png"
            img.save(temp_png, format='PNG')
            
            # Convert using ImageMagick
            convert_cmd = 'magick' if shutil.which('magick') else 'convert'
            
            # Build command based on format
            if format_id == 'svg':
                # SVG needs special handling
                cmd = [convert_cmd, str(temp_png), str(output_path)]
            elif format_id in ['psd', 'ai', 'eps', 'pdf']:
                # These formats have specific requirements
                cmd = [convert_cmd, str(temp_png), f"{format_id}:{output_path}"]
            else:
                cmd = [convert_cmd, str(temp_png), str(output_path)]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            # Cleanup
            if temp_png.exists():
                temp_png.unlink()
            
            if result.returncode == 0:
                print(f"[Success] Converted to {format_id.upper()}: {output_path.name}")
                return True
            else:
                print(f"[Warning] ImageMagick conversion failed: {result.stderr}", file=sys.stderr)
                # Fallback to PNG
                output_path = output_path.with_suffix('.png')
                return self._convert_native(img, output_path, 'png')
        except subprocess.TimeoutExpired:
            print(f"[Warning] ImageMagick conversion timeout for {format_id}", file=sys.stderr)
            return False
        except Exception as e:
            print(f"[Warning] ImageMagick conversion error: {e}", file=sys.stderr)
            # Fallback to PNG
            output_path = output_path.with_suffix('.png')
            return self._convert_native(img, output_path, 'png')
    
    def convert_page(self, page_num: int, format_id: str, quality: int = 95, dpi: int = 300) -> bool:
        """Convert single PDF page to image
        
        Args:
            page_num: Page number (1-indexed)
            format_id: Output format (png, jpg, webp, etc)
            quality: Quality setting (1-100, only for lossy formats)
            dpi: Resolution in DPI
            
        Returns:
            True if successful
        """
        # Validate format
        format_id = format_id.lower()
        if format_id not in self.ALL_FORMATS:
            print(f"[Error] Unsupported format: {format_id}", file=sys.stderr)
            print(f"[Info] Supported formats: {', '.join(sorted(self.ALL_FORMATS.keys()))}", file=sys.stderr)
            return False
        
        # Validate page number
        if page_num < 1 or page_num > self.page_count:
            print(f"[Error] Invalid page number: {page_num}. Valid range: 1-{self.page_count}", file=sys.stderr)
            return False
        
        try:
            print(f"[Convert] Converting page {page_num} to {format_id.upper()}...")
            
            # Render page
            img = self._render_page_to_pil(page_num, dpi)
            
            # Determine output filename
            base_name = self.pdf_path.stem
            output_filename = f"{base_name}_page{page_num}.{format_id}"
            output_path = self.output_dir / output_filename
            
            # Convert based on format category
            if format_id in self.NATIVE_FORMATS:
                success = self._convert_native(img, output_path, format_id, quality)
            elif format_id in self.HEIF_FORMATS:
                success = self._convert_heif(img, output_path, format_id, quality)
            elif format_id in self.IMAGEMAGICK_FORMATS:
                success = self._convert_imagemagick(img, output_path, format_id)
            else:
                success = False
            
            return success
        except Exception as e:
            print(f"[Error] Conversion failed: {e}", file=sys.stderr)
            return False
    
    def convert_all_pages(self, format_id: str, quality: int = 95, dpi: int = 300) -> int:
        """Convert all PDF pages to image format
        
        Args:
            format_id: Output format
            quality: Quality setting
            dpi: Resolution in DPI
            
        Returns:
            Number of successfully converted pages
        """
        success_count = 0
        for page_num in range(1, self.page_count + 1):
            if self.convert_page(page_num, format_id, quality, dpi):
                success_count += 1
        
        print(f"\n[Summary] Converted {success_count}/{self.page_count} pages to {format_id.upper()}")
        return success_count
    
    def close(self):
        """Close PDF document"""
        if self.pdf_doc:
            self.pdf_doc.close()


def main():
    """Main entry point"""
    if len(sys.argv) < 3:
        print("Usage: python pdf_to_images.py <pdf_path> <format> [output_dir] [page_num] [quality] [dpi]")
        print("\nSupported formats:")
        print("  Native:        " + ", ".join(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff']))
        print("  Modern:        " + ", ".join(['avif', 'heif', 'heic']))
        print("  Professional:  " + ", ".join(['svg', 'psd', 'xcf', 'ai', 'eps', 'wmf', 'emf', 'raw', 'dng', 'ico', 'icns']))
        print("\nExamples:")
        print("  python pdf_to_images.py document.pdf png")
        print("  python pdf_to_images.py document.pdf jpg ./output 1 95")
        print("  python pdf_to_images.py document.pdf psd ./output")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    format_id = sys.argv[2]
    output_dir = sys.argv[3] if len(sys.argv) > 3 else './output'
    page_num = int(sys.argv[4]) if len(sys.argv) > 4 else None
    quality = int(sys.argv[5]) if len(sys.argv) > 5 else 95
    dpi = int(sys.argv[6]) if len(sys.argv) > 6 else 300
    
    try:
        converter = PDFToImageConverter(pdf_path, output_dir)
        
        if page_num:
            success = converter.convert_page(page_num, format_id, quality, dpi)
            sys.exit(0 if success else 1)
        else:
            success_count = converter.convert_all_pages(format_id, quality, dpi)
            sys.exit(0 if success_count > 0 else 1)
    except Exception as e:
        print(f"[Fatal Error] {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        converter.close()


if __name__ == '__main__':
    main()
