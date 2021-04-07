const express = require('express');
const router = express.Router();
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const urlExists = require('url-exists-deep');

const Url = require('./Url.model');


const indexHTML = path.join(__dirname, '../views/index.html');
const errorHTML = path.join(__dirname, '../views/404.html');

const PORT = process.env.PORT || 5000;


// Route Handlers
function getIndexView(req, res) {
    try {
        res.status(200).sendFile(indexHTML);
    } catch (error) {
        console.error(error);
    }
}

async function newUrl(req, res) {
    const {body} = req;
    try {
        let url = body.url;
        const checkUrl = await urlExists(url);
        if (checkUrl === false) {
            throw error
        }
        await Url.findOne({original: url}, async (err, found) => {
            if (found) {
                res.status(201).json({ original_url: found.original, short_url: found.short });
            }
            else {
                const urlID = nanoid(8); 
                const newUrl = await Url.create({
                    original: url,
                    short: urlID
                });
                res.status(201).json({ original_url: newUrl.original, short_url: newUrl.short });
            }
        });
    } catch (error) {
        console.log(body);
        res.status(400).json({
            error: 'invalid url'
        });
    }
}



// Routes
router.get('/', getIndexView);
router.post('/api/shorturl/new', newUrl)

// Loader
function loader(app) {
    app.use(express.urlencoded({extended: true}));
    app.use(express.json());
    app.use(router);
    console.info('Express running!')
    
    app.use(function(req, res) {
        res.status(404).sendFile(errorHTML);
    })
    
    app.use(function(err, req, res) {
        res.status(500).json({error: err.message});
    })
}

// Server
function serverBootstrap() {
    const app = express();
    app.use(cors());
    const server = app.listen(PORT);

    server.on('error', onError);
    server.on('listening', function() {
        console.info(`Server is running on port ${PORT}`);
        loader(app);
        mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true,
        })
        console.info('Mongo connected!')
    })

    function onError(err) {
        switch(err.code) {
            case 'EACCES':
                console.error('Requires elevated privileges!');
                break;
            case 'EADDRINUSE':
                console.error(`Port ${PORT} already in use!`);
            default:
                console.error(err);
        }
    }
}

serverBootstrap()
