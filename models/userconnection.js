'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    socketid: { type: String, required: true },
    location: { type: [Number] },
    creationdate: { type: Date, default: Date.now },
    modifieddate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserConnection', schema);