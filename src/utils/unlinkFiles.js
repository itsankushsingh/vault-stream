import fs from "fs"


const unlinkFiles = function (localFilePath) {
    localFilePath.forEach((path) => {
        fs.unlinkSync(path)
    })
}

export {
    unlinkFiles
}