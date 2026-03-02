import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: function () {
                return !this.hasGoogleAccount;
            },
        },
        hasGoogleAccount: {
            type: Boolean,
            default: false,
        },
        age: {
            type: Number,
            required: true,
            min: 0,
            max: 120,
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: true,
        },
        role: {
            type: String,
            enum: ["user", "doctor", "caregiver"],
            default: "user",
        },
        doctorCode: {
            type: String,
            default: null,
            uppercase: true,
            trim: true,
        },
        fcmToken: {
            type: String,
            default: null,
        },
        googleTokens: {
            access_token:  { type: String },
            refresh_token: { type: String },
            expiry_date:   { type: Number },
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateToken = function () {
    return jwt.sign(
        { _id: this._id, email: this.email, username: this.username, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || "7d" }
    );
};

export const User = mongoose.model("User", userSchema);