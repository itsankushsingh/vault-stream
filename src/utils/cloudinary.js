import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import { unlinkFiles } from "./unlinkFiles.js"


// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET //API Key
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        // File has been uploaded successfully
        // fs.unlinkSync(localFilePath)
        unlinkFiles([localFilePath])
        // console.log("File is Uploaded on clodinary", response);
        return response
        
    } catch (error) {
        unlinkFiles([localFilePath])
        // fs.unlinkSync(localFilePath) // Remove the locally saved temp file as operation failed
    }
}

export { uploadOnCloudinary }

