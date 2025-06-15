// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DatasetSharing {
    struct Dataset {
        string link;
        string action;
        address user;
        uint256 timestamp;
        uint256 originalDatasetId; // Reference to original dataset (0 if this is original)
        bool isModified; // Flag to indicate if this is a modified version
    }

    struct Activity {
        address user;
        string action;
        uint256 timestamp;
    }

    Dataset[] public datasets;
    mapping(uint256 => Activity[]) private activityHistory;
    mapping(uint256 => uint256[]) private datasetVersions; // Track all versions of a dataset

    event DatasetActivity(
        uint256 indexed datasetId,
        string action,
        address indexed user,
        uint256 timestamp
    );

    event DatasetModified(
        uint256 indexed originalDatasetId,
        uint256 indexed newDatasetId,
        string newLink,
        address indexed user,
        uint256 timestamp
    );

    event NewDatasetVersion(
        uint256 indexed rootOriginalId,
        uint256 indexed newVersionId,
        string ipfsHash,
        address indexed creator,
        uint256 timestamp
    );

    // Register/upload a new dataset
    function registerDataset(string memory datasetLink) public {
        uint256 datasetId = datasets.length;

        datasets.push(Dataset({
            link: datasetLink,
            action: "Uploaded",
            user: msg.sender,
            timestamp: block.timestamp,
            originalDatasetId: 0, // This is an original dataset
            isModified: false
        }));

        activityHistory[datasetId].push(Activity({
            user: msg.sender,
            action: "Uploaded",
            timestamp: block.timestamp
        }));

        // Initialize version tracking
        datasetVersions[datasetId].push(datasetId);

        emit DatasetActivity(datasetId, "Uploaded", msg.sender, block.timestamp);
    }

    // Update dataset action (for downloads, views, etc.)
    function updateDatasetAction(uint256 datasetId, string memory action) public {
        require(datasetId < datasets.length, "Invalid dataset ID");

        // Update history
        activityHistory[datasetId].push(Activity({
            user: msg.sender,
            action: action,
            timestamp: block.timestamp
        }));

        emit DatasetActivity(datasetId, action, msg.sender, block.timestamp);
    }

    // Create a modified version of an existing dataset (creates new entry)
    function createModifiedDataset(uint256 originalDatasetId, string memory newLink) public {
        require(originalDatasetId < datasets.length, "Invalid dataset ID");
        
        uint256 newDatasetId = datasets.length;
        
        // Determine the root original dataset ID
        uint256 rootOriginalId = datasets[originalDatasetId].originalDatasetId == 0 
            ? originalDatasetId 
            : datasets[originalDatasetId].originalDatasetId;
        
        // Create new dataset entry as a modified version
        datasets.push(Dataset({
            link: newLink,
            action: "Modified",
            user: msg.sender,
            timestamp: block.timestamp,
            originalDatasetId: rootOriginalId,
            isModified: true
        }));

        // Add to activity history for the new dataset
        activityHistory[newDatasetId].push(Activity({
            user: msg.sender,
            action: "Modified",
            timestamp: block.timestamp
        }));

        // Update version tracking
        datasetVersions[rootOriginalId].push(newDatasetId);

        emit DatasetActivity(newDatasetId, "Modified", msg.sender, block.timestamp);
        emit DatasetModified(rootOriginalId, newDatasetId, newLink, msg.sender, block.timestamp);
        emit NewDatasetVersion(rootOriginalId, newDatasetId, newLink, msg.sender, block.timestamp);
    }

    // Get all datasets
    function getAllDatasets() public view returns (Dataset[] memory) {
        return datasets;
    }

    // Get activity history for a specific dataset
    function getDatasetActivityHistory(uint256 datasetId) public view returns (Activity[] memory) {
        require(datasetId < datasets.length, "Invalid dataset ID");
        return activityHistory[datasetId];
    }

    // Get all versions of a dataset (including original and all modifications)
    function getDatasetVersions(uint256 originalDatasetId) public view returns (uint256[] memory) {
        require(originalDatasetId < datasets.length, "Invalid dataset ID");
        
        // If this is already a modified version, get versions of the original
        uint256 rootOriginalId = datasets[originalDatasetId].originalDatasetId == 0 
            ? originalDatasetId 
            : datasets[originalDatasetId].originalDatasetId;
            
        return datasetVersions[rootOriginalId];
    }

    // Get dataset count
    function getDatasetCount() public view returns (uint256) {
        return datasets.length;
    }

    // Get a specific dataset by ID
    function getDataset(uint256 datasetId) public view returns (Dataset memory) {
        require(datasetId < datasets.length, "Invalid dataset ID");
        return datasets[datasetId];
    }

    // Check if a dataset exists
    function datasetExists(uint256 datasetId) public view returns (bool) {
        return datasetId < datasets.length;
    }

    // Get original dataset ID for any dataset
    function getOriginalDatasetId(uint256 datasetId) public view returns (uint256) {
        require(datasetId < datasets.length, "Invalid dataset ID");
        return datasets[datasetId].originalDatasetId == 0 ? datasetId : datasets[datasetId].originalDatasetId;
    }

    // Check if a dataset is a modified version
    function isDatasetModified(uint256 datasetId) public view returns (bool) {
        require(datasetId < datasets.length, "Invalid dataset ID");
        return datasets[datasetId].isModified;
    }
}
