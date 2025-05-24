import os
from datetime import datetime

def extract_python_code(base_dir='.'):
    output = []
    script_name = os.path.basename(__file__)
    file_count = 0

    for root, _, files in os.walk(base_dir):
        if 'migrations' in root.split(os.sep):
            continue

        for file in files:
            if file.endswith('.py') and file != script_name:
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        code = f.read().strip()
                    if code:
                        output.append(f"# === {file_path} ===\n{code}\n")
                        file_count += 1
                except Exception as e:
                    print(f"Failed to read {file_path}: {e}")

    combined_code = "\n".join(output)
    return combined_code, file_count

if __name__ == "__main__":
    code_output, file_count = extract_python_code()

    now = datetime.now()
    header = f"""# Extracted Python Code
# Date and Time: {now.strftime("%Y-%m-%d %H:%M:%S")}
# Files Included: {file_count}

"""

    with open('data.txt', 'w', encoding='utf-8') as f:
        f.write(header + code_output)

    print(f"✅ Python code extracted from {file_count} files and saved to 'data.txt'")
