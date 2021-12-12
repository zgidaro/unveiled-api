'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    creationdate: { type: Date, default: Date.now },
    modifieddate: { type: Date, default: Date.now },
    wallets: [{
        address: { type: String, required: true },
        type: { type: String, required: true } // solana, ethereum, polygon
    }],
});

module.exports = mongoose.model('User', schema);
