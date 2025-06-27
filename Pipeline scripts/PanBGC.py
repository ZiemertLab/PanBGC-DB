import os
import argparse
import subprocess
import time
import threading
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import concurrent.futures
import shutil


PIPELINE_STEPS = [
    "1_Run_zol_single_folder.py",
    "3_Zol_to_json_single.py",
    "4_GbkInfo_json_single.py",
    "AstralV2_single.py",
    "9_gbk_vis_single.py",
    "heap_calculation_single.py",
    "user_vis_single.py"
]


STEP_NAMES = [
    "Zol_Run",
    "Zol_to_JSON",
    "GBK_Info",
    "ASTRAL",
    "GBK_Vis",
    "Heaps_Law",
    "User_Vis"
]


STEP_ARGS = {
    "1_Run_zol_single_folder.py": ["-i", "{input_dir}/{folder}", "-o", "{output_dir}/{folder}", "-log", "{log_dir}/{folder}_{step}.log", "-c", "{cores}"],
    "3_Zol_to_json_single.py": ["-dir", "{output_dir}/{folder}", "-c", "{cores}"],
    "4_GbkInfo_json_single.py": ["-dir", "{output_dir}/{folder}", "-c", "{cores}"],
    "AstralV2_single.py": ["-i", "{output_dir}/{folder}", "-c", "{cores}", "-al", "{astral_path}"],
    "9_gbk_vis_single.py": ["-i", "{output_dir}/{folder}", "-c", "{cores}"],
    "heap_calculation_single.py": ["-dir", "{output_dir}/{folder}", "-c", "{cores}"],
    "user_vis_single.py": ["-i", "{output_dir}/{folder}", "-c", "{cores}"]
}


folder_status = {}  
step_counts = {}    
steps_completed = {} 
completed_count = 0  
failed_count = 0     
status_lock = threading.Lock()  
error_log_lock = threading.Lock()  


display_lock = threading.Lock()

def format_args(arg_template, folder, input_dir, output_dir, log_dir, cores, astral_path, step):
    """Format command arguments by replacing placeholders."""
    args = []
    for arg in arg_template:
        args.append(arg.format(
            folder=folder,
            input_dir=input_dir,
            output_dir=output_dir,
            log_dir=log_dir,
            cores=cores,
            astral_path=astral_path,
            step=step
        ))
    return args

def display_status(total_folders):
    """Display current status in the terminal."""
    with display_lock:
        
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print("=== PanBGC Pipeline Status ===")
        print(f"Total Folders: {total_folders}")
        
        
        for i, step_name in enumerate(STEP_NAMES):
            current_count = max(0, step_counts.get(i, 0))  
            completed = steps_completed.get(i, 0)
            print(f"{step_name}: {current_count}/{total_folders} processing, {completed}/{total_folders} completed")
        
        
        print(f"Complete Pipeline: {completed_count}/{total_folders} folders")
        if failed_count > 0:
            print(f"Failed: {failed_count}/{total_folders} folders")
        
        
        progress = completed_count + failed_count
        progress_pct = (progress / total_folders) * 100 if total_folders > 0 else 0
        print(f"Overall Progress: {progress}/{total_folders} ({progress_pct:.1f}%)")
        print("=" * 50)

def get_last_lines(file_path, n=10):
    """Get the last n lines from a file."""
    try:
        with open(file_path, 'r') as file:
            lines = file.readlines()
            return lines[-n:] if len(lines) >= n else lines
    except Exception as e:
        return [f"Error reading file: {e}"]

def write_error_to_log(output_dir, folder, error_info):
    """Write a single error to the error log file."""
    error_file = os.path.join(output_dir, "error.txt")
    
    
    with error_log_lock:
        
        file_exists = os.path.exists(error_file)
        
        
        with open(error_file, 'a') as f:
            
            if not file_exists:
                f.write("PanBGC Pipeline Error Log\n")
                f.write("========================\n\n")
            
            
            f.write(f"Folder: {folder}\n")
            f.write(f"Failed Step: {error_info['step']}\n")
            f.write(f"Command: {error_info['command']}\n")
            f.write(f"Log File: {error_info['log_file']}\n")
            f.write("Error Details:\n")
            f.write("--------------\n")
            f.write(error_info['error_details'])
            f.write("\n\n" + "="*50 + "\n\n")

