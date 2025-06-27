import os
import json
import numpy as np
import math
from scipy import stats
import argparse
import sys

def calculate_heaps_law(data):
    """
    Calculate Heaps Law parameters and store gene-BGC associations for dynamic threshold adjustment
    """
    
    gene_to_bgcs = {}
    all_bgcs = set()
    
    
    for entry in data:
        if "Ortholog_Group_OG_ID" not in entry or "CDS_Locus_Tags" not in entry:
            continue
            
        gene_id = str(entry["Ortholog_Group_OG_ID"])
        locus_tags = entry["CDS_Locus_Tags"]
        
        if gene_id not in gene_to_bgcs:
            gene_to_bgcs[gene_id] = set()
            
        
        bgcs = locus_tags.split(";")
        for bgc in bgcs:
            parts = bgc.split("|")
            if len(parts) < 2:
                continue
                
            bgc_id = parts[0].strip()
            gene_to_bgcs[gene_id].add(bgc_id)
            all_bgcs.add(bgc_id)
    
    
    bgc_to_genes = {}
    for gene, bgcs in gene_to_bgcs.items():
        for bgc in bgcs:
            if bgc not in bgc_to_genes:
                bgc_to_genes[bgc] = set()
            bgc_to_genes[bgc].add(gene)
    
    
    bgc_list = list(all_bgcs)
    total_bgcs = len(bgc_list)
    
    
    gene_bgc_counts = {}
    for gene, bgcs in gene_to_bgcs.items():
        gene_bgc_counts[gene] = len(bgcs)
    
    
    np.random.seed(42)  
    x_values = []
    y_values = []
    
    
    shuffled_bgcs = list(bgc_list)
    np.random.shuffle(shuffled_bgcs)
    
    seen_genes = set()
    for i, bgc in enumerate(shuffled_bgcs):
        if bgc in bgc_to_genes:
            for gene in bgc_to_genes[bgc]:
                seen_genes.add(gene)
        
        x_values.append(i + 1)
        y_values.append(len(seen_genes))
    
    
    if len(x_values) >= 2:
        log_x = np.log(x_values)
        log_y = np.log(y_values)
        slope, intercept, r_value, p_value, std_err = stats.linregress(log_x, log_y)
        gamma = slope
        k = math.exp(intercept)
    else:
        gamma = 0.0
        k = 0.0
    
    
    sim_seeds = [12345 + i for i in range(30)]
    
    
    
    fixed_permutations = []
    for seed in sim_seeds:
        np.random.seed(seed)
        perm = list(bgc_list)
        np.random.shuffle(perm)
        fixed_permutations.append(perm)
    
    
    serializable_gene_to_bgcs = {}
    for gene, bgcs in gene_to_bgcs.items():
        serializable_gene_to_bgcs[gene] = list(bgcs)
    
    serializable_bgc_to_genes = {}
    for bgc, genes in bgc_to_genes.items():
        serializable_bgc_to_genes[bgc] = list(genes)
    
    
    output = {
        "gamma": gamma,
        "k": k,
        "bgcCount": total_bgcs,
        "geneCount": len(gene_to_bgcs),
        "rawCurve": {
            "x": x_values,
            "y": y_values
        },
        "simulationData": {
            "geneToBgcs": serializable_gene_to_bgcs,
            "bgcToGenes": serializable_bgc_to_genes,
            "permutations": fixed_permutations
        }
    }
    
    return output

def process_single_directory(dir_path):
    """Process a single directory to calculate Heaps Law parameters"""
    
    report_path = os.path.join(dir_path, "Final_Results", "Report.json")
    
    
    if not os.path.exists(report_path):
        print(f"Report.json not found at: {report_path}")
        return False
    
    print(f"Processing Heaps Law for: {report_path}")
    
    try:
        
        with open(report_path, 'r') as f:
            data = json.load(f)
        
        
        if not isinstance(data, list) or len(data) == 0:
            print(f"Error: Invalid data format in {report_path}")
            return False
        
        
        results = calculate_heaps_law(data)
        
        
        output_path = os.path.join(os.path.dirname(report_path), "heaps_law.json")
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
            
        print(f"Successfully processed {report_path}")
        print(f"Gamma value: {results['gamma']:.3f}")
        print(f"Results saved to {output_path}")
        return True
        
    except Exception as e:
        print(f"Error processing {report_path}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def parse_arguments():
    parser = argparse.ArgumentParser(description="Calculate Heaps Law parameters for a single directory.")
    parser.add_argument('-dir', '--directory', required=True, help='Directory to process.')
    parser.add_argument('-c', '--cores', required=True, type=int, help='Number of cores (not used for single directory).')
    
    return parser.parse_args()

if __name__ == "__main__":
    
    args = parse_arguments()
    
    directory_path = args.directory
    
    
    print(f"Processing directory for Heaps Law calculation: {directory_path}")
    success = process_single_directory(directory_path)
    
    if success:
        print(f"Successfully calculated Heaps Law for directory: {directory_path}")
    else:
        print(f"Failed to calculate Heaps Law for directory: {directory_path}")
        sys.exit(1)  
