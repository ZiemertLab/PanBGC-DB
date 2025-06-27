import os
import argparse
import re
import subprocess
import sys

def count_leaves(newick_tree):
    """Counts the number of leaves (tips) in a Newick tree by extracting taxon names before ':'"""
    return len(re.findall(r'[^(),:]+(?=:)', newick_tree))

def get_all_taxa(tree_files):
    """Gets all unique taxa names from a list of tree files"""
    all_taxa = set()
    for file_path in tree_files:
        with open(file_path, "r") as file:
            tree_data = file.read().strip()
            taxa = re.findall(r'[^(),:]+(?=:)', tree_data)
            all_taxa.update(taxa)
    return sorted(list(all_taxa))

def process_newick_tree(tree):
    """Cleans leaf names by removing metadata after '|' but before ':'"""
    return re.sub(r'\|[^:]+', '', tree)

def remove_duplicate_trees(tree_contents):
    """Removes duplicate trees from the list based on structure, not branch lengths"""
    unique_trees = []
    tree_signatures = set()
    
    for tree in tree_contents:
        tree_sig = re.sub(r':[0-9.]+', '', tree.strip())
        
        if tree_sig not in tree_signatures:
            tree_signatures.add(tree_sig)
            unique_trees.append(tree)
    

    duplicates = len(tree_contents) - len(unique_trees)
    return unique_trees, duplicates

def run_astral(astral_path, input_tree_file, output_tree_file):
    """Run ASTRAL on the merged trees file"""

    os.makedirs(os.path.dirname(output_tree_file), exist_ok=True)
    

    cmd = [astral_path, "-i", input_tree_file, "-o", output_tree_file]
    
    try:

        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return True, "ASTRAL execution successful"
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else str(e)
        return False, f"ASTRAL execution failed: {error_msg}"
    except Exception as e:
        return False, f"Error running ASTRAL: {str(e)}"

def create_nexus_file(folder_path, bgc_tree_path):
    """Create a nexus file with all OG_*.tre files and the 1_BGC_tree file"""
    og_trees_dir = os.path.join(folder_path, "Ortholog_Group_Processing", "OG_Trees")
    output_nexus = os.path.join(folder_path, "nexus.nex")
    

    if not os.path.exists(og_trees_dir):
        return False, f"OG_Trees directory not found: {og_trees_dir}"
    

    if not os.path.exists(bgc_tree_path):
        return False, f"BGC tree file not found: {bgc_tree_path}"
    

    og_files = []
    for filename in os.listdir(og_trees_dir):
        if filename.endswith(".tre"):
            og_files.append(os.path.join(og_trees_dir, filename))
    
    if not og_files:
        return False, "No OG tree files found"
    

    all_taxa = get_all_taxa(og_files + [bgc_tree_path])

    with open(output_nexus, "w") as f:

        f.write("#NEXUS\n\n")
        

        f.write("Begin taxa;\n")
        f.write(f"    Dimensions ntax={len(all_taxa)};\n")
        f.write("    Taxlabels \n")
        f.write("        " + " ".join(all_taxa) + ";\n")
        f.write("End;\n\n")
        

        f.write("Begin trees;\n")
        

        for og_file in og_files:
            og_name = os.path.basename(og_file).replace(".tre", "")
            with open(og_file, "r") as tree_file:
                tree_content = tree_file.read().strip()

                tree_content = process_newick_tree(tree_content)
                f.write(f"    Tree {og_name} = {tree_content};\n")

        with open(bgc_tree_path, "r") as tree_file:
            tree_content = tree_file.read().strip()

            tree_content = process_newick_tree(tree_content)
            f.write(f"    Tree 1_BGC_tree = {tree_content};\n")
        
        f.write("End;")
    
    return True, f"Created NEXUS file: {output_nexus}"

