// npm modules
const express = require('express');
const uuid = require('uuid/v4');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const axios = require('axios');
const bcrypt = require('bcrypt-nodejs');

// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    (email, password, done) => {
        console.log('Inside local strategy callback');
        
        // here is where you make a call to the database
        // to find the user based on their username or email address
        axios
            .get(`http://localhost:5000/users?email=${email}`)//refers to our DB folder containing the json-server
            .then(res => {
                const user = res.data[0];
                if (!user) {
                    return done(null, false, { message: 'Invalid credentials.\n' });
                }
                if (!bcrypt.compareSync(password, user.password)) {
                    return done(null, false, { message: 'Invalid credentials.\n' });
                }
                return done(null, user);
            })
            .catch(error => done(error));
    }
));

// tell passport how to serialize the user
passport.serializeUser((user, done) => {
    console.log('Inside serialize callback. User ID is saved to the session file store here.')
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    console.log('Inside deserializeUuser callback');
    console.log(`The user ID passport saved in the session file store is: ${id}`);
    
    // here is where you make a call to the database
    // to find the user based on their ID
    axios
        .get(`http://localhost:5000/users/${id}`)//refers to our DB folder containing the json-server
        .then(res => done(null, res.data))
        .catch(error => done(error, false));
});

// create the server
const app = express();

// add & configure middleware

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    genid: (req) => {
        console.log('Inside the session middleware genid function');
        console.log(`Request object sessionID from client: ${req.sessionID}`);
        return uuid();// use UUIDs for session IDs
    },
    store: new FileStore(),
    secret: 'keyboard cat',// in production you would want to replace this with a randomly generated string that’s pulled from an environment variable.
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());


// create the homepage route at '/'
app.get('/', (req, res) => {
    console.log('Inside the homepage callback function');
    console.log(req.sessionID); 
    res.send(`You got home page!\n`);
});

// create the login get and post routes
app.get('/login', (req, res) => {
    console.log('Inside GET /login callback function');
    console.log(req.sessionID);
    res.send(`You got the login page!\n`);
});

app.post('/login', (req, res, next) => {
    console.log('Inside POST /login callback function');
    passport.authenticate('local', (err, user, info) => {
        console.log('Inside passport.authenticate() callback');
        console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`);

        if (info) { return res.send(info.message); }
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }

        //console.log(`req.user: ${JSON.stringify(req.user)}`);

        req.login(user, (err) => {
            console.log('Inside req.login() callback');

            if (err) { return next(err); }

            //console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`);
            //console.log(`req.user: ${JSON.stringify(req.user)}`);

            console.log('You were authenticated & logged in!\n');

            return res.redirect('/authrequired');
        });
    })(req, res, next);
});

app.get('/authrequired', (req, res) => {
    console.log('Inside GET /authrequired callback');
    console.log(`User authenticated? ${req.isAuthenticated()}`);
    if(req.isAuthenticated()) {
        res.send('You hit the authentication endpoint\n');
    } else {
        res.redirect('/');
    }
});


// tell the server what port to listen on
const port = 3000;
app.listen(port, () => {
    console.log('Listening on localhost:' + port);
});