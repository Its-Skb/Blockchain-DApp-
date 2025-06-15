let contractABI, contractAddress, contract, web3;

async function loadContractConfig() {
  const res = await fetch("src/contract-config.json");
  const config = await res.json();
  contractABI = config.abi;
  contractAddress = config.address;
}

async function connectWallet() {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    web3 = new Web3(window.ethereum);
    contract = new web3.eth.Contract(contractABI, contractAddress);
    document.getElementById("status").innerText = `✅ Connected: ${accounts[0]}`;
    try {
      const allDatasets = await contract.methods.getAllDatasets().call();
      console.log("✅ Available datasets:", allDatasets);
    } catch (error) {
      console.error("❌ Failed to fetch datasets:", error);
    }
  } else {
    alert("🦊 Please install MetaMask to use this feature.");
  }
}

async function loadActivityLog() {
  if (!contract) {
    alert("Contract not loaded.");
    return;
  }

  try {
    const events = await contract.getPastEvents("DatasetActivity", {
      fromBlock: 0,
      toBlock: "latest",
    });

    const tbody = document.querySelector("#activityTable tbody");
    tbody.innerHTML = "";

    events.forEach((event) => {
      const { datasetId, action, user, timestamp } = event.returnValues;
      const date = new Date(Number(timestamp) * 1000).toLocaleString();

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${datasetId}</td>
        <td>${action}</td>
        <td>${user}</td>
        <td>${date}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Error fetching activity:", err);
    alert("Failed to load activity log.");
  }
}

async function loadHistory() {
  const datasetId = parseInt(document.getElementById("historyDatasetId").value);
  if (isNaN(datasetId)) {
    alert("Please enter a valid dataset ID.");
    return;
  }

  try {
    const history = await contract.methods.getDatasetActivityHistory(datasetId).call();
    console.log("✅ Activity History for Dataset ID", datasetId, ":", history);
    const tbody = document.querySelector("#historyTable tbody");
    tbody.innerHTML = "";

    history.forEach((activity) => {
      const date = new Date(Number(activity.timestamp) * 1000).toLocaleString();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${activity.user}</td>
        <td>${activity.action}</td>
        <td>${date}</td>
      `;
    tbody.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Error loading history:", err);
    alert("Error fetching activity. Ensure Dataset ID exists.");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadContractConfig();
  await connectWallet();
  await loadActivityLog();
  const loadButton = document.getElementById("loadHistory");
  if (loadButton) {
    loadButton.addEventListener("click", loadHistory);
  }
});
