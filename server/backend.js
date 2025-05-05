const fs = require("fs");
const express = require('express');
const multer = require('multer'); //middleware that works with express to upload files
const path = require('path'); //filename shenanagins~
const cors = require('cors');
const crypto = require('crypto'); //for password thingies :3

const app = express();
const port = 1402; /* <3 */

app.use(cors()); //make cors shut the FUCK up :3
app.use(express.json()); //parsing messages in json because json is cool and sick
app.use(express.urlencoded({ extended: true })); //lowkey don't know what this does but yeah sure whatever man

var userInfo = JSON.parse(fs.readFileSync('./userinfo.json', {encoding: 'utf8'}));
userInfo.forEach(user => {
    let userPathExists = fs.existsSync(`./files/${user.subdomain}/filemap.json`);
    if (!userPathExists) {
        console.log(`./files/${user.subdomain}/filemap.json`);
        fs.mkdirSync(`./files/${user.subdomain}`); //first, we have to make the directory here
        fs.writeFileSync(`./files/${user.subdomain}/filemap.json`, "[]", 'utf8', (err) => {
            if (err) {
                console.error(`something went wrong creating ${user.subdomain}'s filemap.json >_<;;: `, err);
            }
        }); //just writes [] to the filepath to create filemap.json
    }
    app.use(express.static(`./files/${user.subdomain}`)); //each user needs their own root function like this :3
});

app.listen(port, () => {
    console.log(`flanstore server - port ${port}~`);
});

var lastFileName = '';
var originalFileName = '';
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let user = req.headers["x-user"]; //don't need to verify all of this, because the verification comes when we save it later
        cb(null, `./files/${user}`); //puts the files in here :3
    },
    filename: (req, file, cb) => {
        //first, checking if we have permission to upload the file
        let apiKey = req.headers["authorization"];
        let user = req.headers["x-user"];
        let isValid = verifyApiRequest(user, apiKey);

        if (isValid) {
            let ext = path.extname(file.originalname);
            originalFileName = file.originalname;
            lastFileName = Math.random().toString(36).slice(2)+ext;  //current format is just a random string + .ext
            cb(null, lastFileName);
        }
    },
});

const upload = multer({ storage });

function updateMapFile(subdomain, userFileMap) {
    fs.writeFile(`./files/${subdomain}/filemap.json`, JSON.stringify(userFileMap), 'utf8', (err) => {
        if (err) {
          console.error(`there was an error writing to the filemap for ${subdomain}:`, err);
          return;
        }
    });
}

function verifyApiRequest(subdomain, apiKey) {
    let isValid = false;
    userInfo.forEach(user => {
        if (user.subdomain == subdomain) {
            if (user.key == apiKey) {
                isValid = true;
            }
        }
    });
    return isValid;
}

function fileSizeString(size) {
    let sizeSuffix = "bytes";
    for (let i = 0; i < 3; i++) {
        if (size/1000 > 1) {
            size = size/1000;
            switch (i) {
                case 0:
                    sizeSuffix = "kB";
                    break;
                case 1:
                    sizeSuffix = "MB";
                    break;
                case 2:
                    sizeSuffix = "GB"; //i sure hope nobody uploads something as big as a terabyte....
                    break;
            }
        }
    }
    return `${Math.round(size*100)/100} ${sizeSuffix}`;
}

app.post('/upload', upload.single('file'), async (req, res) => { //file gets saved here, with upload.single
    let user = req.headers["x-user"];
    let currentDay = new Date();
    currentDay = `${currentDay.getUTCMonth()+1}/${currentDay.getUTCDate()}/${currentDay.getUTCFullYear()}`; //uses MM/DD/YYYY, but there should be a setting to change this~
    //once we have a valid upload, then we want to start messing with the fileMap~
    let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, {encoding: 'utf8'}));
    let stats = fs.statSync(`./files/${user}/${lastFileName}`); //since we've saved the file already, stats are here!! :D
    let fileSize = fileSizeString(stats.size);
    fileMap.push({ 
        filename: originalFileName, 
        serverPath: lastFileName, 
        dateAdded: currentDay, 
        fileSize: fileSize }); //finally, we can save everything~
    updateMapFile(user, fileMap);
    
    res.send(`https://${user}.yuru.ca/${fileMap[fileMap.length-1].serverPath}`); //sends the url back, since sharex copies the response to clipboard~
});

app.post('/deleteFile', async (req, res) => {
    let apiKey = req.headers["authorization"];
    let user = req.headers["x-user"];
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, {encoding: 'utf8'}));
        let deleteFile = req.body;
        fs.unlinkSync(`./files/${user}/${fileMap[deleteFile.fileToDelete].serverPath}`);
        fileMap.splice(deleteFile.fileToDelete, 1);
        updateMapFile(user, fileMap);
        res.send({"response":"deleted file successfully~ :3"});
    } else {
        res.send({"response":"could not verify api key >_<"});
    }
});

app.get('/prevFilename', (req, res) => {
    res.send({"name":lastFileName});
});

app.get('/readFilemap', (req, res) => {
    let apiKey = req.headers["authorization"];
    let user = req.headers["x-user"];
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, {encoding: 'utf8'}));
        res.send(fileMap);
    }
});

app.get('/', (req, res) => {
    res.redirect('https://flanstore.yuru.ca');
});

app.post('/login', (req, res) => {
    let loginDetails = req.body; //already sent as a json
    let userPass;
    let userSalt;
    let userKey;
    userInfo.forEach(user => {
        if (user.subdomain == loginDetails.subdomain) {
            userPass = user.password;
            userSalt = user.saltge;
            userKey = user.key;
        }
    });
    let loginToHash = loginDetails.password+userSalt;

    let hashPwd = crypto.createHash('sha256').update(loginToHash).digest('hex');
    if (hashPwd == userPass) {
        res.send({loginStatus: true, key: userKey});
    } else {
        res.send({loginStatus: false});
    }
});

app.post('/accountapply', (req, res) => {
    let accountDetails = req.body; //already sent as a json, like the login :3
    let salt = crypto.createHash('sha256').update(String(Math.random())).digest('hex'); //creates a unique salt for each user, pseudorandomly (not the best but whatever =w=)
    console.log(`-- new account application :O ${accountDetails.discord} wants to make ${accountDetails.subdomain}.yuru.ca: `);
    console.log(`salt for ${accountDetails.discord}: ${salt}`);
    console.log(`password hash for ${accountDetails.discord}: ${crypto.createHash('sha256').update(accountDetails.password+salt).digest('hex')}`);
    console.log(`api key for ${accountDetails.discord}: ${crypto.createHash('sha256').update(String(Math.random())).digest('hex')}`);
    //the way the application works for right now is that it just logs all of this to the console, and then i'll add them in the userinfo.json + create a new part in the cloudflare tunnel + update yuru.ca's DNS rules
    //would be cool to make this a bit less manual, but for now i think this is okay.
    //WAIT what if i make mrrpbot send me something
    //that might be peak...

    //also hi alice if you're reading this, and i'm sorry if this code sucks >_<
    //paws at you
    //paws at you
    //paws at you
    //paws at you

    res.send({"response":"applied for account :3"})
});
