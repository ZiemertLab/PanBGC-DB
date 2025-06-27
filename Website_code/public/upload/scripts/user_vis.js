document.addEventListener("DOMContentLoaded", () => {
    const fileUpload = document.getElementById("data-file-upload");
    const uploadButton = document.getElementById("data-upload-button");
    const feedback = document.getElementById("data-upload-feedback");
    const fileUploadInfo = document.querySelector(".file-upload-info");

    
    fileUpload.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileUploadInfo.textContent = "Drop file here";
        fileUploadInfo.style.color = "#1abc9c";
        document.querySelector(".file-upload-wrapper").style.borderColor = "#1abc9c";
    });

    fileUpload.addEventListener("dragleave", (e) => {
        e.preventDefault();
        fileUploadInfo.textContent = "Supports .json format only";
        fileUploadInfo.style.color = "#95a5a6";
        document.querySelector(".file-upload-wrapper").style.borderColor = "#dde1e7";
    });

    fileUpload.addEventListener("drop", () => {
        fileUploadInfo.textContent = "File selected";
        fileUploadInfo.style.color = "#4caf50";
    });

    
    fileUpload.addEventListener("change", () => {
        const file = fileUpload.files[0];

        if (file) {
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();

            if (fileExtension === "json") {
                feedback.innerHTML = `<i class="fas fa-check-circle"></i> File "${fileName}" is ready to upload.`;
                feedback.classList.remove("error");
                feedback.classList.add("success");
                uploadButton.innerHTML = '<i class="fas fa-upload"></i> UPLOAD';
                uploadButton.style.display = "block";
                
                
                fileUploadInfo.textContent = fileName;
                fileUploadInfo.style.color = "#4caf50";
            } else {
                feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> Invalid file type. Please upload a JSON file.`;
                feedback.classList.remove("success");
                feedback.classList.add("error");
                uploadButton.style.display = "none";
                fileUpload.value = "";
            }
        } else {
            feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> Please select a file.`;
            feedback.classList.add("error");
            uploadButton.style.display = "none";
        }
    });

    
    uploadButton.addEventListener("click", () => {
        const file = fileUpload.files[0];

        if (!file) {
            feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> Please select a file.`;
            feedback.classList.add("error");
            return;
        }

        
        uploadButton.disabled = true;
        uploadButton.style.backgroundColor = "#95a5a6";
        uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> UPLOADING';

        const formData = new FormData();
        formData.append("file", file);

        feedback.innerHTML = `<i class="fas fa-sync fa-spin"></i> Uploading file... This may take a moment if your file contains nexus data.`;
        feedback.classList.remove("error");
        feedback.classList.remove("success");

        fetch("/upload-to-data", {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    feedback.innerHTML = `<i class="fas fa-check-circle"></i> File uploaded successfully! Session ID: ${data.sessionId}`;
                    feedback.classList.remove("error");
                    feedback.classList.add("success");

                    
                    uploadButton.disabled = false;
                    uploadButton.innerHTML = '<i class="fas fa-external-link-alt"></i> VIEW';
                    uploadButton.style.backgroundColor = "#27ae60";
                    uploadButton.style.display = "block";
                    uploadButton.onclick = () => {
                        const newTabUrl = `/${data.sessionId}.html`;
                        window.open(newTabUrl, "_blank");
                    };
                } else {
                    feedback.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Upload failed: ${data.message}`;
                    feedback.classList.add("error");
                    feedback.classList.remove("success");
                    
                    
                    uploadButton.disabled = false;
                    uploadButton.innerHTML = '<i class="fas fa-upload"></i> UPLOAD';
                    uploadButton.style.backgroundColor = "#2c3e50";
                }
            })
            .catch((error) => {
                feedback.innerHTML = `<i class="fas fa-exclamation-triangle"></i> An error occurred during upload.`;
                feedback.classList.add("error");
                feedback.classList.remove("success");
                console.error("Upload error:", error);
                
                
                uploadButton.disabled = false;
                uploadButton.innerHTML = '<i class="fas fa-upload"></i> UPLOAD';
                uploadButton.style.backgroundColor = "#2c3e50";
            });
    });
});