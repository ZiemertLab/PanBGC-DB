from Bio import SeqIO
import json
import os
import argparse
import sys

def parse_gbk_file(file_path):
    """
    Parse a GenBank file and extract relevant information.
    
    Parameters:
        file_path (str): Path to the .gbk file.
    
    Returns:
        dict: A dictionary containing extracted information.
    """
    record = SeqIO.read(file_path, "genbank")
    protocluster_categories = set()  
    gene_count = 0
    monomer_pairings_list = []
    product_list = []
    nrps_pks_data = []  
    
    
    leader_sequence = None
    core_sequence = None
    
    
    for feature in record.features:
        if feature.type == "CDS_motif":
            if 'prepeptide' in feature.qualifiers:
                prepeptide_type = feature.qualifiers['prepeptide'][0]
                
                if prepeptide_type == "leader" and 'note' in feature.qualifiers:
                    for note in feature.qualifiers['note']:
                        if "predicted sequence:" in note:
                            leader_sequence = note.split("predicted sequence: ")[1].strip()
                
                if prepeptide_type == "core" and 'core_sequence' in feature.qualifiers:
                    core_sequence = feature.qualifiers['core_sequence'][0]
    
    for feature in record.features:
        if feature.type == "CDS":
            gene_count += 1
            
            orientation = "-" if feature.location.strand == -1 else "+"
            
            
            if 'NRPS_PKS' in feature.qualifiers:
                
                locus_tag = feature.qualifiers.get('locus_tag', ['Unknown'])[0]
                nrps_pks_entries = feature.qualifiers['NRPS_PKS']
                
                
                domains = []
                for entry in nrps_pks_entries:
                    if "Domain:" in entry:
                        domain_info = entry.split("Domain:")[1].split()[0]
                        domains.append(domain_info)
                
                
                nrps_pks_data.append({
                    "locus_tag": locus_tag,
                    "orientation": orientation,  
                    "domains": domains
                })
        
        if feature.type == "protocluster":
            
            if 'category' in feature.qualifiers:
                category = feature.qualifiers['category'][0]
                protocluster_categories.add(category)
            if 'product' in feature.qualifiers:
                product_list.extend(feature.qualifiers['product'])
        if 'monomer_pairings' in feature.qualifiers:
            pairings = feature.qualifiers['monomer_pairings'][0]
            processed_pairings = [pair.split('->')[1].strip() for pair in pairings.split(',')]
            monomer_pairings_list.extend(processed_pairings)

    
    protocluster_category = " / ".join(sorted(protocluster_categories)) if protocluster_categories else None
    monomer_pairings = ", ".join(monomer_pairings_list) if monomer_pairings_list else None

    info = {
        "file_name": os.path.basename(file_path),
        "locus": record.name,
        "organism": record.annotations.get('organism', 'Unknown'),
        "definition": record.description,
        "accession": record.annotations.get('accessions', []),
        "protocluster_category": protocluster_category,  
        "geneNr": gene_count,
        "PKS_NRPS_prediction": monomer_pairings,
        "Product": product_list,
        "NRPS_PKS_data": nrps_pks_data  
    }
    
    
    if leader_sequence or core_sequence:
        info["leader_sequence"] = leader_sequence
        info["core_sequence"] = core_sequence
    
    return info

def process_single_directory(dir_path):
    """
    Process GenBank files in a single directory and save results as JSON.
    
    Parameters:
        dir_path (str): Path to the directory to process.
    
    Returns:
        bool: True if successful, False otherwise.
    """
    input_dir = os.path.join(dir_path, "inputGenbank")
    if not os.path.exists(input_dir):
        print(f"Input directory not found: {input_dir}")
        return False
    
    print(f"Processing GenBank files in: {input_dir}")
    
    try:
        
        gbk_files = [os.path.join(input_dir, f) for f in os.listdir(input_dir) if f.endswith('.gbk')]
        if not gbk_files:
            print(f"No .gbk files found in {input_dir}")
            return False
        
        all_info = []
        for gbk_file in gbk_files:
            print(f"Parsing file: {os.path.basename(gbk_file)}")
            info = parse_gbk_file(gbk_file)
            all_info.append(info)
        
        
        output_dir = os.path.join(dir_path, "Final_Results")
        os.makedirs(output_dir, exist_ok=True)
        
        
        output_file = os.path.join(output_dir, "gbk_info.json")
        with open(output_file, 'w') as json_file:
            json.dump({"data": all_info}, json_file, indent=4)
        
        print(f"Successfully saved data to {output_file}")
        return True
        
    except Exception as e:
        print(f"Error processing directory {dir_path}: {e}")
        return False

def parse_arguments():
    parser = argparse.ArgumentParser(description="Process .gbk files in a directory and save the results as JSON.")
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
