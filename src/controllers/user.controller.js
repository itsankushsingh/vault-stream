import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { unlinkFiles } from "../utils/unlinkFiles.js"


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateRefreshToken()
        const refreshToken = user.generateAccessToken()
        
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something Went Wrong While Generatinig Access Or Refresh Token")
    }
}

// Register User
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


    

    // Check For Image Files And There Local Paths
    
    // let coverImageLocalPath = req.files?.coverImage[0]?.path;
    console.log(req.files.avatar)
    let avatarLocalPath;
    let coverImageLocalPath;
    
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;    
    }
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;    
    }

    // if (req.files.coverImage) {
    //     coverImageLocalPath = req.files?.coverImage[0]?.path;
    // }

    if (!avatarLocalPath) {
        console.log(avatarLocalPath);
        unlinkFiles([coverImageLocalPath])
        throw new ApiError(400,"Avatar File is required")
    }



    // Check User Already Exist or Not
    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })

    if (existedUser) {
        unlinkFiles([avatarLocalPath,coverImageLocalPath])
        // unlinkFiles(coverImageLocalPath)
        throw new ApiError(409,"User Email or Username Already Exist")
    }


    console.log("Here I Am");
    

    // Removed
    


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
        new ApiResponse(200,createdUser,"User Registred Successfully")
    )

})

// Login User

const loginUser = asyncHandler(async (req, res) => {
    // req.body - > get login data from user
    // username or email
    // find the user 
    // password check
    // access and refresh token
    // send cookies
    

    const {email, username, password } = req.body

    if (!username || !email) {
        throw new ApiError(400, "username email required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User Does Not Exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
    
    const option = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshTokoen", refreshToken, option)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken
            },
                "User Logged In"
            )
    )

})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {

            $set: {
                refreshToken: undefined
            }
        }
    )

    
    const option = {
        httpOnly: true,
        secure: true
    }
    
    return res
        .status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(new ApiResponse(200, {},"User Logged Out"))
})



export {
    registerUser,
    loginUser,
    logoutUser,
}