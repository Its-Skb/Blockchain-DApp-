let web3, contract;
let contractABI, contractAddress;

async function loadContractConfig() {
  try {
    const res = await fetch("src/contract-config.json");
    if (!res.ok) throw new Error("Failed to load contract config");
    const config = await res.json();
    contractABI = config.abi;
    contractAddress = config.address;
    console.log("✅ Loaded contract config:", contractAddress);
  } catch (err) {
    console.error(err);
    alert("Could not load contract configuration.");
  }
}

async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      web3 = new Web3(window.ethereum);
      const networkId = await web3.eth.net.getId();
      contract = new web3.eth.Contract(contractABI, contractAddress);
      document.getElementById("status").innerText = `✅ Connected to wallet: ${accounts[0]}`;
    } catch (error) {
      console.error("User denied account access", error);
    }
  } else {
    alert("🦊 Please install MetaMask to use this DApp!");
  }
}

async function registerDataset() {
  if (!contract) return alert("⚠️ Contract not connected yet.");
  const datasetLink = document.getElementById("datasetLinkInput").value;
  if (!datasetLink) return alert("Please enter a dataset IPFS link.");
  const accounts = await web3.eth.getAccounts();
  try {
    await contract.methods.registerDataset(datasetLink).send({ from: accounts[0] });
    document.getElementById("datasetLinkInput").value = "";
    alert("✅ Dataset registered successfully!");
    await loadSharedDatasets();
  } catch (error) {
    console.error("❌ Error registering dataset:", error);
    alert(`❌ Error: ${error.message || "Something went wrong"}`);
  }
}

async function loadSharedDatasets() {
  if (!contract) return alert("⚠️ Contract not connected yet.");
  try {
    const datasets = await contract.methods.getAllDatasets().call();
    const tableBody = document.getElementById("datasetTable").querySelector("tbody");
    tableBody.innerHTML = "";

    for (let index = 0; index < datasets.length; index++) {
      const ds = datasets[index];
      const timestamp = Number(ds.timestamp);
      const date = new Date(timestamp * 1000).toLocaleString();
      const ipfsURL = `https://gateway.pinata.cloud/ipfs/${ds.link}`;
      const history = await contract.methods.getDatasetActivityHistory(index).call();
      const downloadCount = history.filter(entry => entry.action === "Downloaded").length;

      let datasetType = ds.action;
      let originalRef = "";
      
      if (ds.isModified && ds.originalDatasetId !== "0") {
        datasetType = `Modified (v${index})`;
        originalRef = `(Original: #${ds.originalDatasetId})`;
      }

      const row = document.createElement("tr");
      if (ds.isModified) {
        row.style.backgroundColor = "#f8f9fa";
        row.style.borderLeft = "4px solid #007bff";
      }
      
      row.innerHTML = `
        <td>${index}</td>
        <td><a href="${ipfsURL}" target="_blank">${ds.link}</a></td>
        <td>${datasetType} ${originalRef}</td>
        <td>${ds.user}</td>
        <td>${date}</td>
        <td>${downloadCount}</td>
      `;

      const actionCell = document.createElement("td");

      const downloadBtn = document.createElement("button");
      downloadBtn.textContent = "Download";
      downloadBtn.onclick = () => downloadDataset(index, ds.link);

      const viewModifyBtn = document.createElement("button");
      viewModifyBtn.textContent = "View & Modify";
      viewModifyBtn.style.marginLeft = "8px";
      viewModifyBtn.style.backgroundColor = "#28a745";
      viewModifyBtn.style.color = "white";
      viewModifyBtn.style.border = "none";
      viewModifyBtn.style.padding = "5px 10px";
      viewModifyBtn.style.borderRadius = "4px";
      viewModifyBtn.style.cursor = "pointer";

      if (!ds.isModified) {
        const versionsBtn = document.createElement("button");
        versionsBtn.textContent = "View Versions";
        versionsBtn.style.marginLeft = "8px";
        versionsBtn.style.backgroundColor = "#6c757d";
        versionsBtn.style.color = "white";
        versionsBtn.style.border = "none";
        versionsBtn.style.padding = "5px 10px";
        versionsBtn.style.borderRadius = "4px";
        versionsBtn.style.cursor = "pointer";
        versionsBtn.onclick = () => showDatasetVersions(index);
        // actionCell.appendChild(versionsBtn);
      }

      viewModifyBtn.onclick = async () => {
        await openDatasetEditor(index, ds.link);
      };

      actionCell.appendChild(downloadBtn);
      actionCell.appendChild(viewModifyBtn);

      row.appendChild(actionCell);
      tableBody.appendChild(row);
    }

    document.getElementById("datasetTableContainer").style.display = "block";
  } catch (error) {
    console.error("❌ Error loading datasets:", error);
    alert("Failed to load shared datasets.");
  }
}

