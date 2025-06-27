import os
import json
import argparse
import sys
from pathlib import Path

def process_single_folder(folder_path):
    """
    Reads JSON files in the Final_Results folder and the nexus.nex file,
    then writes them concatenated with `***` delimiters into Visualisation.json.
    
    Args:
        folder_path (str): Path to the folder to process
        
    Returns:
        bool: True if successful, False otherwise
    """
    final_results_path = os.path.join(folder_path, "Final_Results")
    
    
    if not os.path.isdir(final_results_path):
        print(f"Final_Results directory not found in {folder_path}")
        return False
    
    
    files_to_concatenate = ["gbk_info.json", "genbank_data.json", "Report.json", "heaps_law.json"]
    
    
    nexus_path = os.path.join(folder_path, "nexus.nex")
    
    result_content = []

    print(f"Processing folder: {folder_path}")
    
    try:
        
        for file_name in files_to_concatenate:
            file_path = os.path.join(final_results_path, file_name)
            if os.path.isfile(file_path):
                with open(file_path, 'r', encoding='utf-8') as file:
                    try:
                        data = json.load(file)
                        formatted_json = json.dumps(data, indent=4)
                        result_content.append(formatted_json)
                    except json.JSONDecodeError as e:
                        print(f"Error parsing JSON in {file_path}: {e}")
            else:
                print(f"File not found: {file_path}. Skipping...")

        
        if os.path.isfile(nexus_path):
            with open(nexus_path, 'r', encoding='utf-8') as file:
                nexus_content = file.read()
            result_content.append(nexus_content)  
        else:
            print(f"NEXUS file not found at: {nexus_path}. Skipping...")

        
        if result_content:  
            output_file = os.path.join(final_results_path, "Visualisation.json")
            with open(output_file, 'w', encoding='utf-8') as out_file:
                out_file.write('\n***\n'.join(result_content))  
            print(f"Created Visualisation.json in: {final_results_path}")
            return True
        else:
            print(f"No content to write for {folder_path}")
            return False
            
    except Exception as e:
        print(f"Error processing {folder_path}: {e}")
        return False

def parse_arguments():
    parser = argparse.ArgumentParser(description="Create Visualisation.json for a single folder.")
    parser.add_argument("-i", "--input", required=True, help="Path to the folder to process.")
    parser.add_argument("-c", "--cores", required=True, type=int, help="Number of cores (not used for single folder).")
    
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_arguments()
    
    folder_path = args.input
    
    print(f"Processing folder: {folder_path}")
    success = process_single_folder(folder_path)
    
    if success:
        print(f"Successfully created Visualisation.json for: {folder_path}")
    else:
        print(f"Failed to create Visualisation.json for: {folder_path}")
        
        sys.exit(0)