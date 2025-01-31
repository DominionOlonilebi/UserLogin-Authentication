var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
var db = mongojs('passportapp', ['users']);
var bcrypt = require('bcryptjs');
var passport = require('passport');
const { check, validationResult } = require('express-validator');
var LocalStrategy = require('passport-local').Strategy;

//Login Page - GET
router.get('/login', function(req, res){
    res.render('login');
});

// Register Page - GET
router.get('/register', function(req, res){
    res.render('register', { errors: [] });
});

// Register - POST
// router.post('/register', function(req, res){
//     //Get Form Values
//     var name      = req.body.name;
//     var email     = req.body.email;
//     var username  = req.body.username;
//     var password  = req.body.password;
//     var password2 = req.body.password2;

//     //Validation
//     req.checkBody('name', 'Name field is required').notEmpty();
//     req.checkBody('email', 'Email field is required').notEmpty();
//     req.checkBody('email', 'Please use a valid email').isEmail();
//     req.checkBody('username', 'Username field is required').notEmpty();
//     req.checkBody('password', 'Password field is required').notEmpty();
//     req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

//     //Check for errors
//     var errors = req.validationErrors();

//     if(errors){
//         console.log('Form has errors...');
//         res.render('register', {
//             errors: errors,
//             name: name,
//             email: email,
//             username: username,
//             password: password,
//             password2: password2,
//         });
//     }else {
//         var newUser = {
//             name: name,
//             email: email,
//             username: username,
//             password: password,
//         }

//         db.users.insert(newUser, function (err, doc){
//             if(err){
//                 res.send(err);
//             }else {
//                 console.log('User Added...');

//                 //Success Message
//                 req.flash('success', 'You are registered and can now log in');

//                 //Redirect after register
//                 res.location('/');
//                 res.redirect('/');
//             }
//         });
//     }
// });


//Register - POST

router.post('/register',[
    check('name', 'Name field is required').notEmpty(),
    check('email', 'Email field is required').notEmpty(),
    check('email', 'Please use a valid email').isEmail(),
    check('username', 'Username field is required').notEmpty(),
    check('password', 'Password field is required').notEmpty(),
    check('password2', 'Passwords do not match').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    })
], (req, res) => {
    // Get Form Values
    const { name, email, username, password, password2 } = req.body;

    //Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Forms has errors...');
        return res.render('register', {
            errors: errors.array(),
            name,
            email,
            username,
            password,
            password2,
        });
    } else {
        const newUser = {
            name,
            email,
            username,
            password,
        };

        bcrypt.genSalt(10, function(err, salt){
            bcrypt.hash(newUser.password, salt, function(err, hash){
                newUser.password = hash;

                db.users.insert(newUser, (err, doc) => {
                    if (err) {
                        res.send(err);
                    } else {
                        console.log('User Added...');
        
                        //Success Message
                        req.flash('success', 'You are registered and can now login');
        
                        // Redirect after register
                        res.location('/');
                        res.redirect('/');
                    }
                });
            });
        });
        
    }
});

passport.serializeUser(function(user,done) {
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    db.users.findOne({_id: mongojs.ObjectId(id)}, function(err, user){
        done(err, user);
    });
});

passport.use(new LocalStrategy(
    function(username, password, done){
        db.users.findOne({username: username}, function(err, user){
            if(err) {
                return done(err);
            }
            if(!user){
                return done(null, false, {message: 'Incorrect username'});
            }

            bcrypt.compare(password, user.password, function(err, isMatch){
                if(err) {
                    return done(err);
                }
                if(isMatch) {
                    return done(null, user);
                } else {
                    return done (null, false, {message: 'Incorrect password'});
                }
            });
        });
    }
));

//Login - POST
router.post('/login',
    passport.authenticate('local', { successRedirect: '/',
                                     failureRedirect: '/users/login',                       
                                     failureFlash: 'Invalid Username or Password' }), 
                                    function(req, res){
                                        console.log('Auth Successful');
                                        res.redirect('/');
                                    }
);

router.get('/logout', function(req, res){
    req.logout(function(err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'You have logged out');
        res.redirect('/users/login');
    });
});

module.exports = router;