async function openDatasetEditor(datasetId, ipfsHash) {
  const ipfsURL = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  
  try {
    console.log("📄 Loading dataset from:", ipfsURL);
    
    const response = await fetch(ipfsURL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log("📄 Blob size:", blob.size, "bytes, type:", blob.type);
    
    const isZipFile = blob.type === 'application/zip' || 
                     blob.type === 'application/x-zip-compressed' || 
                     ipfsHash.toLowerCase().includes('.zip') ||
                     blob.type === 'application/octet-stream';
    
    if (isZipFile) {
      await handleZipFile(blob, datasetId, ipfsHash);
    } else {
      await handleTextFile(blob, datasetId, ipfsHash);
    }
    
  } catch (err) {
    console.error("❌ Detailed error loading dataset:", err);
    alert(`❌ Failed to load dataset from IPFS: ${err.message}`);
  }
}

async function handleZipFile(blob, datasetId, ipfsHash) {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(blob);
    let zipFilesHtml = '<div class="zip-contents">';
    zipFilesHtml += '<h3>ZIP Contents:</h3>';
    zipFilesHtml += '<p><em>You can edit the text files below and save as a new modified version</em></p>';
    const fileContents = {};
    for (const [filename, fileObj] of Object.entries(zipContent.files)) {
      if (!fileObj.dir) {
        try {
          const isTextFile = filename.match(/\.(txt|csv|json|xml|html|css|js|py|java|cpp|c|h|md|yml|yaml|sql|log)$/i);
          if (isTextFile || filename.includes('.')) {
            const fileContent = await fileObj.async('text');
            fileContents[filename] = fileContent;
            zipFilesHtml += `
              <div class="zip-file-item" style="margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
                <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold;">${filename}</h4>
                <textarea class="file-content" data-filename="${filename}" 
                         style="width: 100%; height: 200px; font-family: 'Courier New', monospace; border: 1px solid #ccc; border-radius: 4px; padding: 10px; resize: vertical;">${fileContent}</textarea>
              </div>
            `;
          } else {
            zipFilesHtml += `
              <div class="zip-file-item" style="margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fff3cd;">
                <h4 style="margin: 0 0 10px 0; color: #856404; font-size: 16px; font-weight: bold;">${filename}</h4>
                <p style="margin: 0; color: #856404;"><em>Binary file (${blob.size} bytes) - Cannot edit as text</em></p>
              </div>
            `;
          }
        } catch (err) {
          console.warn(`Could not read ${filename} as text:`, err);
          zipFilesHtml += `
            <div class="zip-file-item" style="margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fff3cd;">
              <h4 style="margin: 0 0 10px 0; color: #856404; font-size: 16px; font-weight: bold;">${filename}</h4>
              <p style="margin: 0; color: #856404;"><em>Could not read as text - Binary file</em></p>
            </div>
          `;
        }
      }
    }
    zipFilesHtml += '</div>';
    document.getElementById("datasetEditorModal").style.display = "block";
    document.getElementById("datasetEditorId").innerText = datasetId;
    const editorContent = document.getElementById("datasetEditorContent");
    editorContent.style.display = 'none';
    let htmlContainer = document.getElementById("htmlEditorContainer");
    if (!htmlContainer) {
      htmlContainer = document.createElement("div");
      htmlContainer.id = "htmlEditorContainer";
      editorContent.parentNode.insertBefore(htmlContainer, editorContent.nextSibling);
    }
    htmlContainer.innerHTML = zipFilesHtml;
    htmlContainer.style.display = 'block';
    document.getElementById("originalIpfsHash").value = ipfsHash;
    window.currentZipContents = fileContents;
    window.isZipFile = true;
    console.log("✅ ZIP file loaded successfully");
  } catch (err) {
    console.error("❌ Error handling ZIP file:", err);
    throw new Error(`Failed to process ZIP file: ${err.message}`);
  }
}