def run_step(script_path, folder, step_index, input_dir, output_dir, log_dir, cores, astral_path):
    """Run a single step of the pipeline for a folder."""
    global folder_status, step_counts, steps_completed, completed_count, failed_count
    
    step_script = os.path.basename(script_path)
    step_name = STEP_NAMES[step_index]
    
    
    
    with status_lock:
        display_status(len(folder_status))
    
    
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"{folder}_{step_name}.log")
    
    
    args = format_args(STEP_ARGS[step_script], folder, input_dir, output_dir, log_dir, cores, astral_path, step_name)
    
    
    cmd = ["python", script_path] + args
    cmd_str = " ".join(cmd)
    
    try:
        
        with open(log_file, 'w') as log:
            log.write(f"Running command: {cmd_str}\n\n")
        
        
        with open(log_file, 'a') as log:
            process = subprocess.run(cmd, stdout=log, stderr=log)
            success = process.returncode == 0
        
        
        if not success:
            last_lines = get_last_lines(log_file)
            error_info = {
                'step': step_name,
                'command': cmd_str,
                'log_file': log_file,
                'error_details': ''.join(last_lines)
            }
            
            write_error_to_log(output_dir, folder, error_info)
        
        
        with status_lock:
            
            if folder in folder_status and folder_status[folder] == step_index:
                step_counts[step_index] = max(0, step_counts.get(step_index, 0) - 1)
            
            
            steps_completed[step_index] = steps_completed.get(step_index, 0) + 1
            
            
            if success and folder in folder_status and folder_status[folder] == step_index:
                folder_status[folder] = step_index + 1
                next_step = step_index + 1
                if next_step < len(PIPELINE_STEPS):
                    step_counts[next_step] = step_counts.get(next_step, 0) + 1
            
            display_status(len(folder_status))
            
        return success
    except Exception as e:
        
        with open(log_file, 'a') as log:
            error_msg = f"\nUnexpected ERROR: {e}\n"
            log.write(error_msg)
        
        
        error_info = {
            'step': step_name,
            'command': cmd_str,
            'log_file': log_file,
            'error_details': f"Exception occurred: {str(e)}"
        }
        
        write_error_to_log(output_dir, folder, error_info)
        
        
        with status_lock:
            
            if folder in folder_status and folder_status[folder] == step_index:
                step_counts[step_index] = max(0, step_counts.get(step_index, 0) - 1)
            display_status(len(folder_status))
            
        return False

def process_folder(folder, input_dir, output_dir, log_dir, cores, astral_path):
    """Process a folder through all pipeline steps."""
    global folder_status, step_counts, steps_completed, completed_count, failed_count
    
    script_dir = os.path.dirname(os.path.realpath(__file__))
    
    
    script_paths = [os.path.join(script_dir, script) for script in PIPELINE_STEPS]
    
    
    with status_lock:
        
        folder_status[folder] = 0  
        step_counts[0] = step_counts.get(0, 0) + 1
        display_status(len(folder_status))
    
    
    for i, script_path in enumerate(script_paths):
        
        success = run_step(script_path, folder, i, input_dir, output_dir, log_dir, cores, astral_path)
        
        
        
        is_critical = i in [0, 1, 2, 4, 5]  
        if not success and is_critical:
            
            with status_lock:
                if folder in folder_status:
                    current_step = folder_status[folder]
                    if current_step >= 0 and current_step < len(PIPELINE_STEPS):
                        step_counts[current_step] = max(0, step_counts.get(current_step, 0) - 1)
                folder_status[folder] = -2  
                failed_count += 1
                display_status(len(folder_status))
            
            
            return folder, "FAILED", i
    
    
    with status_lock:
        if folder in folder_status:
            current_step = folder_status[folder]
            if current_step >= 0 and current_step < len(PIPELINE_STEPS):
                step_counts[current_step] = max(0, step_counts.get(current_step, 0) - 1)
        folder_status[folder] = len(PIPELINE_STEPS)  
        completed_count += 1
        display_status(len(folder_status))
    
    
    return folder, "SUCCESS", len(PIPELINE_STEPS)

def initialize_status_counts(total_folders):
    """Initialize the status counters for all steps."""
    global step_counts, steps_completed
    for i in range(len(PIPELINE_STEPS)):
        step_counts[i] = 0
        steps_completed[i] = 0

def check_for_gbk_files(directory):
    """Check if directory contains .gbk files directly"""
    return any(file.endswith('.gbk') for file in os.listdir(directory) if os.path.isfile(os.path.join(directory, file)))

