var createError = require("http-errors")
var express = require("express")
var path = require("path")
var cookieParser = require("cookie-parser")
var logger = require("morgan")
var mongoose = require("mongoose")
var path = require("path")
var session = require("express-session")
var bodyParser = require("body-parser")
var { User, Post, Comment } = require("./models/schema.js")
var passport = require("passport")
var LocalStrategy = require("passport-local").Strategy
var FacebookStrategy = require("passport-facebook")

var flash = require("express-flash")

require("dotenv").config()

var indexRouter = require("./routes/index")
var usersRouter = require("./routes/users")
var postsRouter = require("./routes/posts")
var authRouter = require("./routes/auth")
var imageRouter = require("./routes/image")

mongoose.set("strictQuery", false)
// Set up default mongoose connection
const mongoDB = process.env.MONGO_URI
mongoose.connect(mongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
const db = mongoose.connection
db.on("error", console.error.bind(console, "MongoDB connection error:"))

var app = express()

// view engine setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))
app.use(session({ secret: "cats", resave: false, saveUninitialized: true }))
app.use(bodyParser.json())
app.use(flash())
app.use(function (req, res, next) {
  if (!req.user)
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate")
  next()
})

passport.use(
  new FacebookStrategy(
    {
      clientID: 707219667663613,
      clientSecret: "c13df7de8aca08c7dd40797fc69a9cb4",
      callbackURL: "http://localhost:5000/auth/facebook/callback",
      profileFields: ["id", "displayName", "photos"]
    },
    function (accessToken, refreshToken, profile, cb) {
      const facebookId = profile.id
      const name = profile.displayName
      const pfpUrl = profile.photos[0].value

      // console.log(faceBookId, name, pfpUrl)

      // see if the user exists in the database...
      User.find({ facebookId: facebookId }, function (err, foundUser) {
        if (err) return res.render("error")
        if (foundUser.length !== 0) return cb(null, foundUser[0])

        // at this point, we determined that the user doesnt exist, proceed to create a new User.
        const newFacebookUser = new User({
          creationDate: new Date(),
          username: "",
          password: "",
          following: [],
          settings: { darkMode: false },
          name: name,
          isFacebookUser: true,
          facebookId: facebookId,
          pfpUrl: pfpUrl
        })

        newFacebookUser.save(function (err, newlyCreatedUser) {
          if (err) return res.render("error")
          return cb(null, newlyCreatedUser)
        })
      })
    }
  )
)

passport.use(
  new LocalStrategy((username, password, done) => {
    User.findOne({ username }, function (err, foundUser) {
      if (err) {
        console.log(err)
        return res.render("error")
      }

      if (foundUser) {
        if (password == foundUser.password) {
          return done(null, foundUser)
        }
        return done(null, false, { message: "Incorrect password" })
      }

      return done(null, false, { message: "Incorrect username" })
    })
  })
)

passport.serializeUser(function (user, done) {
  done(null, user._id)
})

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, foundUser) {
    if (err) {
      return done("error deserializing", false)
    }
    if (foundUser) {
      return done(null, foundUser)
    } else {
      return done("error deserializing", false)
    }
  })
})

app.use(passport.initialize())
app.use(passport.session())

app.use(function (req, res, next) {
  res.locals.currentUser = req.user
  next()
})

app.use("/", indexRouter)
app.use("/users", usersRouter)
app.use("/posts", postsRouter)
app.use("/auth", authRouter)
app.use("/image", imageRouter)

const port = process.env.PORT || 5000

app.listen(port, () => console.log(`Server started on port ${port}`))