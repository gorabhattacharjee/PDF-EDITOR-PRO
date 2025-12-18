import csv

def create_test_report():
    try:
        with open('c:\\pdf-editor-pro\\docs\\1\\Expected UI & function.csv', 'r', encoding='utf-8') as f_in, open('c:\\pdf-editor-pro\\test_results.csv', 'w', newline='', encoding='utf-8') as f_out:
            reader = csv.reader(f_in)
            writer = csv.writer(f_out)
            
            header = next(reader)
            writer.writerow(header + ['Status', 'Notes'])
            
            for row in reader:
                writer.writerow(row + ['To be tested', ''])
        print("Test report created successfully at c:\\pdf-editor-pro\\test_results.csv")
    except FileNotFoundError:
        print("Error: 'c:\\pdf-editor-pro\\docs\\1\\Expected UI & function.csv' not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

create_test_report()
