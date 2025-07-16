import os
import pandas as pd
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord
from Bio.SeqFeature import SeqFeature, FeatureLocation
from Bio import SeqIO
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse
from tqdm import tqdm

# Function to create GenBank files
def create_gbk(subfolder_name, df, output_base_path):
    # Sort dataframe by 'OG Consensus Order'
    df = df.sort_values(by='OG Consensus Order')

    # Create a SeqRecord with an empty sequence
    seq_record = SeqRecord(Seq(""), id=subfolder_name, name=subfolder_name, description=f"{subfolder_name}_Max_BGC")
    seq_record.annotations["molecule_type"] = "DNA"

    current_position = 0
    for index, row in df.iterrows():
        og_consensus = row['OG Consensus Sequence']
        pfam_annotation = row['Pfam Domains']
        sequence_length = len(og_consensus)

        # Create a SeqFeature for each OG Consensus Sequence
        feature = SeqFeature(FeatureLocation(start=current_position, end=current_position + sequence_length), type="CDS")
        feature.qualifiers['translation'] = [og_consensus]
        feature.qualifiers['locus_tag'] = [pfam_annotation]

        seq_record.features.append(feature)
        current_position += sequence_length

    # Ensure the output directory exists
    if not os.path.exists(output_base_path):
        os.makedirs(output_base_path)

    # Write to GenBank file
    output_file = os.path.join(output_base_path, f"{subfolder_name}_Max_BGC.gbk")
    SeqIO.write(seq_record, output_file, "genbank")
    print(f"GenBank file created: {output_file}")

# Function to process each subfolder
def process_subfolder(subfolder, input_base_path, output_base_path, tsv_file_name):
    subfolder_path = os.path.join(input_base_path, subfolder, 'Final_Results')
    if os.path.isdir(subfolder_path):
        tsv_path = os.path.join(subfolder_path, tsv_file_name)
        if os.path.exists(tsv_path):
            # Load the TSV file
            data = pd.read_csv(tsv_path, sep='\t')
            print(f"Processing {tsv_path}")
            if not data.empty:
                create_gbk(subfolder, data, output_base_path)

# Parse command-line arguments
def parse_arguments():
    parser = argparse.ArgumentParser(description="Process subfolders and create GenBank files in parallel.")
    parser.add_argument('-i', '--input', required=True, help='Base directory containing the subfolders to process.')
    parser.add_argument('-o', '--output', required=True, help='Output directory for the GenBank files.')
    parser.add_argument('-c', '--cores', required=True, type=int, help='Number of cores to use for parallel execution.')
    return parser.parse_args()

# Main script execution
if __name__ == "__main__":
    args = parse_arguments()

    input_base_path = args.input
    output_base_path = args.output
    cores = args.cores
    tsv_file_name = 'Consolidated_Report.tsv'

    # Get the list of subfolders
    subfolders = [folder for folder in os.listdir(input_base_path) if os.path.isdir(os.path.join(input_base_path, folder))]

    # Set up tqdm progress bar
    progress_bar = tqdm(total=len(subfolders), desc="Processing subfolders")

    # Use ThreadPoolExecutor to process subfolders in parallel
    with ThreadPoolExecutor(max_workers=cores) as executor:
        futures = {executor.submit(process_subfolder, folder, input_base_path, output_base_path, tsv_file_name): folder for folder in subfolders}

        for future in as_completed(futures):
            folder = futures[future]
            try:
                future.result()
            except Exception as exc:
                print(f"{folder} generated an exception: {exc}")
            # Update the progress bar as each task completes
            progress_bar.update(1)

    progress_bar.close()

    print("All subfolders processed.")