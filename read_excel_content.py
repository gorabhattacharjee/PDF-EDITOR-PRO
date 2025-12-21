import openpyxl
import json
import sys

def read_excel_content(file_path):
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active
        
        headers = []
        rows = []
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                headers = [str(h) for h in row]
                continue
            
            record = {}
            for j, val in enumerate(row):
                if j < len(headers):
                    record[headers[j]] = val
            rows.append(record)
            if i >= 50: # Limit to 50 for now to avoid huge output
                break
                
        print(json.dumps(rows, default=str))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    read_excel_content(r"C:\pdf-editor-pro\COMPLETE_APPLICATION_FUNCTIONAL_TEST_REPORT.xlsx")
