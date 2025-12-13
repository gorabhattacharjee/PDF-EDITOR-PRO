import time
import csv
import os
from datetime import datetime

from openpyxl import load_workbook
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import WebDriverException, NoSuchElementException, TimeoutException

APP_URL = "http://localhost:3000/"
EXCEL_PATH = r"C:\PDFP\pdf-editor-pro\docs\COMPREHENSIVE_FUNCTIONAL_TEST.xlsx"
TEST_FILES_PATH = r"C:\Users\GoraBhattacharjee\Downloads\test"
CSV_REPORT = r"C:\PDFP\pdf-editor-pro\docs\functional_test_report.csv"
TEST_PDF_NAME = "sample.pdf"  # change to a real test file in TEST_FILES_PATH

# Create report directory if it doesn't exist
os.makedirs(os.path.dirname(CSV_REPORT), exist_ok=True)


def init_driver():
    """Initialize Selenium WebDriver with Chrome options."""
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    # options.add_argument("--headless=new")  # Uncomment for headless mode
    driver = webdriver.Chrome(options=options)
    driver.get(APP_URL)
    time.sleep(3)
    return driver


def log_row(rows, test_id, element_name, sub_element, function_desc,
            user_action, expected, actual, status, notes):
    """Log a test result row."""
    rows.append({
        "timestamp": datetime.now().isoformat(),
        "test_id": test_id,
        "element_name": element_name,
        "sub_element": sub_element,
        "function_description": function_desc,
        "user_action": user_action,
        "expected_result": expected,
        "actual_result": actual,
        "working_non_working": status,
        "notes": notes,
    })


def click_element_by_text(driver, text):
    """Click an element by its visible text."""
    try:
        xpath = f"//*[normalize-space(text())='{text}']"
        elem = driver.find_element(By.XPATH, xpath)
        driver.execute_script("arguments[0].scrollIntoView(true);", elem)
        time.sleep(0.3)
        elem.click()
        return True
    except NoSuchElementException:
        return False


def click_menu_path(driver, path_str):
    """Click a menu path like 'File > Open' by visible text."""
    try:
        parts = [p.strip() for p in path_str.split(">")]
        for part in parts:
            if not click_element_by_text(driver, part):
                return False
            time.sleep(0.5)
        return True
    except Exception:
        return False


def wait_for_element(driver, xpath, timeout=5):
    """Wait for element to be present."""
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    try:
        element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, xpath))
        )
        return element
    except TimeoutException:
        return None


def open_pdf_via_input(driver):
    """
    Helper: load a PDF from TEST_FILES_PATH via <input type="file">.
    Adjust selector to match your DOM.
    """
    full_path = os.path.join(TEST_FILES_PATH, TEST_PDF_NAME)
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"Test PDF not found: {full_path}")

    # If your UI reveals the file input only after clicking "Open", do that first:
    # click_menu_path(driver, "File > Open")

    # Generic selector; update to your actual input locator.
    file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
    file_input.send_keys(full_path)
    time.sleep(1.5)
    return f"Loaded PDF from {full_path}"


def run_single_test(driver, row_data):
    """
    Execute a single test case based on Excel row data.
