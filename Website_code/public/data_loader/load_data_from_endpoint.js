 




class JSONLoader {
    constructor(loaderElementId, progressBarElementId) {
        this.loader = document.getElementById(loaderElementId);
        this.progressBar = document.getElementById(progressBarElementId);
    }

    showLoader() {
        this.loader.style.display = 'block';
    }

    hideLoader() {
        this.loader.style.display = 'none';
    }

    updateProgress(percent) {
        this.progressBar.style.width = percent + '%';
    }

    async fetchJSON(url) {
        this.showLoader();
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const contentLength = +response.headers.get('Content-Length');
            let receivedLength = 0;
            const chunks = [];

            while(true) {
                const {done, value} = await reader.read();
                if (done) break;
                chunks.push(value);
                receivedLength += value.length;
                this.updateProgress((receivedLength / contentLength) * 100);
            }

            const chunksAll = new Uint8Array(receivedLength);
            let position = 0;
            for(let chunk of chunks) {
                chunksAll.set(chunk, position);
                position += chunk.length;
            }

            const result = new TextDecoder("utf-8").decode(chunksAll);
            const data = JSON.parse(result);

            this.hideLoader();
            return data;
        } catch (error) {
            this.hideLoader();
            console.error('Error fetching JSON:', error);
            throw error;
        }
    }

    async loadAndDisplay(url, processData) {
        try {
            const data = await this.fetchJSON(url);
            this.content.innerHTML = processData(data);
        } catch (error) {
            this.progressBar = `Error loading data: ${error.message}`;
        }
    }
}