async function handleTextFile(blob, datasetId, ipfsHash) {
  try {
    const content = await blob.text();
    document.getElementById("datasetEditorModal").style.display = "block";
    document.getElementById("datasetEditorId").innerText = datasetId;
    const editorContent = document.getElementById("datasetEditorContent");
    const htmlContainer = document.getElementById("htmlEditorContainer");
    if (htmlContainer) {
      htmlContainer.style.display = 'none';
    }
    editorContent.style.display = 'block';
    editorContent.value = content;
    document.getElementById("originalIpfsHash").value = ipfsHash;
    window.currentZipContents = null;
    window.isZipFile = false;
    console.log("✅ Text file loaded successfully");
  } catch (err) {
    console.error("❌ Error handling text file:", err);
    throw new Error(`Failed to process text file: ${err.message}`);
  }
}

async function showDatasetVersions(originalDatasetId) {
  try {
    const versions = await contract.methods.getDatasetVersions(originalDatasetId).call();
    let versionInfo = `Dataset #${originalDatasetId} Versions:\n\n`;
    for (let i = 0; i < versions.length; i++) {
      const versionId = versions[i];
      const dataset = await contract.methods.getDataset(versionId).call();
      const date = new Date(dataset.timestamp * 1000).toLocaleString();
      if (i === 0) {
        versionInfo += `📄 Original Version (ID: ${versionId})\n`;
      } else {
        versionInfo += `📝 Modified Version ${i} (ID: ${versionId})\n`;
      }
      versionInfo += `   User: ${dataset.user}\n`;
      versionInfo += `   Date: ${date}\n`;
      versionInfo += `   IPFS: ${dataset.link}\n\n`;
    }
    alert(versionInfo);
  } catch (error) {
    console.error("Error loading versions:", error);
    alert("Failed to load dataset versions.");
  }
}

function downloadDataset(datasetId, ipfsHash) {
  const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.download = "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  contract.methods.updateDatasetAction(datasetId, "Downloaded").send({ from: ethereum.selectedAddress })
    .then(() => console.log(`📥 Dataset ${datasetId} marked as downloaded.`))
    .catch(err => console.error("❌ Error recording download action:", err));
}

