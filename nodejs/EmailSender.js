var nodemailer = require('nodemailer');
var express = require('express');
var moment = require('moment');
var currentDate = moment().format();
console.log(currentDate);

handleSayHello();

function handleSayHello() {
    // Not the movie transporter!
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'alicelovedrpepper@gmail.com', // Your email id
            pass: 'Drtailor1995!' // Your password
        }
    });

    var text = currentDate + '\n\n';

    var mailOptions = {
        from: 'alicelovedrpepper@gmail.com', // sender address
        to: 'drtailor1995@gmail.com', // list of receivers
        subject: 'Email Example', // Subject line
        text: text //, // plaintext body
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
        };
    });
}