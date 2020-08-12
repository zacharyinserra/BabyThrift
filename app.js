//nodemon app.js --signal SIGKILL -e js,html,ejs,css

//jshint esversion:6

require('dotenv').config();
const express = require("express");
const session = require("express-session");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const AWS = require('aws-sdk');

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// User Schema

mongoose.connect("mongodb://localhost:27017/babies", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);


// Item Schema

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    required: true
  },
  manufacturer: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  picture: String
});

const Item = new mongoose.model("Item", itemSchema);

// AWS S3

const bucketName = "itemimagesbbthr";
const bucketRegion = "us-east-2";
const IdentityPoolId = process.env.IDENTITY_POOL_ID;

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: {
    Bucket: bucketName
  }
});

// Google Passport

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/authentication",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function (err, user) {
      return cb(err, user);
    });
  }
));

// app stuff

app.get("/", function (req, res) {
  var check;
  if (req.isAuthenticated()) {
    check = true;
  } else {
    check = false;
  }
  res.render("home", {
    check: check
  });
  //dont load login and register buttons load logout option instead
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);

app.get("/auth/google/authentication",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function (req, res) {
    res.redirect("/");
  });

app.get("/itemUpload", function (req, res) {
  // var check;
  // if (req.isAuthenticated()) {
  //   check = true;
  // } else {
  //   check = false;
  // }
  res.render("itemUpload", {
    check: isAuth(req)
  });
});

app.get("/shop/:itemType", function (req, res) {

  var itemsToRender = [];
  var promise = new Promise(function (resolve, reject) {
    Item.find({
      itemType: req.params.itemType
    }, function (err, items) {
      if (err) {
        console.log(err);
      } else {
        itemsToRender = items;
        if (itemsToRender.length !== 0) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });
  promise.then(function (result) {
      res.render("shop", {
        check: isAuth(req),
        itemType: req.params.itemType,
        itemList: itemsToRender
      });
    },
    function (err) {
      console.log(err);
    });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {
  User.register({
    username: req.body.username
  }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});

app.post("/addPhoto", function(req, res) {
  console.log("help");
  console.log(req.body.images);
});

app.post("/databaseAdd", function (req, res) {

});

function isAuth(req) {
  var check;
  if (req.isAuthenticated()) {
    check = true;
  } else {
    check = false;
  }
  return check;
}

function addImage(req) {
  var files = req.body.picsOfItem;
  if (!files.length) {
    return alert("Please choose a file to upload first.");
  }

}

app.listen(3000, function () {
  console.log("Server running on port 3000...");
});