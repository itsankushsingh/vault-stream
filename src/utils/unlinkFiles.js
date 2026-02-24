// @ts-check
import fs from "fs";

/**
 * Delete multiple local files
 * @param {string[]} localFilePath - Array of file paths
 */
const unlinkFiles = function (localFilePath) {
    localFilePath.forEach((path) => {
        fs.unlinkSync(path);
    });
};


export { unlinkFiles };