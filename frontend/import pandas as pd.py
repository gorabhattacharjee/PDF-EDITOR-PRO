import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, UnexpectedAlertPresentException, NoAlertPresentException
import time
import os

# --- Configuration ---
APP_URL = "http://localhost:5000/"
TEST_PDF_NAME = "Account_Statement_01_Dec_2025-13_Dec_2025.pdf"
TEST_FILES_PATH = r"C:\Users\GoraBhattacharjee\Downloads\pdfeditortest"
CSV_REPORT_PATH = r"C:\Users\GoraBhattacharjee\Downloads\pdfeditortest"
EXCEL_PATH = r"c:\pdf-editor-pro\docs\COMPREHENSIVE_FUNCTIONAL_TEST.xlsx"
PDF_FILE_PATH = os.path.join(TEST_FILES_PATH, TEST_PDF_NAME)


def setup_driver():
    """Initializes and returns a Chrome WebDriver instance."""
    options = webdriver.ChromeOptions()
    # Add any specific options here if needed
    driver = webdriver.Chrome(options=options)
    driver.maximize_window()
    return driver

def load_test_cases(excel_path):
    """Loads test cases from the specified Excel file."""
    df = pd.read_excel(excel_path)
    return df.to_dict('records')

def run_single_test(driver, row_data):
    """Runs a single test case based on the provided row data."""
    element_name = row_data.get("Element Name")
    sub_element = row_data.get("Sub-element")
    action = row_data.get("Action")
    
    action_path = str(element_name) if not sub_element or str(sub_element).isspace() else f"{element_name} > {sub_element}"
    
    if action_path == "File > Close":
        return "Skipped", "This test is currently disabled."

    try:
        if action_path == "File > Open":
            # Find the hidden file input and send the file path to it
            file_input = driver.find_element(By.XPATH, '//input[@type="file"]')
            driver.execute_script("arguments[0].style.display = 'block';", file_input)
            file_input.send_keys(PDF_FILE_PATH)
            time.sleep(2) # Wait for file to load
            return "Success", "File opened successfully."

        # General element interaction
        wait = WebDriverWait(driver, 10)
        
        # First, click the main menu item (e.g., "File")
        main_element = wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[contains(text(), '{element_name}')]")))
        main_element.click()
        
        # If there's a sub-element, click it
        if sub_element and not str(sub_element).isspace():
            sub_element_item = wait.until(EC.element_to_be_clickable((By.XPATH, f"//div[contains(@class, 'menu-item') and contains(text(), '{sub_element}')]")))
            sub_element_item.click()

        return "Success", f"Clicked on '{action_path}'"

    except TimeoutException:
        return "Failure", f"Element '{action_path}' not found or not clickable."
    except Exception as e:
        return "Failure", str(e)

def main():
    """Main function to run the functional tests."""
    driver = setup_driver()
    driver.get(APP_URL)
    
    test_cases = load_test_cases(EXCEL_PATH)
    results = []

    for test_case in test_cases:
        # Refresh and handle alerts before each test
        try:
            driver.refresh()
            time.sleep(2) # Wait for page to reload
            alert = driver.switch_to.alert
            print(f"Alert found and dismissed: {alert.text}")
            alert.accept()
        except NoAlertPresentException:
            pass # No alert, just continue
        except UnexpectedAlertPresentException as e:
            print(f"Unexpected alert present, attempting to handle: {e.text}")
            try:
                alert = driver.switch_to.alert
                alert.accept()
            except NoAlertPresentException:
                pass # Alert might have been dismissed already

        status, details = run_single_test(driver, test_case)
        
        results.append({
            "Element Name": test_case.get("Element Name"),
            "Sub-element": test_case.get("Sub-element"),
            "Action": test_case.get("Action"),
            "Status": status,
            "Details": details
        })

    driver.quit()

    # Save results to CSV
    results_df = pd.DataFrame(results)
    report_path = os.path.join(CSV_REPORT_PATH, "functional_test_report.csv")
    results_df.to_csv(report_path, index=False)
    print(f"Functional test report generated at: {report_path}")

if __name__ == "__main__":
    main()
