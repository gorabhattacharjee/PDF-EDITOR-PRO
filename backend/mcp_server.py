#!/usr/bin/env python3
"""
MCP Server for PDF Editor Pro
Exposes PDF conversion and processing operations as tools
"""

import os
import sys
import json
import asyncio
import logging
from typing import Any
import httpx

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import MCP SDK
try:
    from mcp.server.models import InitializationOptions
    from mcp.types import Tool, TextContent, ToolResult
    from mcp.server import Server
except ImportError:
    print("Error: mcp package not found. Install with: pip install mcp")
    sys.exit(1)

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
API_TIMEOUT = 30

# Initialize MCP Server
server = Server("pdf-editor-pro-mcp")

class PDFEditorClient:
    """Client for PDF Editor Pro backend"""
    
    def __init__(self, base_url: str = BACKEND_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=API_TIMEOUT)
    
    async def convert_pdf_to_word(self, file_path: str) -> dict:
        """Convert PDF to Word document"""
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                response = await self.client.post(
                    f"{self.base_url}/api/convert/pdf-to-word",
                    files=files
                )
                response.raise_for_status()
                return {
                    "success": True,
                    "data": response.json()
                }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def convert_pdf_to_excel(self, file_path: str) -> dict:
        """Convert PDF to Excel spreadsheet"""
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                response = await self.client.post(
                    f"{self.base_url}/api/convert/pdf-to-excel",
                    files=files
                )
                response.raise_for_status()
                return {
                    "success": True,
                    "data": response.json()
                }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def compress_pdf(self, file_path: str, quality: str = "medium") -> dict:
        """Compress PDF file"""
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                data = {'quality': quality}
                response = await self.client.post(
                    f"{self.base_url}/api/compress",
                    files=files,
                    data=data
                )
                response.raise_for_status()
                return {
                    "success": True,
                    "data": response.json()
                }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def extract_text(self, file_path: str) -> dict:
        """Extract text from PDF using OCR"""
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                response = await self.client.post(
                    f"{self.base_url}/api/ocr/extract",
                    files=files
                )
                response.raise_for_status()
                return {
                    "success": True,
                    "data": response.json()
                }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_status(self) -> dict:
        """Check backend API status"""
        try:
            response = await self.client.get(f"{self.base_url}/api/status")
            response.raise_for_status()
            return {
                "success": True,
                "status": "online",
                "data": response.json()
            }
        except Exception as e:
            return {
                "success": False,
                "status": "offline",
                "error": str(e)
            }

# Create client instance
pdf_client = PDFEditorClient()

# Register tools
@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available PDF tools"""
    return [
        Tool(
            name="convert_pdf_to_word",
            description="Convert PDF document to Microsoft Word format (.docx)",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file"
                    }
                },
                "required": ["file_path"]
            }
        ),
        Tool(
            name="convert_pdf_to_excel",
            description="Convert PDF document to Excel spreadsheet format (.xlsx)",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file"
                    }
                },
                "required": ["file_path"]
            }
        ),
        Tool(
            name="compress_pdf",
            description="Compress PDF file to reduce file size",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file"
                    },
                    "quality": {
                        "type": "string",
                        "description": "Compression quality: low, medium, high",
                        "enum": ["low", "medium", "high"],
                        "default": "medium"
                    }
                },
                "required": ["file_path"]
            }
        ),
        Tool(
            name="extract_text",
            description="Extract text from PDF using OCR (Optical Character Recognition)",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file"
                    }
                },
                "required": ["file_path"]
            }
        ),
        Tool(
            name="check_backend_status",
            description="Check if PDF Editor Pro backend API is online",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> ToolResult:
    """Handle tool calls"""
    try:
        if name == "convert_pdf_to_word":
            file_path = arguments.get("file_path")
            if not file_path:
                return ToolResult(
                    content=[TextContent(type="text", text="Error: file_path is required")],
                    isError=True
                )
            result = await pdf_client.convert_pdf_to_word(file_path)
            
        elif name == "convert_pdf_to_excel":
            file_path = arguments.get("file_path")
            if not file_path:
                return ToolResult(
                    content=[TextContent(type="text", text="Error: file_path is required")],
                    isError=True
                )
            result = await pdf_client.convert_pdf_to_excel(file_path)
            
        elif name == "compress_pdf":
            file_path = arguments.get("file_path")
            quality = arguments.get("quality", "medium")
            if not file_path:
                return ToolResult(
                    content=[TextContent(type="text", text="Error: file_path is required")],
                    isError=True
                )
            result = await pdf_client.compress_pdf(file_path, quality)
            
        elif name == "extract_text":
            file_path = arguments.get("file_path")
            if not file_path:
                return ToolResult(
                    content=[TextContent(type="text", text="Error: file_path is required")],
                    isError=True
                )
            result = await pdf_client.extract_text(file_path)
            
        elif name == "check_backend_status":
            result = await pdf_client.get_status()
            
        else:
            return ToolResult(
                content=[TextContent(type="text", text=f"Unknown tool: {name}")],
                isError=True
            )
        
        # Return result
        content_text = json.dumps(result, indent=2)
        return ToolResult(
            content=[TextContent(type="text", text=content_text)],
            isError=not result.get("success", False)
        )
        
    except Exception as e:
        logger.error(f"Error calling tool {name}: {str(e)}")
        return ToolResult(
            content=[TextContent(type="text", text=f"Error: {str(e)}")],
            isError=True
        )

async def main():
    """Main entry point"""
    logger.info("Starting PDF Editor Pro MCP Server")
    logger.info(f"Backend URL: {BACKEND_URL}")
    
    async with server:
        logger.info("MCP Server running")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
