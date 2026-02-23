import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null,"./public/temp")
    },
    filename: function (req, file, cb) {
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random * 1E9)
        // cb(null,file.filename +'-'+uniqueSuffix)
        cb(null,file.originalname)
    }
})

const upload = multer({
    // storage:storage // Can Also Used Like tHI
    storage,
})

export {upload}