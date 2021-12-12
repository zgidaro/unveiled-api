'use strict';

var Jwt = require('jsonwebtoken');
var Info = require('./info');

var User = require('../models/user');

exports.isAuthenticated = function (req, res, next) {
    // check header or url parameters or post parameters for token
    const token = req.body.token || req.query.token || req.headers['x-access-token'];
    // decode token
    if (token) {
        // verifies secret
        Jwt.verify(token, Info.secret, function (err, decoded) {
            if (err) {
                res.statusCode = 400;
                return res.json({ statuscode: res.statusCode, api: req.originalUrl, error: `${err}` });
            } else {
                //Eventually add expiration of time.
                User.findOne({ _id: decoded.user_id })
                    .then((user) => {
                        if (user) {
                            req.decoded = decoded;
                            next();
                        } else {
                            const error = `Invalid token.`
                            res.statusCode = 203;
                            return res.json({ api: req.originalUrl, error: error });
                        }
                    })
                    .catch((error) => {
                        res.statusCode = 203;
                        return res.json({ api: req.originalUrl, error: error });
                    });
            }
        });
    } else {
        const error = `No token provided.`
        res.statusCode = 203;
        return res.json({ api: req.originalUrl, error: error });
    }
}

exports.isSocketAuthenticated = async (socket) => {
    const token = socket.handshake.auth['x-access-token'];
    if (token) {
        try {
            const decoded = await Jwt.verify(token, Info.secret);
            if (!decoded) {
                return undefined;
            }
            
            const user = await User.findOne({ _id: decoded.user_id }).exec();
            return user;
        }
        catch (err) {
            console.error(err);
            return undefined;
        }
    }
    return undefined;
}