/**
 * Delete multiple local files
 * @param {string[]} localFilePath - array of file paths
 */


import fs from "fs"

const unlinkFiles = function (localFilePath) {
    localFilePath.forEach((path) => {
        fs.unlinkSync(path)
    })
}


export {
    unlinkFiles
}