def prepare_single_folder(input_dir, temp_folder_name="single_family"):
    """
    Prepare a single folder with all .gbk files if they are present directly in the input directory.
    
    Args:
        input_dir (str): Input directory path
        temp_folder_name (str): Name of the temporary folder to create
        
    Returns:
        str: The folder name that was created, or None if no .gbk files were found
    """
    
    gbk_files = [f for f in os.listdir(input_dir) if f.endswith('.gbk') and os.path.isfile(os.path.join(input_dir, f))]
    
    if not gbk_files:
        return None
    
    
    single_folder_path = os.path.join(input_dir, temp_folder_name)
    os.makedirs(single_folder_path, exist_ok=True)
    
    
    for gbk_file in gbk_files:
        src_path = os.path.join(input_dir, gbk_file)
        dst_path = os.path.join(single_folder_path, gbk_file)
        shutil.copy2(src_path, dst_path)
    
    print(f"Created {temp_folder_name} folder with {len(gbk_files)} .gbk files")
    return temp_folder_name

def main():
    global completed_count, failed_count
    
    parser = argparse.ArgumentParser(description="Run PanBGC pipeline with parallel folder processing.")
    parser.add_argument("-i", "--input", required=True, help="Input directory containing folders or .gbk files.")
    parser.add_argument("-o", "--output", required=True, help="Output directory for results.")
    parser.add_argument("-log", "--logdir", required=True, help="Directory for log files.")
    parser.add_argument("-c", "--cores", required=True, type=int, help="Number of folders to process in parallel.")
    parser.add_argument("-al", "--align", required=True, help="Path to ASTRAL alignment tool.")
    args = parser.parse_args()
    
    
    os.makedirs(args.output, exist_ok=True)
    os.makedirs(args.logdir, exist_ok=True)
    
    
    has_gbk_files = check_for_gbk_files(args.input)
    
    
    if has_gbk_files:
        print("Detected .gbk files directly in the input directory")
        
        single_folder = prepare_single_folder(args.input)
        if single_folder:
            folders = [single_folder]
            print(f"Will process a single folder: {single_folder}")
        else:
            print("Error: Failed to create a folder for .gbk files")
            return
    else:
        
        folders = [d for d in os.listdir(args.input) 
                  if os.path.isdir(os.path.join(args.input, d)) and not d.startswith('.')]
    
    if not folders:
        print(f"No folders or .gbk files found in {args.input}")
        return
    
    
    initialize_status_counts(len(folders))
    
    
    for folder in folders:
        folder_status[folder] = -1  
    
    
    error_file = os.path.join(args.output, "error.txt")
    if os.path.exists(error_file):
        os.remove(error_file)
    
    
    start_time = time.time()
    
    
    results = []
    
    with ThreadPoolExecutor(max_workers=args.cores) as executor:
        
        future_to_folder = {
            executor.submit(
                process_folder, 
                folder, 
                args.input, 
                args.output, 
                args.logdir, 
                1,  
                args.align
            ): folder for folder in folders
        }
        
        
        for future in concurrent.futures.as_completed(future_to_folder):
            folder = future_to_folder[future]
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                print(f"Error processing {folder}: {e}")
                
                
                error_info = {
                    'step': 'Unknown',
                    'command': 'N/A',
                    'log_file': 'N/A',
                    'error_details': f"Unhandled exception: {str(e)}"
                }
                write_error_to_log(args.output, folder, error_info)
                
                results.append((folder, "ERROR", -1))
    
    
    elapsed_time = time.time() - start_time
    
    
    display_status(len(folders))
    
    
    print(f"\nProcessing completed in {elapsed_time:.2f} seconds")
    print(f"Error details logged to: {os.path.join(args.output, 'error.txt')}")
    
    
    summary_file = os.path.join(args.output, "pipeline_summary.txt")
    with open(summary_file, 'w') as f:
        f.write("PanBGC Pipeline Summary\n")
        f.write("======================\n\n")
        f.write(f"Total folders: {len(folders)}\n")
        f.write(f"Completed successfully: {completed_count}\n")
        f.write(f"Failed: {failed_count}\n")
        f.write(f"Processing time: {elapsed_time:.2f} seconds\n\n")
        
        f.write("Folder\tStatus\tFailed Step\n")
        for folder, status, step_idx in sorted(results):
            failed_step = STEP_NAMES[step_idx] if status == "FAILED" and step_idx >= 0 else "N/A"
            f.write(f"{folder}\t{status}\t{failed_step}\n")
    
    print(f"Summary written to {summary_file}")

if __name__ == "__main__":
    main()