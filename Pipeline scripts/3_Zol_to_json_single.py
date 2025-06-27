import pandas as pd
import json
import os
import re
import argparse

def process_single_directory(dir_path):
    """
    Process a single directory to convert Excel results to JSON.
    
    Args:
        dir_path (str): Path to the directory to process
    
    Returns:
        bool: True if successful, False otherwise
    """
    
    if not os.path.exists(dir_path) or not os.path.isdir(dir_path):
        print(f"{dir_path} does not exist or is not a directory.")
        return False
    
    
    file_path = os.path.join(dir_path, "Final_Results", "Consolidated_Report.xlsx")
    input_genbank_dir = os.path.join(dir_path, "Local_Modified_GenBanks")
    
    
    if os.path.exists(input_genbank_dir):
        total_bgcs = len([f for f in os.listdir(input_genbank_dir) 
                         if os.path.isfile(os.path.join(input_genbank_dir, f))])
        print(f"Found {total_bgcs} files in {input_genbank_dir}")
    else:
        print(f"Local_Modified_GenBanks directory not found: {input_genbank_dir}")
        total_bgcs = 0  
    
    
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist.")
        return False
    
    try:
        
        print(f"Processing file: {file_path}")
        excel_data = pd.ExcelFile(file_path)

        
        zol_results_df = pd.read_excel(file_path, sheet_name='ZoL Results')

        
        def count_cds_locus_tags(row):
            if pd.isna(row):
                return 0
            return len(str(row).split(';'))

        
        if 'CDS Locus Tags' in zol_results_df.columns:
            
            zol_results_df['BGC_count'] = zol_results_df['CDS Locus Tags'].apply(count_cds_locus_tags)
        else:
            print("'CDS Locus Tags' column not found in the sheet.")
            zol_results_df['BGC_count'] = 0  

        
        def sanitize_column_name(col_name):
            return re.sub(r"[()\'-?]", "", col_name).replace(" ", "_")

        
        zol_results_df.columns = [sanitize_column_name(col) for col in zol_results_df.columns]

        
        def extract_og_number(og_id):
            match = re.search(r'OG_(\d+)', str(og_id))
            if match:
                return int(match.group(1))
            return og_id

        
        if 'Ortholog_Group_OG_ID' in zol_results_df.columns:
            zol_results_df['Ortholog_Group_OG_ID'] = zol_results_df['Ortholog_Group_OG_ID'].apply(extract_og_number)
        else:
            print("'Ortholog_Group_OG_ID' column not found in the sheet.")

        
        def clean_og_consensus_direction(direction):
            direction = str(direction).strip("\"")  
            if direction in ['+', '-']:
                return direction
            return direction  

        
        if 'OG_Consensus_Direction' in zol_results_df.columns:
            zol_results_df['OG_Consensus_Direction'] = zol_results_df['OG_Consensus_Direction'].apply(clean_og_consensus_direction)
        else:
            print("'OG_Consensus_Direction' column not found in the sheet.")

        
        zol_results_df = zol_results_df.fillna("-")

        
        zol_results_list = zol_results_df.to_dict(orient='records')

        
        for record in zol_results_list:
            record['total_BGCs'] = total_bgcs

        
        os.makedirs(os.path.dirname(os.path.join(dir_path, "Final_Results")), exist_ok=True)
        
        
        json_file_path = os.path.join(dir_path, "Final_Results", "Report.json")
        with open(json_file_path, 'w') as json_file:
            json.dump(zol_results_list, json_file, indent=4)

        print(f'JSON file saved to {json_file_path}')
        return True
        
    except Exception as e:
        print(f"An error occurred while processing {file_path}: {e}")
        return False

def parse_arguments():
    parser = argparse.ArgumentParser(description="Process Excel file in a single directory and save the results as JSON.")
    parser.add_argument('-dir', '--directory', required=True, help='Directory to process.')
    parser.add_argument('-c', '--cores', required=True, type=int, help='Number of cores (not used for single directory).')
    
    return parser.parse_args()

if __name__ == "__main__":
    
    args = parse_arguments()
    
    directory_path = args.directory
    
    
    print(f"Processing directory: {directory_path}")
    success = process_single_directory(directory_path)
    
    if success:
        print(f"Successfully processed directory: {directory_path}")
    else:
        print(f"Failed to process directory: {directory_path}")
        sys.exit(1)  
