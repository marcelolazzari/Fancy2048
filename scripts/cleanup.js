const fs = require('fs');
const path = require('path');

// Function to get all files in a directory recursively
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

// Function to find duplicate files
function findDuplicateFiles(files) {
    const fileContents = {};
    const duplicates = [];

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (fileContents[content]) {
            duplicates.push(file);
        } else {
            fileContents[content] = file;
        }
    });

    return duplicates;
}

// Function to remove files
function removeFiles(files) {
    files.forEach(file => {
        fs.unlinkSync(file);
        console.log(`Removed: ${file}`);
    });
}

// Main function to clean up the project
function cleanupProject() {
    const projectDir = path.resolve(__dirname, '..');
    const allFiles = getAllFiles(projectDir);

    // Find and remove duplicate files
    const duplicateFiles = findDuplicateFiles(allFiles);
    removeFiles(duplicateFiles);

    // Additional logic to find and remove unused files can be added here
}

cleanupProject();
