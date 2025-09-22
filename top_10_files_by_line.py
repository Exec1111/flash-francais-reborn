import subprocess
import os

def get_git_files():
    """Get the list of files tracked by git, which respects .gitignore."""
    try:
        # We use git ls-files to get all the files tracked by git.
        # This is a good way to respect .gitignore and only include relevant files.
        result = subprocess.run(['git', 'ls-files'], capture_output=True, text=True, check=True, encoding='utf-8')
        return result.stdout.splitlines()
    except (subprocess.CalledProcessError, FileNotFoundError):
        # If git is not installed or this is not a git repository,
        # we fall back to walking the directory.
        # This fallback will not respect .gitignore.
        print("Warning: Not a git repository or git not found. Walking all files, .gitignore will not be respected.")
        all_files = []
        for root, _, files in os.walk('.'):
            # A simple attempt to ignore .git directory
            if '.git' in root:
                continue
            for name in files:
                all_files.append(os.path.join(root, name))
        return all_files


def count_lines(filepath):
    """Counts the number of lines in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return len(f.readlines())
    except Exception:
        # Ignore files that can't be opened or read (e.g., binary files)
        return 0

def main():
    """Main function to find and print the 10 files with the most lines."""
    files = get_git_files()
    
    if not files:
        print("No files found.")
        return

    file_lines = []
    for file_path in files:
        lines = count_lines(file_path)
        if lines > 0:
            file_lines.append((lines, file_path))

    # Sort files by line count in descending order
    file_lines.sort(key=lambda x: x[0], reverse=True)

    # Print the top 10
    print("Top 10 files by number of lines:")
    for lines, path in file_lines[:10]:
        print(f"{path}: {lines} lines")

if __name__ == "__main__":
    main()
