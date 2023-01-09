var express = require("express")
var router = express.Router()
var { isAuthenticated } = require("../scripts/customMiddleware.js")
var { User } = require("../models/schema.js")
var fs = require("fs")

var multer = require("multer")

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads")
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now())
  }
})

var upload = multer({ storage: storage })

// everything here starts with /image
router.post("/", isAuthenticated, upload.single("image"), (req, res, next) => {
  var img = {
    data: fs.readFileSync(
      "/Users/andres/Desktop/odin/uploads/" + req.file.filename
    ),
    contentType: "image/png"
  }

  User.findById(req.user._id, function (err, foundUser) {
    if (err) return res.render("error")
    foundUser.nonFacebookUserImg = img
    foundUser.save(function (err, result) {
      if (err) return res.render("error")
      res.redirect("/profile")
    })
  })
})

module.exports = router