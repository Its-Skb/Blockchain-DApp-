const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const DatasetSharing = await ethers.getContractFactory("DatasetSharing");
  const datasetSharing = await DatasetSharing.deploy();
  await datasetSharing.waitForDeployment();

  const address = datasetSharing.target;
  console.log(`✅ DatasetSharing contract deployed to: ${address}`);

  // Save contract address and ABI
  const contractData = {
    address: address,
    abi: JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../artifacts/contracts/DatasetSharing.sol/DatasetSharing.json"),
        "utf8"
      )
    ).abi,
  };

  // Create frontend folder if not exists
  const frontendDir = path.join(__dirname, "../frontend/src");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendDir, "contract-config.json"),
    JSON.stringify(contractData, null, 2)
  );

  console.log("✅ Contract config saved to frontend/src/contract-config.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
