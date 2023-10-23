const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    post: String,
    likes: [
        {type: mongoose.Schema.Types.ObjectId, ref: "user"}
    ],
    date: {
        type: Date,
        default: Date.now()
    }
})

module.exports = mongoose.model("post", postSchema);