import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { unlinkFiles } from "../utils/unlinkFiles.js"
import jwt from "jsonwebtoken"
import console from "console"


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const refreshToken = user.generateRefreshToken()
        const accessToken = user.generateAccessToken()
        
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
    


    // Validation : is Empty?
    if (
        [fullName,email,username,password].some((field)=> field?.trim()==="")
    ) {
        throw new ApiError(400,"All Fields Are Required")
    } 


    

    // Check For Image Files And There Local Paths
    
    let avatarLocalPath;
    let coverImageLocalPath;
    
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;    
    }
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;    
    }



    if (!avatarLocalPath) {
        unlinkFiles([coverImageLocalPath])
        throw new ApiError(400,"Avatar File is required")
    }



    // Check User Already Exist or Not
    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })

    if (existedUser) {
        unlinkFiles([avatarLocalPath,coverImageLocalPath])
        throw new ApiError(409,"User Email or Username Already Exist")
    }

    

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

    if (!(username || email)) {
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
    
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken
            },
                "User Logged In"
            )
    )

})

// Logout User
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
        // .clearCookie("refreshTokoen", option)   
        // .clearCookie("refreshToken", option)   
        .json(new ApiResponse(200, {},"User Logged Out"))
})

// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized request")
    }

    
    try {

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken._id)

        
    
        if (!user) {
            throw new ApiError(401,"Invalid Request Token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"Refresh Token is Expired")
    
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken,newrefreshToken }=await generateAccessAndRefreshTokens(user._id)
    
        return res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",newrefreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refereshToken: newrefreshToken
                    },
                    "Access Token Refreshed"
                )
            
        )
    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "Something Went Wrong While Decoding"
        )
        
    }

})

// Change Current Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    // get current password and new password from req.body
    // check for current password
    // if correct then update with new password
    // else error  

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(401,"Current Password is Incorrect")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })   
    
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully")
    )

})

// Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {

    console.log(req.user)

    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current User"))
})

// Update User Details
const updateUserDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body;

    if (!(fullName || email)) {
        throw new ApiError(400, "Atleast One Field is Required")
    }
    // const user = await User.findById(req.user._id).select("-password -refreshToken")
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            fullName,
            email,
        },
        {
            returnDocument: "after"
        }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User Details Updated Successfully"))
});

    
// Update User Avatar
const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar File is Required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar) {
        throw new ApiError(400,"Avatar File is Required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            avatar: avatar.url
        },
        { returnDocument: "after" }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar Updated Successfully"))
})

// Update User Cover Image
const updateUserCover = asyncHandler(async (req, res) => {

    const coverLocalPath = req.file?.path;
    if (!coverLocalPath) {
        throw new ApiError(400,"Cover Image File is Required")
    }

    const coverImage = await uploadOnCloudinary(coverLocalPath)
    if (!coverImage) {
        throw new ApiError(400,"Cover Image File is Required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            coverImage: coverImage.url
        },
        { returnDocument: "after" }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image Updated Successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar,
    updateUserCover,
}