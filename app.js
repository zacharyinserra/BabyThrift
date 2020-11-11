//nodemon app.js --signal SIGKILL -e js,html,ejs,css

//jshint esversion:6

require('dotenv').config();

const fs = require("fs");
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
const multer = require('multer')

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.json({
  type: ["application/json", "text/plain"]
}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// Constants
var userID = "";
var isGoogleAuth = null;


// multer

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "C:/Code/BabyThrift/tmp-images") //switch to dirname
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + ".png")
  }
})
const upload = multer({
  storage: storage
});


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
  userID: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
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

const bucketName = process.env.BUCKETNAME;
const bucketRegion = process.env.BUCKETREGION;
const IdentityPoolId = process.env.IDENTITY_POOL_ID;

AWS.config = new AWS.Config();
AWS.config.accessKeyId = process.env.ACCESSKEY;
AWS.config.secretAccessKey = process.env.SECRETKEY;
AWS.config.region = "us-east-2";

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


// Google auth route

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/authentication",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function (accessToken, refreshToken, profile, cb) {
    // Is google authentication
    User.findOrCreate({
      googleId: profile.id
    }, function (err, user) {
      isGoogleAuth = true;
      userID = user._id;
      return cb(err, user);
    });
  }
));


// API routes

app.get("/", function (req, res) {
  var itemsToRender = [];
  var promise = new Promise(function (resolve, reject) {
    Item.find({

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
      res.render("home", {
        check: isAuth(req),
        itemList: itemsToRender
      });
    },
    function (err) {
      console.log(err);
    });
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

app.get("/logout", function (req, res) {
  isGoogleAuth = null;
  userID = "";
  req.logout();
  res.redirect("/");
});

app.get("/account", function (req, res) {
  var itemsToRender = [];
  // Retreive items from database for specific user based on their ID
  var promise = new Promise(function (resolve, reject) {
    Item.find({
      userID: userID
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
      if (isAuth(req)) {
        res.render("account", {
          check: true,
          itemList: itemsToRender
        });
      } else {
        res.render("login");
      }
    },
    function (err) {
      console.log(err);
      if (isAuth(req)) {
        res.render("account", {
          check: true,
          itemList: itemsToRender
        });
      } else {
        res.render("login");
      }
    });
});

app.get("/item-upload", function (req, res) {
  if (isAuth(req)) {
    res.render("item-upload", {
      check: true
    });
  } else {
    res.render("login");
  }
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

app.get("/item/:itemID", function (req, res) {
  var name;
  var desc;
  var manufacturer;
  var price;
  var city;
  var state;
  var pics;

  var promise = new Promise(function (resolve, reject) {
    Item.findOne({
      _id: req.params.itemID
    }, function (err, item) {
      name = item.name;
      desc = item.description;
      manufacturer = item.manufacturer;
      price = item.price;
      city = item.city;
      state = item.state;
      pics = item.picture;
      if (err) {
        console.log(err);
      } else {
        if (item) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });

  promise.then(function (result) {
      pics = pics.split(";");
      res.render("item", {
        check: isAuth(req),
        itemName: name,
        itemDesc: desc,
        itemManu: manufacturer,
        itemPrice: price,
        itemCity: city,
        itemState: state,
        itemPics: pics
      });
    },
    function (err) {
      console.log(err);
    });
});

app.get("/edit-item/:itemID", function (req, res) {
  var name;
  var desc;
  var manufacturer;
  var price;
  var city;
  var state;
  var pics;

  var promise = new Promise(function (resolve, reject) {
    Item.findOne({
      _id: req.params.itemID
    }, function (err, item) {
      name = item.name;
      desc = item.description;
      manufacturer = item.manufacturer;
      price = item.price;
      city = item.city;
      state = item.state;
      pics = item.picture;
      if (err) {
        console.log(err);
      } else {
        if (item) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });

  promise.then(function (result) {
      pics = pics.split(";");
      res.render("edit-item", {
        check: isAuth(req),
        itemID: req.params.itemID,
        itemName: name,
        itemDesc: desc,
        itemManu: manufacturer,
        itemPrice: price,
        itemCity: city,
        itemState: state,
        itemPics: pics
      });
    },
    function (err) {
      console.log(err);
    });
});

app.get("/account-settings", function (req, res) {
  res.render("account-settings", {
    check: isAuth(req)
  });
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
        // Not google authentication
        isGoogleAuth = false;
        userID = req.user._id;
        res.redirect("/");
      });
    }
  });
});

app.post("/database-add", upload.array("itemImages"), function (req, res) {

  if (userID === "") {
    res.write("<h1>Sign in bitch<h1>");
  }

  var name = req.body.nameOfItem;
  var desc = req.body.descriptionOfItem;
  var type = req.body.typeOfItem;
  var manufacturer = req.body.manufacturerOfItem;
  var price = req.body.priceOfItem;
  var city = req.body.cityOfItem;
  var state = req.body.stateOfItem;

  // Upload image files to s3 bucket

  var files = fs.readdirSync(__dirname + "/tmp-images");
  // console.log(files);

  var promises = [];

  files.forEach(item => {
    var fileContent = fs.readFileSync(__dirname + "/tmp-images/" + item);

    var params = {
      Bucket: bucketName,
      Key: "item-images/" + item,
      ACL: "public-read",
      Body: fileContent
    };

    promises.push(
      new Promise(function (resolve, reject) {
        s3.upload(params, function (err, data) {
          if (err) {
            console.log(err);
            reject();
          } else {
            console.log(`File uploaded successfully. ${data.Location}`);
            resolve();
          }
        })
      })
      .then(function (result) {}).catch(function (err) {
        console.log(err);
        res.render("upload-error", {
          check: true,
          error: err
        });
      })
    )
  });

  // Waits till all files uploaded
  Promise.all(promises).then(() => {
    console.log("Upload complete.");

    // Delete temp image files
    files.forEach(item => {
      fs.unlink(__dirname + "/tmp-images/" + item, err => {
        if (err) {
          console.log(err);
        }
      });
    });
    console.log("Temp files deleted.");

    // Do database add of item as long as everything works

    var dbItem = new Item({
      userID: userID,
      name: name,
      description: desc,
      itemType: type,
      manufacturer: manufacturer,
      price: price,
      city: city,
      state: state,
      picture: files.join(";")
    });
    // console.log(dbItem._id);
    dbItem.save(function (err, doc) {
      if (err) {
        console.log(err);
        res.render("upload-error", {
          check: true,
          error: err
        });
      } else {
        console.log("Item added succesfully");
        // console.log(doc);
        res.render("upload-success", {
          check: true,
          itemID: dbItem._id,
          itemName: name,
          itemDesc: desc,
          itemType: type,
          itemManu: manufacturer,
          itemPrice: price,
          itemCity: city,
          itemState: state,
          itemPics: files
        });
      }
    });
  });
});

app.post("/search-results", function (req, res) {
  var search = req.body.searchText;
  var category = req.body.category;

  if (category === "All") {
    category = ""
  }

  var itemsToRender = [];
  var promise = new Promise(function (resolve, reject) {
    // db.getCollection('items').find({"name":{$regex:".*test.*", $options: "i"}, "itemType":{$regex: ".*Clothing.*"}})
    Item.find({
      name: {
        $regex: ".*" + search + ".*",
        $options: "i"
      },
      itemType: {
        $regex: ".*" + category + ".*"
      }
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
        itemList: itemsToRender,
        placeholder: search
      });
    },
    function (err) {
      console.log(err);
    });
});

app.post("/edit-item/delete-item", function (req, res) {

  var id = req.body.itemID;
  var name;
  var desc;
  var manufacturer;
  var price;
  var city;
  var state;
  var pics;

  var promise = new Promise(function (resolve, reject) {
    Item.findOne({
      _id: id
    }, function (err, item) {
      name = item.name;
      desc = item.description;
      manufacturer = item.manufacturer;
      price = item.price;
      city = item.city;
      state = item.state;
      pics = item.picture;
      if (err) {
        console.log(err);
      } else {
        if (item) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });

  promise.then(function (result) {
      console.log("Item found.");
      console.log(result);
    },
    function (err) {
      console.log(err);
    });

  console.log("Begin delete.");
  var promise = new Promise(function (resolve, reject) {
    Item.deleteOne({
      _id: id
    }, function (err) {
      if (err) {
        console.log(err);
        reject();
      } else {
        resolve();
      }
    });
  });

  promise.then(function (result) {
      pics = pics.split(";");
      console.log(result);
      res.render("delete-success", {
        check: isAuth(req),
        itemID: id,
        itemName: name,
        itemDesc: desc,
        itemManu: manufacturer,
        itemPrice: price,
        itemCity: city,
        itemState: state,
        itemPics: pics
      });
    },
    function (err) {
      console.log(err);
      res.render("delete-error");
    });
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

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

app.listen(3000, function () {
  console.log("Server running on port 3000...");
});