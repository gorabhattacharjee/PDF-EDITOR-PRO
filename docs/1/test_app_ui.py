import csv
import time
import subprocess
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import (
    NoSuchElementException,
    ElementClickInterceptedException,
    WebDriverException,
)

APP_URL = "http://localhost:3000/"
CSV_REPORT = "ui_test_report.csv"

# Optional: PowerShell command or script
POWERSHELL_ENABLED = True
POWERSHELL_COMMAND = r'Get-Process | Where-Object {$_.Name -like "*chrome*"}'

def run_powershell_check(command: str):
    """
    Run a PowerShell command and return (success: bool, output: str).
    """
    try:
        completed = subprocess.run(
            ["powershell", "-Command", command],
            capture_output=True,
            text=True,
            timeout=30
        )  # [web:8][web:16]
        output = completed.stdout.strip() or completed.stderr.strip()
        success = completed.returncode == 0
        return success, output
    except Exception as e:
        return False, f"Exception running PowerShell: {e}"

def init_driver():
    """
    Initialize Selenium WebDriver (Chrome by default).
    Adjust if you prefer Firefox or Edge.
    """
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    # options.add_argument("--headless=new")  # uncomment for headless mode
    driver = webdriver.Chrome(options=options)  # [web:14]
    return driver

def log_row(rows, check_type, identifier, status, message):
    rows.append({
        "timestamp": datetime.utcnow().isoformat(),
        "check_type": check_type,
        "identifier": identifier,
        "status": status,
        "message": message,
    })

def check_page_load(driver, rows):
    try:
        driver.get(APP_URL)
        time.sleep(2)
        title = driver.title
        log_row(rows, "page_load", APP_URL, "OK", f"Page loaded, title='{title}'")
    except WebDriverException as e:
        log_row(rows, "page_load", APP_URL, "FAIL", f"Error loading page: {e}")

def check_links_clickable(driver, rows):
    try:
        links = driver.find_elements(By.TAG_NAME, "a")
        if not links:
            log_row(rows, "links_scan", "all_links", "WARN", "No <a> elements found")
            return

        for idx, link in enumerate(links):
            try:
                text = link.text or link.get_attribute("href")
                identifier = f"link[{idx}] {text}"
                driver.execute_script("arguments[0].scrollIntoView(true);", link)
                time.sleep(0.2)
                link.click()
                time.sleep(0.5)
                log_row(rows, "link_click", identifier, "OK", "Clicked successfully")
                driver.back()
                time.sleep(0.5)
            except (ElementClickInterceptedException, WebDriverException) as e:
                log_row(rows, "link_click", identifier, "FAIL", f"Click failed: {e}")
                driver.get(APP_URL)
                time.sleep(0.5)
    except Exception as e:
        log_row(rows, "links_scan", "all_links", "FAIL", f"Error scanning links: {e}")

def check_buttons_clickable(driver, rows):
    try:
        buttons = driver.find_elements(By.TAG_NAME, "button")
        if not buttons:
            log_row(rows, "buttons_scan", "all_buttons", "WARN", "No <button> elements found")
            return

        for idx, btn in enumerate(buttons):
            try:
                text = btn.text or btn.get_attribute("id") or btn.get_attribute("name")
                identifier = f"button[{idx}] {text}"
                driver.execute_script("arguments[0].scrollIntoView(true);", btn)
                time.sleep(0.2)
                btn.click()
                time.sleep(0.5)
                log_row(rows, "button_click", identifier, "OK", "Clicked successfully")
            except (ElementClickInterceptedException, WebDriverException) as e:
                log_row(rows, "button_click", identifier, "FAIL", f"Click failed: {e}")
    except Exception as e:
        log_row(rows, "buttons_scan", "all_buttons", "FAIL", f"Error scanning buttons: {e}")

def check_inputs_basic(driver, rows):
    try:
        inputs = driver.find_elements(By.TAG_NAME, "input")
        if not inputs:
            log_row(rows, "inputs_scan", "all_inputs", "WARN", "No <input> elements found")
            return

        for idx, inp in enumerate(inputs):
            try:
                inp_type = inp.get_attribute("type") or "text"
                identifier = f"input[{idx}] type={inp_type}"
                if inp_type in ("text", "email", "search", "password"):
                    driver.execute_script("arguments[0].scrollIntoView(true);", inp)
                    time.sleep(0.2)
                    inp.clear()
                    inp.send_keys("test-value")
                    log_row(rows, "input_typeable", identifier, "OK", "Typed test-value")
                else:
                    log_row(rows, "input_skip", identifier, "SKIP", "Not a text-like input")
            except WebDriverException as e:
                log_row(rows, "input_typeable", identifier, "FAIL", f"Typing failed: {e}")
    except Exception as e:
        log_row(rows, "inputs_scan", "all_inputs", "FAIL", f"Error scanning inputs: {e}")

def run_ui_checks():
    rows = []
    driver = None

    try:
        driver = init_driver()
        check_page_load(driver, rows)
        check_links_clickable(driver, rows)
        check_buttons_clickable(driver, rows)
        check_inputs_basic(driver, rows)
    finally:
        if driver is not None:
            driver.quit()

    if POWERSHELL_ENABLED:
        success, output = run_powershell_check(POWERSHELL_COMMAND)
        status = "OK" if success else "FAIL"
        log_row(rows, "powershell", POWERSHELL_COMMAND, status, output[:1000])

    fieldnames = ["timestamp", "check_type", "identifier", "status", "message"]
    with open(CSV_REPORT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Report written to {CSV_REPORT} with {len(rows)} rows")

if __name__ == "__main__":
    run_ui_checks()
