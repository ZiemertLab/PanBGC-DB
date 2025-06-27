document.addEventListener("DOMContentLoaded", () => {
    const fileTitle = document.getElementById("file-title");
    const fileUpload = document.getElementById("file-upload");
    const feedback = document.getElementById("upload-feedback");
    const uploadButton = document.getElementById("upload-button");
    const uploadContainer = document.querySelector(".upload-container");
    const resultsContainer = document.getElementById("results-container");
    const resultsScrollArea = document.querySelector(".results-scroll-area");
    const plotContainer = document.getElementById("plot-container");

    
    function adjustContainerHeights() {
        
        const uploadHeight = uploadContainer.offsetHeight;
        
        
        resultsContainer.style.height = `${uploadHeight}px`;
        
        
        const resultsHeader = resultsContainer.querySelector("h2");
        const headerHeight = resultsHeader ? resultsHeader.offsetHeight : 0; 
        
        
        resultsScrollArea.style.height = `${uploadHeight - headerHeight}px`;
    }

    
    setTimeout(adjustContainerHeights, 100);
    
    
    window.addEventListener("resize", adjustContainerHeights);

    
    const fileUploadInfo = document.querySelector(".file-upload-info");
    fileUpload.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileUploadInfo.textContent = "Drop file here";
        fileUploadInfo.style.color = "#1abc9c";
        document.querySelector(".file-upload-wrapper").style.borderColor = "#1abc9c";
    });

    fileUpload.addEventListener("dragleave", (e) => {
        e.preventDefault();
        fileUploadInfo.textContent = "Supports .gbk format only";
        fileUploadInfo.style.color = "#95a5a6";
        document.querySelector(".file-upload-wrapper").style.borderColor = "#dde1e7";
    });

    fileUpload.addEventListener("drop", () => {
        fileUploadInfo.textContent = "File selected";
        fileUploadInfo.style.color = "#4caf50";
    });

    
    const ensureScrollable = () => {
        const pageContainer = document.getElementById("page-container");
        const contentHeight = pageContainer.scrollHeight;
        const viewportHeight = window.innerHeight;

        if (contentHeight < viewportHeight) {
            pageContainer.style.minHeight = `${viewportHeight}px`;
        }
    };

    
    ensureScrollable();

    const mutationObserver = new MutationObserver(() => {
        ensureScrollable();
        adjustContainerHeights();
    });
    
    mutationObserver.observe(document.getElementById("content-wrap"), {
        childList: true,
        subtree: true,
    });

    let sessionId = null;
    let filePath = null;

    
    const runningMessage = document.createElement("p");
    runningMessage.style.display = "none";
    runningMessage.style.color = "#2c3e50";
    runningMessage.innerHTML = '<i class="fas fa-cog fa-spin"></i> Processing...';
    uploadContainer.appendChild(runningMessage);

    const resultMessage = document.createElement("p");
    resultMessage.style.display = "none";
    uploadContainer.appendChild(resultMessage);

    
    function createPlaceholder(icon, title, message) {
        const placeholder = document.createElement("div");
        placeholder.className = "placeholder-message";
        
        const iconElement = document.createElement("i");
        iconElement.className = icon;
        
        const titleElement = document.createElement("h3");
        titleElement.textContent = title;
        
        const messageElement = document.createElement("p");
        messageElement.textContent = message;
        
        placeholder.appendChild(iconElement);
        placeholder.appendChild(titleElement);
        placeholder.appendChild(messageElement);
        
        return placeholder;
    }

    
    function parseResults(data) {
        resultsScrollArea.innerHTML = ""; 
        
        const table = document.createElement("table");
        table.id = "results-table";
        table.style.width = "100%";
        table.style.borderCollapse = "separate";
        table.style.borderSpacing = "0";

        const headerRow = document.createElement("tr");
        ["Nr.", "Family nr.", "Score", "Link"].forEach((header) => {
            const th = document.createElement("th");
            th.textContent = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        
        const lines = data.split("\n");
        const entries = [];
        
        
        for (let i = 0; i < lines.length; i++) {
            
            const clusterMatch = lines[i].match(/Cluster (\d+), score (\d+\.\d+):/);
            if (clusterMatch) {
                const score = parseFloat(clusterMatch[2]);
                
                
                let familyName = "Unknown";
                for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                    
                    if (lines[j].trim().match(/^[A-Za-z0-9]+_FAM_\d+$/)) {
                        familyName = lines[j].trim();
                        break;
                    }
                    
                    const longFormatMatch = lines[j].trim().match(/^([A-Za-z0-9]+_FAM_\d+)_Max_BGC$/);
                    if (longFormatMatch) {
                        familyName = longFormatMatch[1]; 
                        break;
                    }
                }
                
                entries.push({ family: familyName, score: score });
            }
        }

        entries.sort((a, b) => b.score - a.score);

        if (entries.length === 0) {
            const noResults = document.createElement("div");
            noResults.className = "no-results-message";
            noResults.innerHTML = '<i class="fas fa-info-circle"></i> No results found in the analysis.';
            resultsScrollArea.appendChild(noResults);
            return;
        }

        entries.forEach((entry, index) => {
            const row = document.createElement("tr");

            [index + 1, entry.family, entry.score.toFixed(2)].forEach((value) => {
                const td = document.createElement("td");
                td.textContent = value;
                row.appendChild(td);
            });

            
            const linkTd = document.createElement("td");
            const button = document.createElement("button");
            button.innerHTML = '<i class="fas fa-external-link-alt"></i> View';
            button.onclick = () => {
                const familyName = entry.family.replace(/\s+/g, "_"); 
                
                const url = `/bgc/${familyName}`;
                window.open(url, "_blank");
            };
            linkTd.appendChild(button);
            row.appendChild(linkTd);

            table.appendChild(row);
        });

        resultsScrollArea.appendChild(table);
        
        
        adjustContainerHeights();
    }

    
    fileUpload.addEventListener("change", () => {
        const file = fileUpload.files[0];
        const title = fileTitle.value.trim() || file?.name?.split('.')[0] || "Untitled"; 

        if (file) {
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();

            if (fileExtension === "gbk") {
                feedback.innerHTML = `<i class="fas fa-check-circle"></i> File "${fileName}" with title "${title}" is ready.`;
                feedback.classList.remove("error");
                feedback.classList.add("success");
                uploadButton.style.display = "block"; 
                
                
                fileUploadInfo.textContent = fileName;
                fileUploadInfo.style.color = "#4caf50";
            } else {
                feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> Invalid file type. Please upload a .gbk file.`;
                feedback.classList.remove("success");
                feedback.classList.add("error");
                fileUpload.value = ""; 
                uploadButton.style.display = "none"; 
            }
        } else {
            feedback.innerHTML = "<i class='fas fa-exclamation-circle'></i> No file selected.";
            feedback.classList.remove("success");
            feedback.classList.add("error");
            uploadButton.style.display = "none"; 
        }
    });

    function loadPlotHtml(sessionId) {
        
        plotContainer.innerHTML = ""; 
        
        
        const title = document.createElement("h2");
        title.innerHTML = '<i class="fas fa-chart-line"></i> Visualization';
        plotContainer.appendChild(title);
    
        
        const loadingIndicator = document.createElement("div");
        loadingIndicator.className = "loading-indicator";
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading visualization...';
        plotContainer.appendChild(loadingIndicator);
    
        
        const iframe = document.createElement("iframe");
        iframe.src = `/cblaster/${sessionId}/plot.html`;
        iframe.style.width = "100%";
        iframe.style.height = "900px";
        iframe.style.border = "none";
        iframe.style.borderRadius = "8px";
        
        
        iframe.onload = () => {
            loadingIndicator.remove();
        };
    
        plotContainer.appendChild(iframe);

        
        adjustContainerHeights();
    }

    
    uploadButton.addEventListener("click", () => {
        
        uploadButton.disabled = true;
        uploadButton.style.backgroundColor = "#cccccc";
        uploadButton.style.cursor = "not-allowed";
        uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running';
    
        const file = fileUpload.files[0];
        const title = fileTitle.value.trim() || file.name.split('.')[0] || "Untitled"; 
    
        if (!file) {
            alert("Please select a file.");
            uploadButton.disabled = false;
            uploadButton.style.backgroundColor = "#2c3e50";
            uploadButton.style.cursor = "pointer";
            uploadButton.innerHTML = 'RUN ANALYSIS';
            return;
        }
    
        const formData = new FormData();
        formData.append("title", title);
        formData.append("file", file);
    
        runningMessage.innerHTML = `<i class="fas fa-cog fa-spin"></i> Running cblaster search on "${file.name}"`;
        runningMessage.style.display = "block";
        resultMessage.style.display = "none";
        
        
        resultsScrollArea.innerHTML = "";
        
        const loadingMessage = document.createElement("div");
        loadingMessage.className = "loading-indicator";
        loadingMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing data, please wait...';
        resultsScrollArea.appendChild(loadingMessage);
    
        fetch("/upload", {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    sessionId = data.sessionId;
                    filePath = data.filePath;
    
                    fetch("/run-tool", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            sessionId,
                            filePath,
                            outputFile: "results.txt",
                        }),
                    })
                        .then((response) => response.json())
                        .then((runData) => {
                            if (runData.success) {
                                
                                runningMessage.style.display = "none";
                                resultMessage.innerHTML = `<i class="fas fa-check-circle"></i> Analysis completed successfully on "${file.name}"`;
                                resultMessage.style.color = "#4caf50";
                                resultMessage.style.display = "block";
    
                                fetch(`/cblaster/${sessionId}/results.txt`)
                                    .then((res) => {
                                        if (!res.ok) {
                                            throw new Error("File not found");
                                        }
                                        return res.text();
                                    })
                                    .then((text) => {
                                        parseResults(text);
                                        loadPlotHtml(sessionId);
    
                                        
                                        uploadButton.disabled = false;
                                        uploadButton.style.backgroundColor = "#e74c3c";
                                        uploadButton.style.cursor = "pointer";
                                        uploadButton.innerHTML = '<i class="fas fa-redo"></i> Reset';
                                        
                                        
                                        uploadButton.onclick = () => {
                                            location.reload();
                                        };
                                    })
                                    .catch((err) => {
                                        
                                        runningMessage.style.display = "none";
                                        resultMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Failed to fetch results for "${file.name}"`;
                                        resultMessage.style.color = "#e74c3c";
                                        resultMessage.style.display = "block";
                                        resetToDefault();
                                    });
                            } else {
                                
                                runningMessage.style.display = "none";
                                resultMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Failed to run cblaster on "${file.name}"`;
                                resultMessage.style.color = "#e74c3c";
                                resultMessage.style.display = "block";
                                resetToDefault();
                            }
                        })
                        .catch(() => {
                            
                            runningMessage.style.display = "none";
                            resultMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Failed to run cblaster on "${file.name}"`;
                            resultMessage.style.color = "#e74c3c";
                            resultMessage.style.display = "block";
                            resetToDefault();
                        });
                } else {
                    
                    runningMessage.style.display = "none";
                    feedback.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Failed to upload file "${file.name}"`;
                    feedback.classList.remove("success");
                    feedback.classList.add("error");
                    resultMessage.style.display = "none";
                    resetToDefault();
                }
            })
            .catch(() => {
                
                runningMessage.style.display = "none";
                feedback.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error uploading file "${file.name}"`;
                feedback.classList.remove("success");
                feedback.classList.add("error");
                resultMessage.style.display = "none";
                resetToDefault();
            });
    });
    
    
    function resetToDefault() {
        
        uploadButton.disabled = false;
        uploadButton.style.backgroundColor = "#2c3e50";
        uploadButton.style.cursor = "pointer";
        uploadButton.innerHTML = 'RUN ANALYSIS';
        
        
        resultsScrollArea.innerHTML = "";
        resultsScrollArea.appendChild(
            createPlaceholder(
                "fas fa-database", 
                "No Results Yet", 
                "Upload a .gbk file and run the analysis to see results here"
            )
        );
        
        
        adjustContainerHeights();
    }
});