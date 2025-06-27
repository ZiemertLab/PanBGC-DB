import os
import shutil
import subprocess
import sys
import argparse

def process_folder(input_dir, output_dir, log_file_path, cores):
    """Process a single folder with zol command."""
    
    input_genbank_dir = os.path.join(output_dir, 'inputGenbank')
    os.makedirs(input_genbank_dir, exist_ok=True)

    
    for file_name in os.listdir(input_dir):
        full_file_name = os.path.join(input_dir, file_name)
        if os.path.isfile(full_file_name):
            shutil.copy(full_file_name, input_genbank_dir)

    
    try:
        
        command = f'echo n | zol -i "{input_dir}" -o "{output_dir}" -r'
        with open(log_file_path, 'a') as log_file:
            log_file.write(f"\nRunning command: {command}\n")
            
            
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=log_file,
                stderr=log_file,
                stdin=subprocess.DEVNULL  
            )
            
            
            try:
                process.wait(timeout=3600)  
                success = process.returncode == 0
            except subprocess.TimeoutExpired:
                log_file.write("\nProcess timed out after 1 hour\n")
                process.kill()
                success = False
                
        
        consolidated_report_path = os.path.join(output_dir, "Final_Results", "Consolidated_Report.xlsx")
        if os.path.exists(consolidated_report_path) and os.path.getsize(consolidated_report_path) > 0:
            with open(log_file_path, 'a') as log_file:
                log_file.write("\nConsolidated_Report.xlsx found and not empty. Continuing regardless of zol command exit status.\n")
            
            success = True
        
        return success
    except subprocess.CalledProcessError as e:
        with open(log_file_path, 'a') as log_file:
            log_file.write(f"\nError processing folder: {e}\n")
            
        
        consolidated_report_path = os.path.join(output_dir, "Final_Results", "Consolidated_Report.xlsx")
        if os.path.exists(consolidated_report_path) and os.path.getsize(consolidated_report_path) > 0:
            with open(log_file_path, 'a') as log_file:
                log_file.write("\nConsolidated_Report.xlsx found and not empty. Continuing despite error.\n")
            return True
        return False
    except Exception as e:
        with open(log_file_path, 'a') as log_file:
            log_file.write(f"\nUnexpected error: {e}\n")
            
        
        consolidated_report_path = os.path.join(output_dir, "Final_Results", "Consolidated_Report.xlsx")
        if os.path.exists(consolidated_report_path) and os.path.getsize(consolidated_report_path) > 0:
            with open(log_file_path, 'a') as log_file:
                log_file.write("\nConsolidated_Report.xlsx found and not empty. Continuing despite error.\n")
            return True
        return False

def parse_arguments():
    parser = argparse.ArgumentParser(description="Run Zol processing on a single folder.")
    parser.add_argument('-i', '--input', required=True, help='Path to the input directory.')
    parser.add_argument('-o', '--output', required=True, help='Path to the output directory.')
    parser.add_argument('-log', '--logfile', required=True, help='Path to the log file.')
    parser.add_argument('-c', '--cores', required=True, type=int, help='Number of cores to use.')
    
    return parser.parse_args()

if __name__ == "__main__":
    
    args = parse_arguments()
    
    print(f"Processing folder: {os.path.basename(args.input)}")
    
    
    final_results_dir = os.path.join(args.output, "Final_Results")
    os.makedirs(final_results_dir, exist_ok=True)
    
    
    success = process_folder(args.input, args.output, args.logfile, args.cores)
    
    
    if success:
        print(f"Successfully processed folder: {os.path.basename(args.input)}")
    else:
        print(f"Failed to process folder: {os.path.basename(args.input)}")
    
    
    sys.exit(0 if success else 1)