#!/usr/bin/env python3
"""
UI Tests for PDF Editor Pro - Using Playwright
Tests all UI components, tabs, menus, sub-menus, and buttons with proper web automation

Requirements:
    - playwright (pip install playwright)
    - Run: playwright install chromium

Usage:
    python run_ui_tests.py

Test Coverage:
    - Main ribbon tabs (Home, Comment, Edit, Convert, Page, Merge, Protect, Tools)
    - Sub-buttons within each tab
    - File Menu and Export sub-menu
    - Icon bar buttons
    - Menu interactions (click, hover, expand)
"""

import pytest
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import unittest
import xmlrunner
import sys
import os

# Add the current directory to the path to find the test modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_ui import TestUI

def run_tests():
    """
    Discovers and runs all tests in the 'test_ui' module and generates an XML report.
    """
    # Create a TestLoader
    loader = unittest.TestLoader()

    # Create a TestSuite
    suite = unittest.TestSuite()

    # Add tests from the TestUI class using the loader
    suite.addTest(loader.loadTestsFromTestCase(TestUI))

    # Define the output directory for the test reports
    output_dir = os.path.join(os.path.dirname(__file__), 'test-reports')
    os.makedirs(output_dir, exist_ok=True)

    # Run the tests using XMLTestRunner
    runner = xmlrunner.XMLTestRunner(output=output_dir)
    result = runner.run(suite)

    # Exit with a non-zero status code if tests failed
    if not result.wasSuccessful():
        sys.exit(1)

if __name__ == '__main__':
    run_tests()