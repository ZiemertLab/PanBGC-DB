import os
import json
from Bio import SeqIO
import math
import argparse
import sys


def replace_nan(value):
    return "-" if value is None or (isinstance(value, float) and math.isnan(value)) else value


def extract_gbk_data(gbk_file_path, ortholog_info):
    result = {}
    file_name_without_extension = os.path.splitext(os.path.basename(gbk_file_path))[0]
    
    for record in SeqIO.parse(gbk_file_path, "genbank"):
        
        result['total_length'] = replace_nan(len(record.seq))
        total_length = result['total_length']  
        
        
        genes = []
        for feature in record.features:
            if feature.type == "CDS":
                locus_tag = feature.qualifiers.get('locus_tag', [''])[0]
                start = int(feature.location.start)
                end = int(feature.location.end)
                orientation = '+' if feature.strand == 1 else '-'
                
                
                inverted_start = total_length - start
                inverted_end = total_length - end
                inverted_orientation = '-' if orientation == '+' else '+'
                
                gene_data = {
                    'start': replace_nan(start),
                    'end': replace_nan(end),
                    'orientation': orientation,
                    'locus_tag': replace_nan(locus_tag),
                    'inverted_start': replace_nan(inverted_start),
                    'inverted_end': replace_nan(inverted_end),
                    'inverted_orientation': inverted_orientation
                }

                
                ortholog_group, annotations, single_gene = find_ortholog_group_and_annotation(ortholog_info, file_name_without_extension, locus_tag)
                gene_data['Ortholog_Group_OG_ID'] = replace_nan(ortholog_group)
                if annotations:
                    gene_data.update({key: replace_nan(value) for key, value in annotations.items()})
                gene_data['single_gene'] = replace_nan(single_gene)  
                
                genes.append(gene_data)
        
        result['genes'] = genes
    
    return result


def find_ortholog_group_and_annotation(ortholog_info, file_name, locus_tag):
    for entry in ortholog_info:
        
        cds_locus_tags = entry.get('CDS_Locus_Tags', '').split(';')
        is_single_gene = len(cds_locus_tags) == 1  
        
        for cds_tag in cds_locus_tags:
            
            if '|' not in cds_tag:
                continue
                
            bgc, tag = cds_tag.strip().split('|')
            
            if bgc.strip().lower() == file_name.lower() and tag.strip().lower() == locus_tag.lower():
                ortholog_group = replace_nan(entry.get('Ortholog_Group_OG_ID'))
                
                annotations = {
                    'PGAP_Annotation_Evalue': replace_nan(entry.get('PGAP_Annotation_Evalue', 'No annotation available')),
                    'KO_Annotation_Evalue': replace_nan(entry.get('KO_Annotation_Evalue', 'No annotation available')),
                    'PaperBLAST_Annotation_Evalue': replace_nan(entry.get('PaperBLAST_Annotation_Evalue', 'No annotation available')),
                    'CARD_Annotation_Evalue': replace_nan(entry.get('CARD_Annotation_Evalue', 'No annotation available')),
                    'IS_Finder_Evalue': replace_nan(entry.get('IS_Finder_Evalue', 'No annotation available')),
                    'MIBig_Annotation_Evalue': replace_nan(entry.get('MIBig_Annotation_Evalue', 'No annotation available')),
                    'VOG_Annotation_Evalue': replace_nan(entry.get('VOG_Annotation_Evalue', 'No annotation available')),
                    'VFDB_Annotation_Evalue': replace_nan(entry.get('VFDB_Annotation_Evalue', 'No annotation available')),
                    'Pfam_Domains': replace_nan(entry.get('Pfam_Domains', 'No annotation available'))
                }
                return ortholog_group, annotations, is_single_gene
    return None, None, False  

def process_single_folder(folder_path):
    """
    Process a single folder to extract GenBank visualization data.
    """
    input_genbank_folder = os.path.join(folder_path, 'Local_Modified_GenBanks')
    if not os.path.exists(input_genbank_folder):
        print(f"Skipping {folder_path}: Missing Local_Modified_GenBanks folder.")
        return False

    
    report_json_path = os.path.join(folder_path, 'Final_Results', 'Report.json')
    if not os.path.exists(report_json_path):
        print(f"Skipping {folder_path}: Missing Report.json file.")
        return False
    
    try:
        with open(report_json_path, 'r') as json_file:
            ortholog_info = json.load(json_file)
    except Exception as e:
        print(f"Error loading Report.json from {report_json_path}: {e}")
        return False

    
    json_output = {}

    
    for gbk_file in os.listdir(input_genbank_folder):
        if gbk_file.endswith('.gbk'):
            gbk_file_path = os.path.join(input_genbank_folder, gbk_file)
            print(f"Processing file: {gbk_file}")
            json_output[os.path.splitext(gbk_file)[0]] = extract_gbk_data(gbk_file_path, ortholog_info)

    
    output_dir = os.path.join(folder_path, 'Final_Results')
    os.makedirs(output_dir, exist_ok=True)
    output_json_path = os.path.join(output_dir, 'genbank_data.json')

    
    with open(output_json_path, 'w') as json_file:
        json.dump(json_output, json_file, indent=4)
    print(f"Data saved to {output_json_path}")
    
    return True

def parse_arguments():
    parser = argparse.ArgumentParser(description="Process GenBank files from a single folder for visualization.")
    parser.add_argument("-i", "--input", required=True, help="Path to the folder to process.")
    parser.add_argument("-c", "--cores", required=True, type=int, help="Number of cores (not used for single directory).")
    
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_arguments()
    
    folder_path = args.input
    
    print(f"Processing folder: {folder_path}")
    success = process_single_folder(folder_path)
    
    if success:
        print(f"Successfully processed folder: {folder_path}")
    else:
        print(f"Failed to process folder: {folder_path}")
        sys.exit(1)  
