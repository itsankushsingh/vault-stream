import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiRresponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend 
    // validation - not empty fields
    // check if user already exist: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response if user created , else error

    // Getting User Details
    const { fullName, email, username, password } = req.body
    // console.log("Email : ", email)
    
    // Validation : is Empty?
    if (
        [fullName,email,username,password].some((field)=> field?.trim()==="")
    ) {
        throw new ApiError(400,"All Fields Are Required")
    } 

    // Check User Already Exist or Not
    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })

    if (existedUser) {
        throw new ApiError(409,"User Email or Username Already Exist")
    }

    // Check For Image Files And There Local Paths
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar File is required")
    }

    //Uploaing FIles to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Checking Avatar is uploaded to cloudinary or not
    if (!avatar) {
                throw new ApiError(400,"Avatar File is required")
    }

    // Creating user object in database mongo db atlas database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
        
    })

    // Checking is user created or not
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering user")
    }
    
    // Returning Created User With Data Along With Success Status And Message
    return res.status(201).json(
        new ApiRresponse(200,createdUser,"User Registred Successfully")
    )

})

export {
    registerUser,
}