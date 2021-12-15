var express = require('express');
var router = express.Router();
var jwt = require("jsonwebtoken"); // used to create, sign, and verify tokens
const bcrypt = require("bcryptjs");
var Info = require('../../security/info');
var { isAuthenticated } = require('../../security/authenticate');

const User = require('../../models/user');

User.countDocuments({}, async (err, count) => {
    if (count < 1) {
        const encryptedpassword = await bcrypt.hash("password", Info.saltRounds);
        if (encryptedpassword) {
            await new User({ email: "admin@unveiled.space", username: 'unveiled', password: encryptedpassword }).save();
        }
    }
});

router.post('/signup', async (req, res, next) => {
    const regexMatchEmail = new RegExp("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$");
    const isEmailValid = req.body.email.match(regexMatchEmail);
    if (!isEmailValid) {
        const error = `Email is not valid.`;
        res.statusCode = 400;
        res.json({ error: error });
        return;
    }

    const regexMatchUsername = new RegExp("^[A-Za-z0-9._-]*$");
    const isUsernameValid = req.body.username.match(regexMatchUsername);
    if (!isUsernameValid) {
        const error = `Usernames can only contain letters, numbers, periods(.), underscores(_), and hyphens(-).`;
        res.statusCode = 400;
        res.json({ error: error });
        return;
    }

    const emailExists = await User.findOne({ email: { $regex: new RegExp("^" + req.body.email + "$", "i") } })
        .select('_id username')
        .exec();
    
    if (emailExists) {
        res.statusCode = 400;
        res.json({ error: `An account with that email already exists.` });
        return;
    }

    const usernameExists = await User.findOne({ username: { $regex: new RegExp("^" + req.body.username + "$", "i") } })
        .select('_id username')
        .exec();
    
    if (usernameExists) {
        res.statusCode = 400;
        res.json({ error: `An account with that username already exists.` });
        return;
    }

    const user = new User();
    user.email = req.body.email;
    user.username = req.body.username;

    const password = req.body.password;
    const encryptedpassword = await bcrypt.hash(password, Info.saltRounds);
    if (encryptedpassword) {
        user.password = encryptedpassword;
    }

    const savedUser = await user.save();

    res.json(createToken(savedUser));
});

router.post('/login', async (req, res, next) => {
    const loginUser = await User.findOne({ username: { $regex: new RegExp("^" + req.body.username + "$", "i") } })
        .exec();
    
    if (!loginUser) {
        res.statusCode = 400;
        res.json({ error: `User does not exist.` });
        return;
    }

    const passwordMatch = await bcrypt.compare(req.body.password, loginUser.password);
    if (!passwordMatch) {
        res.statusCode = 400;
        res.json({ error: `Check password.` });
        return;
    }

    res.json(createToken(loginUser));
});

function createToken(user) {
    const payload = {
        user_id: user._id,
        username: user.username,
        email: user.email,
    };

    return jwt.sign(payload, Info.secret);
}

router.get('/wallets', isAuthenticated, async (req, res, next) => {
    let user = await User
        .findOne({ _id: req.decoded.user_id })
        .select('_id username email wallets')
        .exec();

    if (!user) {
        res.statusCode = 400;
        res.json([]);
        return;
    }

    res.json(user.wallets);
});

router.get('/wallets/:username', async (req, res, next) => {
    let user = await User
        .findOne({ username: { $regex: new RegExp("^" + req.params.username + "$", "i") } })
        .select('_id username wallets')
        .exec();

    if (!user) {
        res.statusCode = 400;
        res.json([]);
        return;
    }

    res.json(user.wallets);
});

router.put('/wallets', isAuthenticated, async (req, res, next) => {
    let user = await User.findOne({ _id: req.decoded.user_id });
    if (!user) {
        res.statusCode = 400;
        res.json();
        return;
    }

    const { address, type } = req.body;
    if (!user.wallets) {
        user.wallets = [];
    }

    if (user.wallets.find((w) => w.address === address)) {
        res.json();
        return;
    }

    user.wallets.push({ address, type });
    await user.save();
    res.json();
});

router.put('/wallets/:address', isAuthenticated, async (req, res, next) => {
    let user = await User.findOne({ _id: req.decoded.user_id });
    if (!user) {
        res.statusCode = 400;
        res.json();
        return;
    }

    const walletAddress = req.params.address;
    if (user.wallets) {
        user.wallets = user.wallets.filter((w) => w.address !== walletAddress);
        user.save();
    }

    res.json();
});

module.exports = router;
