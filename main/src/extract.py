import os
from datetime import datetime

def extract_code(base_dir='.'):
    output = []
    script_name = os.path.basename(__file__)  # current script name
    excluded_path = os.path.normpath(os.path.join(base_dir, 'components', 'ui'))
    file_count = 0

    for root, _, files in os.walk(base_dir):
        norm_root = os.path.normpath(root)
        if norm_root.startswith(excluded_path):
            continue

        for file in files:
            if file == script_name:
                continue

            if file.endswith(('.ts', '.tsx', '.css')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        code = f.read().strip()
                    if code:
                        rel_path = os.path.relpath(file_path, base_dir)
                        output.append(f"# === {rel_path} ===\n{code}\n")
                        file_count += 1
                except Exception as e:
                    print(f"Failed to read {file_path}: {e}")

    combined_code = "\n".join(output)
    return combined_code, file_count

if __name__ == "__main__":
    code_output, file_count = extract_code()

    now = datetime.now()
    header = f"""# Extracted Code (.ts, .tsx, .css)
# Date and Time: {now.strftime("%Y-%m-%d %H:%M:%S")}
# Files Included: {file_count}

"""

    with open('data.txt', 'w', encoding='utf-8') as f:
        f.write(header + code_output)

    print(f"✅ Code extracted from {file_count} files and saved to 'data.txt'")