async function loadHistory() {
  if (!contract) return alert("⚠️ Contract not connected yet.");
  const datasetId = document.getElementById('historyDatasetId').value;
  if (!datasetId) return alert("Please enter a dataset ID to load history.");

  try {
    const actions = await contract.methods.getDatasetActivityHistory(datasetId).call();
    const tableBody = document.getElementById('historyTable').querySelector('tbody');
    tableBody.innerHTML = "";

    actions.forEach(action => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${action.user}</td><td>${action.action}</td><td>${new Date(action.timestamp * 1000).toLocaleString()}</td>`;
      tableBody.appendChild(row);
    });

    const summaryDiv = document.getElementById("downloadSummary");
    if (summaryDiv) {
      const downloadCounts = {};
      actions.forEach(action => {
        if (action.action === "Downloaded") {
          downloadCounts[action.user] = (downloadCounts[action.user] || 0) + 1;
        }
      });

      summaryDiv.innerHTML = "<h4>Download Summary:</h4>";
      if (Object.keys(downloadCounts).length === 0) {
        summaryDiv.innerHTML += "<p>No downloads yet for this dataset.</p>";
      } else {
        Object.entries(downloadCounts).forEach(([user, count]) => {
          summaryDiv.innerHTML += `<p>User: ${user} → ${count} time(s)</p>`;
        });
      }
    }
  } catch (error) {
    console.error("❌ Detailed loadHistory error:", error);
    alert("❌ Error loading history:" + (error.message || "Unknown error"));
  }
}

// Improved IPFS upload function with better error handling
async function uploadToIPFS(fileBlob, filename) {
  try {
    console.log("📤 Starting IPFS upload...");
    console.log("File size:", fileBlob.size, "bytes");
    console.log("File type:", fileBlob.type);
    
    const formData = new FormData();
    formData.append("file", fileBlob, filename);
    
    // Add metadata for better organization
    const metadata = JSON.stringify({
      name: filename,
      timestamp: new Date().toISOString(),
      originalSize: fileBlob.size
    });
    formData.append("pinataMetadata", metadata);
    
    // Only provide cidVersion (no customPinPolicy)
    const options = JSON.stringify({
      cidVersion: 0
    });
    formData.append("pinataOptions", options);
    
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlOGZiY2VlYS1mOWFhLTRhOWMtYmIwNS0yZDQ3OTQzODI5MjkiLCJlbWFpbCI6InNrYi4yMWhmQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI3YmY2Mzc0Zjk5Zjg1NTkwM2ViNSIsInNjb3BlZEtleVNlY3JldCI6IjZmYWQ4MTQ3NGYzMjNiYjMyZmFmMGE3NGY4YzgwNDI1NzQ0NWIyY2Q5YTJhYWUzNmRhY2IwYmVkMzRkZDU4MDUiLCJleHAiOjE3Nzk5NjczNjd9.hXP7Dy_iXE-tjY-akpTJt0n6DI0MvXwdg9wfiAEM2Wk"
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}${errorText ? ' - ' + errorText : ''}`);
    }
    
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error("Invalid JSON response from IPFS service");
    }
    
    if (!result.IpfsHash) {
      throw new Error("No IPFS hash returned from upload service");
    }
    
    console.log("✅ IPFS upload successful:", result.IpfsHash);
    return result.IpfsHash;
    
  } catch (error) {
    console.error("❌ IPFS upload error:", error);
    throw error;
  }
}

// Add CSS styles for better ZIP file display
function addZipStyles() {
  const zipStyles = `
    <style id="zip-editor-styles">
    .zip-contents {
      max-height: 600px;
      overflow-y: auto;
      padding: 10px;
    }
    .zip-file-item {
      transition: box-shadow 0.2s ease;
    }
    .zip-file-item:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .file-content:focus {
      outline: 2px solid #007bff;
      border-color: #007bff;
    }
    #datasetEditorModal {
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
    }
    .modal-content {
      background-color: #fefefe;
      margin: 5% auto;
      padding: 20px;
      border: none;
      border-radius: 8px;
      width: 90%;
      max-width: 1000px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
    }
    .modal-footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      text-align: right;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-left: 8px;
      font-size: 14px;
    }
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    .btn-success {
      background-color: #28a745;
      color: white;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .modified-dataset {
      background-color: #f8f9fa !important;
      border-left: 4px solid #007bff !important;
    }
    .version-badge {
      background-color: #007bff;
      color: white;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 11px;
      margin-left: 5px;
    }
    </style>
  `;
  const existingStyles = document.getElementById('zip-editor-styles');
  if (existingStyles) {
    existingStyles.remove();
  }
  document.head.insertAdjacentHTML('beforeend', zipStyles);
}

