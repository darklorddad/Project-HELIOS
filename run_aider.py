import sys
import os
import platform

def find_and_exec_in_venv():
    """
    Attempts to find a virtual environment and re-executes this script
    using the venv's Python interpreter.
    """
    # If we are already in a venv (sys.prefix != base_prefix), we are good.
    # Note: This check works for standard venvs.
    if sys.prefix != sys.base_prefix:
        return

    # Common names for venv directories
    venv_names = ["venv", ".venv", "env", ".env"]
    
    # Determine executable location based on OS
    is_windows = platform.system() == "Windows"
    bin_dir = "Scripts" if is_windows else "bin"
    exe_name = "python.exe" if is_windows else "python"

    root_dir = os.getcwd()
    
    for name in venv_names:
        venv_path = os.path.join(root_dir, name)
        python_path = os.path.join(venv_path, bin_dir, exe_name)
        
        if os.path.exists(python_path):
            print(f"Found virtual environment at: {venv_path}")
            print("Re-launching script using venv python...")
            
            # Re-execute this script using the venv python
            # This automatically gives us access to the installed dependencies
            os.execv(python_path, [python_path] + sys.argv)
    
    print("Warning: Could not auto-detect a virtual environment (venv, .venv, env).")
    print("If the script fails, please run it using: /path/to/venv/bin/python run_aider.py")

# 1. Attempt to switch to venv python if not already there
find_and_exec_in_venv()

# 2. Point Python to the source code in 'engine'
sys.path.insert(0, os.path.abspath("engine"))

try:
    # 3. Import the exceptions module
    from aider import exceptions
    from aider.exceptions import ExInfo

    # 4. Apply the Hotfix
    # We manually add the missing exception to the list.
    print("Monkey-patching BadGatewayError into aider.exceptions...")
    exceptions.EXCEPTIONS.append(
        ExInfo("BadGatewayError", True, "The API provider's servers are down or overloaded.")
    )

except ImportError as e:
    print(f"Error importing aider: {e}")
    print("Ensure dependencies are installed in the detected environment.")
    sys.exit(1)

# 5. Start the Application
from aider.main import main

if __name__ == "__main__":
    main()