def process_single_folder(folder_path, astral_path=None):
    """
    Process a single folder to merge .tre files, run ASTRAL, and create NEXUS file.
    Returns a tuple (success, message, tree_count, duplicates_removed, astral_success, nexus_success)
    """
    og_trees_dir = os.path.join(folder_path, "Ortholog_Group_Processing", "OG_Trees")
    output_dir = os.path.join(folder_path, "Ortholog_Group_Processing")
    merged_trees_file = os.path.join(output_dir, "merged_trees.nw")
    
    if not os.path.exists(og_trees_dir):
        print(f"Skipping {folder_path}: OG_Trees directory not found.")
        return False, "OG_Trees directory not found", 0, 0, False, False
    

    os.makedirs(output_dir, exist_ok=True)
    
    tree_contents = []
    skipped_count = 0
    
    for filename in os.listdir(og_trees_dir):
        if filename.endswith(".tre"):
            file_path = os.path.join(og_trees_dir, filename)
            with open(file_path, "r") as file:
                tree_data = file.read().strip()
                cleaned_tree = process_newick_tree(tree_data)
                leaf_count = count_leaves(cleaned_tree)
                if leaf_count > 1:
                    tree_contents.append(cleaned_tree)
                else:
                    skipped_count += 1
    
    if not tree_contents:
        print(f"No valid .tre files (with more than one leaf) found in {og_trees_dir}.")
        return False, "No valid .tre files with more than one leaf", 0, 0, False, False
    

    deduplicated_trees, duplicates_removed = remove_duplicate_trees(tree_contents)
    

    with open(merged_trees_file, "w") as output:
        output.write("\n".join(deduplicated_trees) + "\n")
    
    message = f"Merged {len(deduplicated_trees)} trees into: {merged_trees_file}"
    if duplicates_removed > 0:
        message += f" (removed {duplicates_removed} duplicate trees)"
    if skipped_count > 0:
        message += f" (skipped {skipped_count} single-leaf trees)"
    
    print(message)
    

    astral_success = False
    nexus_success = False
    
    if astral_path:

        output_tree_file = os.path.join(output_dir, "1_BGC_tree.nw")
        
        astral_success, astral_message = run_astral(astral_path, merged_trees_file, output_tree_file)
        message += f" | ASTRAL: {astral_message}"
        print(astral_message)
        

        if astral_success:
            nexus_success, nexus_message = create_nexus_file(folder_path, output_tree_file)
            message += f" | NEXUS: {nexus_message}"
            print(nexus_message)
    
    return True, message, len(deduplicated_trees), duplicates_removed, astral_success, nexus_success

def parse_arguments():
    parser = argparse.ArgumentParser(description="Process a single folder with ASTRAL and create NEXUS file.")
    parser.add_argument("-i", "--input", required=True, help="Path to the folder to process.")
    parser.add_argument("-c", "--cores", required=True, type=int, help="Number of cores (not used for single directory).")
    parser.add_argument("-al", "--align", help="Path to ASTRAL-Pro3 executable. If provided, will run ASTRAL.")
    args = parser.parse_args()
    
    return args

if __name__ == "__main__":
    args = parse_arguments()
    
    folder_path = args.input
    astral_path = args.align
    
    print(f"Processing folder: {folder_path}")
    if astral_path:
        print(f"Using ASTRAL at: {astral_path}")
    
    success, message, tree_count, duplicates, astral_success, nexus_success = process_single_folder(
        folder_path, astral_path
    )
    
    print("\nProcessing Summary:")
    print("-" * 50)
    status = "SUCCESS" if success else "FAILED"
    astral_status = "SUCCESS" if astral_success else "SKIPPED" if not astral_path else "FAILED"
    nexus_status = "SUCCESS" if nexus_success else "SKIPPED" if not astral_path else "FAILED"
    
    print(f"Status: {status}")
    print(f"Trees processed: {tree_count}")
    print(f"Duplicates removed: {duplicates}")
    print(f"ASTRAL: {astral_status}")
    print(f"NEXUS: {nexus_status}")
    print(f"Details: {message}")
    print("-" * 50)
    

    sys.exit(0 if success else 1)