// Validate JSON before uploading (for text datasets)
function validateJSON(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  addZipStyles();
  await loadContractConfig();

  const connectWalletBtn = document.getElementById("connectWallet");
  if (connectWalletBtn) {
    connectWalletBtn.disabled = false;
    connectWalletBtn.addEventListener("click", connectWallet);
  }

  if (window.ethereum && window.ethereum.selectedAddress) {
    await connectWallet();
  }

  const registerButton = document.getElementById("registerButton");
  if (registerButton) registerButton.addEventListener("click", registerDataset);

  const loadDatasetsBtn = document.getElementById("loadDatasets");
  if (loadDatasetsBtn) loadDatasetsBtn.addEventListener("click", loadSharedDatasets);

  const historyButton = document.getElementById("loadHistory");
  if (historyButton) loadHistoryButton.addEventListener("click", loadHistory);

  const viewActivityButton = document.getElementById("viewActivity");
  if (viewActivityButton) {
    viewActivityButton.addEventListener("click", () => window.location.href = "activity.html");
  }

  const closeEditorBtn = document.getElementById("closeEditor");
  if (closeEditorBtn) {
    closeEditorBtn.addEventListener("click", () => {
      document.getElementById("datasetEditorModal").style.display = "none";
      window.currentZipContents = null;
      window.isZipFile = false;
      const editorContent = document.getElementById("datasetEditorContent");
      const htmlContainer = document.getElementById("htmlEditorContainer");
      if (htmlContainer) {
        htmlContainer.style.display = 'none';
      }
      if (editorContent) {
        editorContent.style.display = 'block';
      }
    });
  }

  // Updated save function to create new dataset version instead of modifying existing
  const saveEditedDatasetBtn = document.getElementById("saveEditedDataset");
  if (saveEditedDatasetBtn) {
    saveEditedDatasetBtn.addEventListener("click", async () => {
      const originalDatasetId = parseInt(document.getElementById("datasetEditorId").innerText);
      const confirmation = confirm("This will create a new modified version of the dataset. The original will be preserved. Continue?");
      if (!confirmation) return;
      saveEditedDatasetBtn.disabled = true;
      saveEditedDatasetBtn.textContent = "Saving...";
      try {
        let fileToUpload;
        let filename = "modified_dataset.txt";
        if (window.isZipFile && window.currentZipContents) {
          console.log("📦 Processing ZIP file modifications...");
          const zip = new JSZip();
          const fileTextareas = document.querySelectorAll('.file-content');
          if (fileTextareas.length === 0) {
            throw new Error("No editable files found in ZIP");
          }
          fileTextareas.forEach(textarea => {
            const filenameAttr = textarea.getAttribute('data-filename');
            const content = textarea.value;
            if (filenameAttr && content !== undefined) {
              // If the file is .json, validate JSON
              if (filenameAttr.endsWith('.json') && !validateJSON(content)) {
                throw new Error(`Invalid JSON in file: ${filenameAttr}`);
              }
              zip.file(filenameAttr, content);
              console.log("Added file to ZIP:", filenameAttr);
            }
          });
          fileToUpload = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
          });
          filename = "modified_dataset.zip";
          console.log("✅ Created new ZIP file, size:", fileToUpload.size, "bytes");
        } else {
          const editorContent = document.getElementById("datasetEditorContent");
          if (editorContent && editorContent.tagName === 'TEXTAREA') {
            const newContent = editorContent.value;
            if (!newContent.trim()) {
              throw new Error("Content cannot be empty");
            }
            // Validate JSON if file is .json or looks like JSON
            if (validateJSON(newContent) || newContent.trim().startsWith('{')) {
              if (!validateJSON(newContent)) {
                throw new Error("Invalid JSON format in text file");
              }
            }
            fileToUpload = new Blob([newContent], { type: "text/plain" });
            filename = "modified_dataset.txt";
            console.log("✅ Created text file for upload, size:", fileToUpload.size, "bytes");
          } else {
            throw new Error("Unable to save - invalid content format");
          }
        }
        const newHash = await uploadToIPFS(fileToUpload, filename);
        console.log("📝 Creating new dataset entry on blockchain...");
        const accounts = await web3.eth.getAccounts();
        if (!accounts || accounts.length === 0) {
          throw new Error("No wallet account found. Please connect your wallet.");
        }
        const tx = await contract.methods.createModifiedDataset(originalDatasetId, newHash).send({ 
          from: accounts[0],
          gas: 500000
        });
        console.log("✅ Blockchain transaction successful:", tx.transactionHash);
        alert("✅ New modified version created successfully! Original dataset preserved.");
        document.getElementById("datasetEditorModal").style.display = "none";
        window.currentZipContents = null;
        window.isZipFile = false;
        const editorContent = document.getElementById("datasetEditorContent");
        const htmlContainer = document.getElementById("htmlEditorContainer");
        if (htmlContainer) {
          htmlContainer.style.display = 'none';
        }
        if (editorContent) {
          editorContent.style.display = 'block';
        }
        await loadSharedDatasets();
      } catch (err) {
        console.error("❌ Save error:", err);
        alert("❌ Failed to create modified dataset: " + (err.message || "Unknown error"));
      } finally {
        saveEditedDatasetBtn.disabled = false;
        saveEditedDatasetBtn.textContent = "Save Modified Version";
      }
    });
  }
});
