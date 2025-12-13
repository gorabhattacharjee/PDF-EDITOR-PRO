import pandas as pd
import subprocess

# --- Configuration ---
EXCEL_FILE = r"C:\PDFP\pdf-editor-pro\frontend\tests\UI_MODULES_STATUS.xlsx"
TEST_FILE = r"C:\PDFP\pdf-editor-pro\frontend\tests\test_ui.py"
PYTHON_EXEC = r"C:\Python314\python.exe"
OUTPUT_CSV = r"C:\PDFP\pdf-editor-pro\frontend\tests\debug_results.csv"

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

def run_debug_tests():
    """
    Reads UI modules from Excel, runs corresponding pytest tests,
    and provides detailed debug output.
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
    print("\n--- Starting Debug Test Run ---")

    for module_name in ui_modules:
        normalized_module_name = module_name.strip().lower()
        test_function = TEST_MAPPING.get(normalized_module_name)
        
        print(f"\nProcessing Module: '{module_name}' (Normalized: '{normalized_module_name}')")

        if test_function:
            print(f"  - Found in TEST_MAPPING. Corresponding function: '{test_function}'")
            test_node_id = f"{TEST_FILE}::{test_function}"
            command = [PYTHON_EXEC, "-m", "pytest", "-v", test_node_id]
            
            print(f"  - Executing command: {' '.join(command)}")
            
            result = subprocess.run(command, capture_output=True, text=True)
            
            status = "Fail"
            if "1 passed" in result.stdout:
                status = "Pass"
            elif "0 collected" in result.stdout or "ERROR: not found" in result.stderr:
                status = "Test Not Found"

            print(f"  - Pytest Return Code: {result.returncode}")
            print(f"  - Test Status: {status}")
            
            if status != "Pass":
                print(f"  - Pytest stdout:\n{result.stdout}")
                print(f"  - Pytest stderr:\n{result.stderr}")

            results.append({"UI Module": module_name, "Status": status})
        else:
            print("  - Not found in TEST_MAPPING.")
            results.append({"UI Module": module_name, "Status": "Test Not Found in Mapping"})

    results_df = pd.DataFrame(results)
    try:
        results_df.to_csv(OUTPUT_CSV, index=False)
        print(f"\n--- Debug Test Run Finished ---")
        print(f"Debug results saved to '{OUTPUT_CSV}'")
    except Exception as e:
        print(f"\nError saving debug CSV: {e}")

if __name__ == "__main__":
    run_debug_tests()