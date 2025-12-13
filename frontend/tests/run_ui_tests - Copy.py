import pandas as pd
import subprocess
import os

# Defines a mapping between UI module names from the Excel file
# and the corresponding pytest test functions.
TEST_MAPPING = {
    "file menu": "test_file_menu_spec",
    "home tab": "test_home_tab_spec",
    "comment tab": "test_comment_tab_tools",
    "edit tab": "test_edit_tab_spec",
    "page tab": "test_page_tab_spec",
    "protect tab": "test_protect_tab",
    "convert tab": "test_convert_tab",
    "merge pdf tab": "test_merge_pdf_tab",
    "tools tab": "test_tools_tab",
}

# --- Configuration ---
EXCEL_FILE = r"C:\PDFP\pdf-editor-pro\frontend\tests\UI_MODULES_STATUS.xlsx"
TEST_FILE = r"C:\PDFP\pdf-editor-pro\frontend\tests\test_ui.py"
OUTPUT_CSV = r"C:\PDFP\pdf-editor-pro\frontend\tests\ui_test_results.csv"
PYTHON_EXEC = r"C:\Python314\python.exe"

def run_tests():
    """
    Reads UI module names from an Excel file, runs the corresponding
    pytest tests, and saves the results to a CSV file.
    """
    try:
        df = pd.read_excel(EXCEL_FILE, sheet_name=0, usecols=[0])
        first_column_name = df.columns[0]
        print(f"Reading UI modules from: '{first_column_name}'")
        ui_modules = df[first_column_name].dropna().tolist()
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return

    results = []
    print("\n--- Starting UI Test Run ---")

    for module_name in ui_modules:
        normalized_module_name = module_name.strip().lower()
        test_function = TEST_MAPPING.get(normalized_module_name)
        
        print(f"\nProcessing Module: '{module_name}'")

        if test_function:
            test_dir = os.path.dirname(TEST_FILE)
            command = [PYTHON_EXEC, "-m", "pytest", "-v", f"{os.path.basename(TEST_FILE)}::{test_function}"]
            
            result = subprocess.run(command, capture_output=True, text=True, cwd=test_dir, encoding='utf-8')
            
            status = "Fail"
            if "1 passed" in result.stdout:
                status = "Pass"
            elif "0 collected" in result.stdout or "ERROR: not found" in result.stderr:
                status = "Test Not Found"

            print(f"  - Status: {status}")
            
            if status == "Fail":
                print(f"  - Error Output:\n{result.stderr}")

            results.append({"UI Module": module_name, "Status": status})
        else:
            print("  - Status: Test Not Found in Mapping")
            results.append({"UI Module": module_name, "Status": "Test Not Found in Mapping"})

    results_df = pd.DataFrame(results)
    try:
        results_df.to_csv(OUTPUT_CSV, index=False)
        print(f"\n--- Test Run Finished ---")
        print(f"Results saved to '{OUTPUT_CSV}'")
    except Exception as e:
        print(f"\nError saving CSV: {e}")

if __name__ == "__main__":
    run_tests()