# PanBGC-DB

**PanBGC-DB** is a publicly available database and analysis platform designed to explore the genetic diversity and evolutionary dynamics of biosynthetic gene cluster (BGC) families using a pangenome-inspired framework. The platform integrates large-scale BGC datasets from antiSMASH-DB and MIBiG, clusters them into gene cluster families (GCFs), and applies orthologous grouping and openness metrics to characterize core, accessory, and unique genes within each family.

## Features

- Interactive visualization of BGC families and gene presence/absence matrices  
- Gene classification into core, accessory, and unique types  
- Openness metric calculation using Heaps’ Law  
- Comparative views of gene architecture, domain organization, and phylogenetic relationships  
- Query tool for uploading and comparing custom BGCs  

## Access

The web platform is available at:  
👉 https://panbgc-db.cs.uni-tuebingen.de

## Source Code

This repository contains the source code for:
- The PanBGC-DB web interface
- The backend clustering, orthologous grouping, and openness analysis scripts
- Data processing and visualization modules

## How to Create the Visualization

### Prerequisites

These instructions work for **Linux** and **macOS**. If you are on Windows, the **Windows Subsystem for Linux (WSL)** is recommended.

1. **Install Miniconda**  
   Download and install [Miniconda](https://docs.conda.io/en/latest/miniconda.html) for your operating system.

2. **Download Required Tools**  
   - Download and extract the folder [`Astral-Pro3`](https://github.com/chaoszhang/ASTER/blob/master/tutorial/astral-pro3.md) from GitHub.  
   - Download and extract the [`Scripts.zip`](https://panbgc-db.cs.uni-tuebingen.de/data/Scripts.zip) file.

### Installation Commands

**For Debian/Ubuntu and macOS with Intel chip:**
```bash
conda create --name PanBGC_vis -c conda-forge -c bioconda zol
```

**For macOS with Apple Silicon chip:**
```bash
CONDA_SUBDIR=osx-64 conda create -n PanBGC_vis -c conda-forge -c bioconda zol
```

**For all systems (after creating the environment):**
```bash
conda activate PanBGC_vis
pip install openpyxl tqdm
```

> **Note:** If you want to use all annotation libraries, you can remove the `-m` flag from the following command (increases download and run time):
```bash
setup_annotation_dbs.py -m
```

### Running the Pipeline

1. **Extract the Scripts**  
   Unzip the downloaded `Scripts.zip` to a location of your choice.

2. **Navigate to the Scripts Directory**
```bash
cd /path/to/extracted/Scripts
```

3. **Run the Pipeline**

If visualizing a **single Gene Cluster Family (GCF)**, the input folder can contain GenBank files directly.  
For **multiple GCFs**, place subfolders (each containing GenBank files) inside the input folder. No further changes are required.

```bash
python PanBGC.py -i /path/to/input_folder \
                 -o /path/to/result_folder \
                 -log /path/to/result_folder/log \
                 -c number_of_threads \
                 -al /path/to/astral-pro3
```

> **Note:** The `astral-pro3` executable is found in the extracted `Astral-Pro3` folder under:  
> `ASTER-Linux/bin/astral-pro3`

**Parameters Explained:**
- `-i`: Path to the input folder with GenBank files
- `-o`: Path to the output directory
- `-log`: Log file location
- `-c`: Number of CPU threads to use
- `-al`: Path to `astral-pro3` executable

### Upload Results

After successful execution, your output folder will contain:
```
/path/to/result_folder/signal_family/Final_Results/Visualisation.json
```

This file can be uploaded directly using the form on the left side of the PanBGC-DB interface.

**Example command:**
```bash
python PanBGC.py -i ~/data/genomes \
                 -o ~/results/analysis \
                 -log ~/results/analysis/pipeline.log \
                 -c 4 \
                 -al ~/tools/ASTER-Linux/bin/astral-pro3
```

