const mongoose = require("mongoose")
var plm = require('passport-local-mongoose');

mongoose.connect("mongodb+srv://aksxil:aksxilx3@cluster0.pp7bk2e.mongodb.net/?retryWrites=true&w=majority")

var userSchema = mongoose.Schema({
  username:String,
  password:String,
  name:String,
  age:Number,
  email:String,
  pic:{
    type:String,
    default:"def.png"
  },
  post:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post' // Reference to your UserModel
  },
  key:String,
  keyExpires:Date
  
})

userSchema.plugin(plm);

module.exports = mongoose.model("user",userSchema)
