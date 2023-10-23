var express = require('express');
var router = express.Router();
var passport = require('passport');
const userModel = require("./users"); // Assuming your User model is imported correctly
const postModel = require("./posts");
var mailer = require("../nodemailer")
const crypto = require("crypto");

var multer = require('multer');
const localStrategy = require('passport-local').Strategy; // Import the Strategy class
passport.use(new localStrategy(userModel.authenticate()));

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Specify the directory where you want to store uploaded files
    cb(null, './public/images/uploads/');
  },
  filename: function (req, file, cb) {
    // Define how the uploaded files should be named
    cb(null, Date.now() + '-' + file.originalname);
  }
});

var upload = multer({ storage: storage });


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', function (req, res, next) {
  res.render('login'); // Assuming you have a 'login' view/template
});
router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});


// Your other routes

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/');
  }
}

router.get('/feed', function (req, res, next) {
  // Find all posts in the database
  postModel.find({})
    .populate('author', ' name pic')  // Populate the 'author' field with 'username' and 'pic' fields from users
    .then(function (allPosts) {
      res.render('feed', { title: 'Feed', posts: allPosts, user: req.user });
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send('An error occurred while fetching posts');
    });
});
router.get('/profile', isLoggedIn, function (req, res, next) {
  // Find posts associated with the currently logged-in user
  postModel.find({ author: req.user._id }) // Find posts authored by the logged-in user
    .then(function (posts) {
      res.render('profile', { title: 'Profile', user: req.user, posts });
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send('An error occurred while fetching posts');
    });
});

//delete post

router.post('/delete/:postid', isLoggedIn, function (req, res, next) {
  const postId = req.params.postid;

  // Find the post by ID and remove it
  postModel.findByIdAndRemove(postId)
    .then(function (removedPost) {
      if (!removedPost) {
        return res.status(404).send("Post not found");
      }
      res.redirect('/profile'); // Redirect to profile after deleting the post
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send('An error occurred while deleting the post');
    });
});



router.post('/register', function (req, res, next) {
  var newUser = new userModel({
    username: req.body.username,
    age: req.body.age,
    name: req.body.name,
    email: req.body.email
  });

  userModel.register(newUser, req.body.password, function (err, user) {
    if (err) {
      return res.send(err);
    }

    passport.authenticate('local')(req, res, function () {
      res.redirect('/profile');
    });
  });
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/profile',
  failureRedirect: '/'
}));

router.get('/logout', function (req, res) {
  req.logout(); // Removed the callback function
  res.redirect('/login');
});

router.get('/edit/:id', function (req, res, next) {
  const userId = req.params.id;

  userModel.findById(userId)
    .then(function (user) {
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.render("edit", { user });
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send("An error occurred while fetching user data");
    });
});

router.post('/update/:id', isLoggedIn, function (req, res, next) {
  const userId = req.params.id;

  userModel.findByIdAndUpdate(userId, {
    username: req.body.username,
    name: req.body.name,
  }, { new: true })
    .then(function (updatedUser) {
      req.login(updatedUser, function (err) {
        if (err) { return next(err); }
        return res.redirect('/profile');
      })
    })
});

router.get('/check/:username', function (req, res, next) {
  userModel.findOne({ username: req.params.username })
    .then(function (user) {
      if (user) {
        res.json(true);
      }
      else {
        res.json(false);
      }
    });
});

// Import necessary modules and setup Passport



// Your other routes

router.post('/post', isLoggedIn, function (req, res, next) {
  const newPost = new postModel({
    post: req.body.post,
    author: req.user._id, // Associate the post with the logged-in user
  });

  newPost.save()
    .then(function (post) {
      res.redirect('/profile'); // Redirect to profile after creating the post
      console.log(post);
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send('An error occurred while creating the post');
    });
});


router.post('/upload', isLoggedIn, upload.single('pic'), function (req, res) {
  userModel.findOne({ username: req.user.username })
    .then(function (loggedin) {
      if (loggedin.pic && loggedin.pic !== 'def.png') {
        const fs = require('fs');
        const oldPicturePath = './public/images/uploads/' + loggedin.pic;
        fs.unlink(oldPicturePath, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }

      loggedin.pic = req.file.filename;
      loggedin.save()
        .then(function () {
          res.redirect("back");
        })
        .catch(function (err) {
          console.error(err);
          res.status(500).send("Internal Server Error");
        });
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

router.get("/like/:postid", isLoggedIn, function (req, res, next) {
  userModel.findOne({ _id: req.user._id }) // Corrected to use _id instead of username
    .then(function (user) {
      postModel.findOne({ _id: req.params.postid })
        .then(function (post) {
          if (post.likes.indexOf(user._id) === -1) {
            post.likes.push(user._id);
          } else {
            post.likes.splice(post.likes.indexOf(user._id), 1);
          }
          post.save()
            .then(function () {
              res.redirect("back");
            })
            .catch(function (err) {
              console.error(err);
              res.status(500).send("Internal Server Error");
            });
        })
        .catch(function (err) {
          console.error(err);
          res.status(500).send("Internal Server Error");
        });
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

router.get('/forgot', function (req, res, next) {
  res.render('forgot');
});
router.get('/demo', function (req, res, next) {
  res.render('demo');
});


router.post('/forgot', async function (req, res, next) {
  var user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    res.send("We've sent a mail, if email exists.");
  } else {
    try {
      // Generate a random key
      crypto.randomBytes(80, async function (err, buff) {
        // Add this code after generating the random key
        let key = buff.toString("hex");
        user.key = key;
        user.keyExpires = Date.now() + 24 * 60 * 60 * 1000; 


        // Save the key to the user model
        await user.save();

        // Send the email with the reset link
        await mailer(req.body.email, user._id, key);

        // Redirect or send a response
        res.send("Password reset link sent successfully.");
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }
});

router.get('/reset/:userid/:key', async function (req, res, next) {
  const userId = req.params.userid;
  const key = req.params.key;

  try {
    const user = await userModel.findById(userId);

    // Check if the user exists and the key matches
    if (!user || user.key !== key) {
      return res.status(400).send('Invalid reset link');
    }
     // Check if the key has expired
     if (user.keyExpires && user.keyExpires < Date.now()) {
      return res.status(400).send('Reset link has expired');
    }

    // Render a reset password form
    res.render('reset', { userId, key });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/reset/:userid/:key', async function (req, res, next) {
  const userId = req.params.userid;
  const key = req.params.key;

  const newPassword = req.body.password;
  const confirmPassword = req.body.confirmPassword

  try {
    const user = await userModel.findById(userId);

    // Check if the user exists and the key matches
    if (!user || user.key !== key) {
      return res.status(400).send('Invalid reset link');
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).send('don not match password');
    }

    // Update the user's password
    user.setPassword(newPassword, async function () {
      await user.save();

      // Remove the key after successful password reset
      user.key = undefined;
      await user.save();
    //login the user
      req.logIn(user, function(){
        res.redirect("/profile");
      })
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



module.exports = router; // Keep only one module.exports statement at the end

