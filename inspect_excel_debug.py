import openpyxl
import json
import sys

def inspect_excel(file_path):
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active
        
        headers = []
        for row in sheet.iter_rows(min_row=1, max_row=1, values_only=True):
            headers = [str(h) for h in row]
            break
            
        print(f"Row 1: {headers}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_excel(r"C:\pdf-editor-pro\COMPLETE_APPLICATION_FUNCTIONAL_TEST_REPORT.xlsx")
