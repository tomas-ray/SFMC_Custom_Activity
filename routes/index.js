"use strict";


var activity = require("./activity");
const JSON = require('circular-json');
var express     = require('express');
var path        = require('path');
var app = express();
/*
 * GET home page.
 */
exports.init = function(req, res) {
	console.log('INIT - > ');
	res.sendFile(path.resolve(__dirname,'../nba/index.html'));
};

exports.login = function(req, res) {
	console.log('Login - >');
	res.redirect("/");
};

exports.logout = function(req, res) {
	console.log('logout - >');
	res.send(200, 'Log out');
};
exports.require = function(req,res){
	res.sendFile(path.resolve(__dirname,'../nba/js/require.js'));
}
exports.config = function(req,res){
	res.sendFile(path.resolve(__dirname,'../nba/config.json'));
}
exports.postmonger = function(req,res){
	res.sendFile(path.resolve(__dirname,'../nba/js/postmonger.js'));
}
exports.jquery = function(req,res){
	res.sendFile(path.resolve(__dirname,'../nba/js/jquery-3.4.1.min.js'));
}
exports.image = function(req,res){
	res.sendFile(path.resolve(__dirname,'../nba/images/icon.PNG'));
}

