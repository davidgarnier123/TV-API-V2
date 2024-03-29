require('dotenv').config();
const cron = require('node-cron');
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const https = require('https');



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o2syul8.mongodb.net/tv?retryWrites=true&w=majority`;
let db;
let myDatabase;
let channels = [];
let programs = [];
let updateDate = new Date();

async function connect() {
    try {
        db = await mongoose.connect(uri);
        console.log("Connected to MongoDB");
        myDatabase = db.connection.db;

        // // Récupérer les channels depuis la base de données ici
        // const channelsCollection = myDatabase.collection('channels');
        // channels = await channelsCollection.find({}).toArray();
        // // Récupérer les channels depuis la base de données ici
        // const programsCollection = myDatabase.collection('programs');
        // programs = await programsCollection.find({}).toArray();
        
        // deleteAllChannels();
        // deleteAllPrograms();
    
        // getAllData()
        //     .then((data) => {
        //         const result = createChannelsAndPrograms(JSON.parse(data));
        //         addChannelsToDatabase(result.channels);
        //         insertPrograms(result.programs).then( () => {
        //           updateStorage();
        //           updateDate = new Date();
        //          // res.json({success: true, time: updateDate});
        //         })
        //     })
        //     .catch((error) => {
        //         console.error(error);
        //     });
            
        updateStorage();
    } catch (error) {
        console.error(error);
    }
}

connect().then(() => {
    app.listen(8000, () => {
        console.log("Server started on port 8000");
    });
})


app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.get('/channels', async (req, res) => {
    try {
        res.json(channels);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/programs', async (req, res) => {
    try {
        res.json(programs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/update', async (req, res) => {
    try {

        let now = new Date();
        if (diff_hours(now, updateDate) > 1) {
            deleteAllChannels();
            deleteAllPrograms();
        
            getAllData()
                .then((data) => {
                    const result = createChannelsAndPrograms(JSON.parse(data));
                    addChannelsToDatabase(result.channels);
                    insertPrograms(result.programs).then( () => {
                      updateStorage();
                      updateDate = new Date();
                      res.json({success: true, time: updateDate});
                    })
                })
                .catch((error) => {
                    console.error(error);
                });
        }
        res.json({success: false, time: now, lastUpdate: updateDate});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


cron.schedule('0 4 * * *', () => {
    console.log('CRON TRIGGERED')
    deleteAllChannels();
    deleteAllPrograms();

    getAllData()
        .then((data) => {
            const result = createChannelsAndPrograms(JSON.parse(data));
            addChannelsToDatabase(result.channels);
            insertPrograms(result.programs);
        })
        .catch((error) => {
            console.error(error);
        });
});

function diff_hours(dt2, dt1) 
 {

  var diff =(dt2.getTime() - dt1.getTime()) / 1000;
  diff /= (60 * 60);
  return Math.abs(Math.round(diff));
  
 }

function deleteAllChannels() {
    const channelsCollection = mongoose.connection.db.collection('channels');
    channelsCollection.deleteMany({})
        .then((result) => {
            console.log(`Deleted ${result.deletedCount} documents channels`);
        })
        .catch((error) => {
            console.error(error);
        });
}

function deleteAllPrograms() {
    const programsCollection = mongoose.connection.db.collection('programs');
    programsCollection.deleteMany({})
        .then((result) => {
            console.log(`Deleted ${result.deletedCount} documents programs`);
        })
        .catch((error) => {
            console.error(error);
        });
}

async function updateStorage() {
            // Récupérer les channels depuis la base de données ici
            const channelsCollection = myDatabase.collection('channels');
            channels = await channelsCollection.find({}).toArray();
            // Récupérer les channels depuis la base de données ici
            const programsCollection = myDatabase.collection('programs');
            programs = await programsCollection.find({}).toArray();
}


function getAllData() {
    return new Promise((resolve, reject) => {
        https.get('https://daga123-tv-api.onrender.com/getPrograms', (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                resolve(data);
            });

        }).on('error', (error) => {
            reject(error);
        });
    });
}

function createChannelsAndPrograms(data) {
    const channels = [];
    const programs = [];

    for (const channelData of data.data) {
        const channel = {
            name: channelData.id,
            icon: channelData.icon,
        };
        channels.push(channel);

        for (const programData of channelData.programs) {
            const program = {
                name: programData.name,
                start: programData.start,
                end: programData.end,
                channel: channelData.id,
                icon: programData.icon,
                rating: programData.rating,
                cat: programData.cat,
                desc: programData.desc,
            };
            programs.push(program);
        }
    }

    return {
        channels,
        programs,
    };
}


async function addChannelsToDatabase(channelsData) {
    const channelsCollection = myDatabase.collection('channels');
    const result = await channelsCollection.insertMany(channelsData);
    channels = [];
    channels = channelsData;
    console.log(`Added ${result.insertedCount} channels to database`);
}


async function insertPrograms(programsData) {
    const channelsCollection = myDatabase.collection('programs');
    const result = await channelsCollection.insertMany(programsData);
    programs = [];
    programs = programsData;
    console.log(`Added ${result.insertedCount} programs to database`);
}