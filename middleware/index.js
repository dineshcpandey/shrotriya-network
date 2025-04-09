// middleware/index.js
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const applyMiddleware = (app) => {
    // Parse JSON request bodies
    app.use(bodyParser.json());

    // Parse URL-encoded request bodies
    app.use(bodyParser.urlencoded({ extended: true }));

    // HTTP request logger
    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('dev'));
    }

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({
            error: 'Something went wrong!',
            message: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });
};

module.exports = applyMiddleware;