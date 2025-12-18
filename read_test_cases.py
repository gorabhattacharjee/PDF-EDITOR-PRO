
import openpyxl
import json
import os
import sys

def read_excel_file(file_path):
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        return

    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active
        
        rows = []
        headers = []
        
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                headers = [str(h) if h is not None else f"col_{j}" for j, h in enumerate(row)]
                continue
            
            record = {}
            for j, value in enumerate(row):
                if j < len(headers):
                    record[headers[j]] = value
            rows.append(record)
            
        print(json.dumps(rows, default=str))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    file_path = r"C:\pdf-editor-pro\DETAILED_UI_FUNCTIONAL_TESTING-work.xlsx"
    read_excel_file(file_path)
