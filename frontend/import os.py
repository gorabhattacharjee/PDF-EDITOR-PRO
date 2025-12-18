import os
import csv
import time
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException

# 1. Define constants for file paths and URLs
PDF_PATH = r"C:\Users\GoraBhattacharjee\Downloads\pdfeditortest\Account_Statement_01_Dec_2025-13_Dec_2025.pdf"
OUTPUT_DIR = r"C:\Users\GoraBhattacharjee\Downloads\pdfeditortest"
REPORT_PATH = os.path.join(OUTPUT_DIR, "functional_test_report.csv")
INVENTORY_PATH = r"c:\pdf-editor-pro\COMPLETE_UI_ELEMENTS_INVENTORY.csv"
APP_URL = "http://localhost:3000"
DRIVER_PATH = r"C:\path\to\your\chromedriver.exe"  # UPDATE THIS PATH

def setup_driver():
    """Sets up the Selenium WebDriver."""
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    # If chromedriver is not in your PATH, you need to specify the executable_path.
    # driver = webdriver.Chrome(executable_path=DRIVER_PATH, options=options)
    driver = webdriver.Chrome(options=options)
    return driver

def open_pdf_file(driver, pdf_path):
    """Navigates to the app and opens the specified PDF file."""
    print(f"Attempting to open PDF: {pdf_path}")
    if not os.path.exists(pdf_path):
        print(f"FATAL: PDF file not found at {pdf_path}")
        return False

    try:
        driver.get(APP_URL)
        # Find the hidden file input element
        file_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//input[@type="file" and @accept="application/pdf"]'))
        )
        # Use JavaScript to make it visible and send keys
        driver.execute_script("arguments[0].style.display = 'block';", file_input)
        file_input.send_keys(pdf_path)
        
        # Wait for the PDF to render by checking for the canvas
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "canvas"))
        )
        print("PDF opened successfully.")
        time.sleep(2) # Allow for final rendering
        return True
    except TimeoutException:
        print("FATAL: Timed out waiting for the application or PDF to load.")
        return False
    except Exception as e:
        print(f"FATAL: An unexpected error occurred while opening the PDF: {e}")
        return False

def test_ui_element(driver, category, component, c_type):
    """Finds and tests a single UI element."""
    # 2. Skip "File -> Close" and other file opening actions
    if component == 'Close' and category == 'File Menu':
        return 'skipped', 'Skipped as per requirements'
    if 'Open' in component and c_type in ('Button', 'MenuItem'):
        return 'skipped', 'Skipped file open action as PDF is already loaded'

    try:
        element_to_click = None
        wait = WebDriverWait(driver, 3)

        # A. Handle menu items (e.g., File Menu)
        if 'Menu' in category:
            menu_name = category.replace(' Menu', '')
            try:
                # Click the menu trigger (e.g., "File" button)
                menu_trigger = wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[text()='{menu_name}']")))
                menu_trigger.click()
                time.sleep(0.5)  # Wait for menu animation
                # Find and click the menu item
                element_to_click = wait.until(EC.element_to_be_clickable((By.XPATH, f"//div[@role='menuitem']//p[text()='{component}']")))
            except TimeoutException:
                # If menu is open, a click can close it. Try to reopen.
                try:
                    driver.find_element(By.XPATH, f"//button[text()='{menu_name}']").click()
                    time.sleep(0.5)
                    element_to_click = wait.until(EC.element_to_be_clickable((By.XPATH, f"//div[@role='menuitem']//p[text()='{component}']")))
                except (NoSuchElementException, TimeoutException):
                    return 'not-working', f'Could not find menu item: {component}'

        # B. Handle elements within Ribbon Tabs
        elif 'Tab' in category and c_type != 'Tab':
            tab_name = category.replace(' Tab', '')
            try:
                tab = wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[@role='tab'][text()='{tab_name}']")))
                if tab.get_attribute('aria-selected') == 'false':
                    tab.click()
                    time.sleep(0.5)
            except TimeoutException:
                return 'not-working', f'Tab "{tab_name}" not found'
        
        # C. Generic element search (for buttons, icons, etc.)
        if not element_to_click:
            # Prioritize searching by title, which is common for icon buttons
            search_queries = [
                f"//button[@title='{component}']",
                f"//button[contains(., '{component}')]",
                f"//div[contains(@aria-label, '{component}')]",
                f"//span[text()='{component}']"
            ]
            for query in search_queries:
                try:
                    element_to_click = wait.until(EC.element_to_be_clickable((By.XPATH, query)))
                    break # Found it
                except TimeoutException:
                    continue
        
        if not element_to_click:
            return 'not-working', 'Element not found with any locator strategy'

        # Perform the click
        driver.execute_script("arguments[0].click();", element_to_click)
        time.sleep(1) # Wait for any UI reaction (e.g., modal, toast)

        # Simple success criteria: if no exception, it's "working"
        return 'working', ''

    except ElementClickInterceptedException:
        return 'not-working', 'Element was intercepted, could not be clicked'
    except Exception as e:
        return 'not-working', f'An error occurred: {type(e).__name__}'


def main():
    """Main function to run the test suite."""
    print("Starting UI functional test script...")
    driver = setup_driver()
    
    # 1. Ensure PDF is open before doing anything else
    if not open_pdf_file(driver, PDF_PATH):
        driver.quit()
        return

    # 3. Test each UI component from the inventory
    try:
        # 5. Create output directory and CSV file
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        print(f"Report will be saved to: {REPORT_PATH}")
        
        inventory = pd.read_csv(INVENTORY_PATH)
        
        with open(REPORT_PATH, 'w', newline='', encoding='utf-8') as csvfile:
            report_writer = csv.writer(csvfile)
            report_writer.writerow(['Category', 'Component Name', 'Type', 'Status', 'Notes'])

            for _, row in inventory.iterrows():
                category, component, c_type = row['Category'], row['Component Name'], row['Type']
                
                print(f"\nTesting: [{category}] -> [{component}]")
                
                # 4. Wait for output and record result
                status, notes = test_ui_element(driver, category, component, c_type)
                
                print(f"  -> Status: {status}")
                if notes:
                    print(f"  -> Notes: {notes}")
                
                report_writer.writerow([category, component, c_type, status, notes])

    except FileNotFoundError:
        print(f"FATAL: UI Inventory file not found at {INVENTORY_PATH}")
    except Exception as e:
        print(f"An unexpected error occurred during the test run: {e}")
    finally:
        print("\nTest run finished. Closing driver.")
        driver.quit()

if __name__ == "__main__":
    main()
