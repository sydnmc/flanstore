const fs = require("fs");
const express = require('express');
const multer = require('multer'); //middleware that works with express to upload files
const path = require('path'); //filename shenanagins~
const cors = require('cors');
const crypto = require('crypto'); //for password thingies :3

const app = express();
const port = 1402; /* <3 */

const WebSocket = require('ws'); //websocket is used for making a connection with mrrpbot locally, for her to send messages about new users and upload files
const wsPort = 6767; //i think this is a pretty bouba port :3
const flanbridge = new WebSocket.Server({ host: '127.0.0.1', port: wsPort }); //binds the ws connection to localhost, just in case ^-^

app.use(cors()); //make cors shut the FUCK up :3
app.use(express.json()); //parsing messages in json because json is cool and sick
app.use(express.urlencoded({ extended: true })); //lowkey don't know what this does but yeah sure whatever man

var userInfo = JSON.parse(fs.readFileSync('./userinfo.json', {encoding: 'utf8'}));
userInfo.forEach(user => {
    let userPathExists = fs.existsSync(`./files/${user.subdomain}/filemap.json`);
    if (!userPathExists) {
        console.log(`created directory for ${user.subdomain} at ./files/${user.subdomain}/filemap.json >w<`);
        fs.mkdirSync(`./files/${user.subdomain}`); //first, we have to make the directory here
        fs.writeFileSync(`./files/${user.subdomain}/filemap.json`, "[]", 'utf8', (err) => {
            if (err) {
                console.error(`something went wrong creating ${user.subdomain}'s filemap.json >_<;;: `, err);
            }
        }); //just writes [] to the filepath to create filemap.json
    }
    app.use(express.static(`./files/${user.subdomain}`)); //each user needs their own root function like this :3
});
app.use(express.static(`./api`)); //also serves everything in the api folder, which for now is just user pfps :3

app.listen(port, () => {
    console.log(`flanstore server - port ${port}~`);
});

var lastFileName = '';
var originalFileName = '';
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        //for saving to other locations, we need to verify user permissions :3
        let apiKey = req.headers["authorization"];
        let user = req.headers["x-user"];
        let isValid = verifyApiRequest(user, apiKey);
        let saveLocation = `./files/${user}`; //default save location

        if (isValid) {
          let userIndex = findUserIndex(user);
          if (userInfo[userIndex].isPrivileged) { //requires extra special privilege :O
            let filePath = userInfo[userIndex].filePath;
            if (filePath) { //checks if we even have a file path saved, because we may not
              if (filePath.includes('~')) { //will sometimes have tilda hanging around
                saveLocation = filePath.replace('~', '/home/sydney');
              } else {
                saveLocation = filePath;
              }
            }
          }
        } else {
          //if the user is uploading a pfp, then they can save something unprivleged, since we don't send any headers with those (ofc since no user = no auth)
          //!! WARNING !! this is lowkey a security risk :3
          //but i'm sure it's fine :3 users should only be allowed to upload image file types (i should verify this on the backend tho,,)
          //alice if u see this have fun trying to hack me >w<

          console.log('meow?');
          console.log(file);
          console.log(req);
        }
        cb(null, saveLocation);
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
    fs.writeFile(`./files/${subdomain}/filemap.json`, JSON.stringify(userFileMap, null, 4), 'utf8', (err) => {
        if (err) {
          console.error(`there was an error writing to the filemap for ${subdomain}:`, err);
          return;
        }
    });
}

function updateUserData() {
    fs.writeFile(`./userinfo.json`, JSON.stringify(userInfo, null, 4), 'utf8', (err) => {
        if (err) {
          console.error(`there was an error writing to the userInfo file:`, err);
          return;
        }
    });
}

function findUserIndex(username) {
    let searchUser = 0;
    let foundUser = false;
    while (searchUser < userInfo.length && !foundUser) { //just so we can cycle through the users, and find which one to apply our changes to :3
        if (userInfo[searchUser].subdomain == username) {
            foundUser = true;
        }
        searchUser++;
    }
    return searchUser-1;
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

flanbridge.on('connection', connection => { //we need to get the connection from here in order to do things with it :3 took longer than i care to admit to figure that out..,
  console.log(`mrrpbot connected to websocket on port ${wsPort} >w<`);

  connection.on('message', (message) => {
    console.log(message.userInfo);
    message = JSON.parse(message);
    console.log(`heard back from mrrpbot aaaaa >_<,,`);
    if (message.type === "userAdd" && message.result === "accept") {
      console.log(`adding subdomain ${message.userInfo.subdomain}, associated with user ${message.userInfo.discord} :D`);
      userInfo.push({
        "subdomain": message.userInfo.subdomain,
        "saltge": message.userInfo.salt,
        "password": message.userInfo.password,
        "key": message.userInfo.apiKey,
        "isPrivileged": false
      });
      updateUserData();
      console.log(`successfully added ${message.userInfo.subdomain}.yuru.ca >w<`);
    } else {
      console.log(`she didn't tell me to do anything, tho,, >_<;;`);
    }
  });

  connection.on('close', () => {
    console.log('mrrpbot disconnected from websocket :c,,');
  });
});

flanbridge.on('message', (message) => {
    console.log(`heard back from mrrpbot aaaaa >_<,,: ${message}`);
});

flanbridge.on('error', console.error);

app.post('/upload', upload.single('file'), async (req, res) => { //file gets saved here, with upload.single
    let user = req.headers["x-user"];
    if (userInfo[findUserIndex(user)].filePath === `/home/sydney/Server/flanstore/files/${user}/` || (!userInfo[findUserIndex(user)].filePath)) {
    //if we're not using the normal file path, don't bother adding it to the file map :3
    //this checks both for the default file map, as well as if it's not defined

    let currentTime = new Date();
    let fileAddedDate = `${currentTime.getUTCMonth()+1}/${currentTime.getUTCDate()}/${currentTime.getUTCFullYear()}`; //uses MM/DD/YYYY, but this gets changed later with a setting~
    //once we have a valid upload, then we want to start messing with the fileMap~
    let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, {encoding: 'utf8'}));
    let stats = fs.statSync(`./files/${user}/${lastFileName}`); //since we've saved the file already, stats are here!! :D
    let fileSize = fileSizeString(stats.size);
    fileMap.push({
        filename: originalFileName,
        serverPath: lastFileName,
        dateAdded: fileAddedDate,
        fileSize: fileSize,
        rawFileSize: stats.size,
        timestampAdded: Date.parse(currentTime)}); //finally, we can save everything~
    updateMapFile(user, fileMap);

    res.send(`https://${user}.yuru.ca/${fileMap[fileMap.length-1].serverPath}`); //sends the url back, since sharex copies the response to clipboard~
  }
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

app.get('/userPfp', (req, res) => {
    let user = req.query.user;
    res.send({ "profileLink":userInfo[findUserIndex(user)].userPfp });
});

app.get('/readFilemap', (req, res) => {
    let apiKey = req.headers["authorization"];
    let user = req.headers["x-user"];
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let fileMap = JSON.parse(fs.readFileSync(`./files/${user}/filemap.json`, {encoding: 'utf8'}));
        if (!userInfo[findUserIndex(user)].dateFormat) {
            fileMap.forEach(file => {
                try {
                    file.dateAdded = `${file.dateAdded.split('/')[1]}/${file.dateAdded.split('/')[0]}/${file.dateAdded.split('/')[2]}`; //makes the date anne compliant. anne certification type shit
                } catch {
                    file.dateAdded = "not a valid date >_<;;";
                }
            });
        }
        res.send(fileMap);
    } else {
        res.send({"response":"could not verify api key >_<"});
    }
});

app.get('/', (req, res) => {
    res.redirect('https://flanstore.yuru.ca'); //redirects anyone who just goes to a base url :3 i think this is neat~
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

app.post('/accountapply', upload.single('file'), (req, res) => {
  let accountDetails = req.body; //already sent as a json, like the login :3
  //we do wanna support
  let salt = crypto.createHash('sha256').update(String(Math.random())).digest('hex'); //creates a unique salt for each user, pseudorandomly (not the best but whatever =w=)
  let passwordHash = crypto.createHash('sha256').update(accountDetails.password+salt).digest('hex');
  let apiKey = crypto.createHash('sha256').update(String(Math.random())).digest('hex'); //also pseudorandom >_<;;
  //also hi alice if you're reading this, and i'm sorry if this code sucks >_<
  //paws at you
  //paws at you
  //paws at you
  //paws at you

  let mrrpSend = {
    "type":"userAdd",
    "userDiscord":accountDetails.discord,
    "subdomain":accountDetails.subdomain,
    "salt":salt,
    "password":passwordHash,
    "apiKey":apiKey
  };

  for (let client of flanbridge.clients) { //should only be 1 client, but... sets are evil
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(mrrpSend)); //sends the user account info to the mrrpbot websocket
    }
  }
  res.send({ "response": "applied for account :3" });
});

app.post('/changeSettings', async (req, res) => {
    let apiKey = req.headers["authorization"];
    let user = req.headers["x-user"];
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let settingToChange = req.body;
        switch (settingToChange.changeSetting) { //for more settings later!! :D
            case "dateFormat": //true is MM/DD/YYYY, false is DD/MM/YYYY
                userInfo[findUserIndex(user)].dateFormat = settingToChange.dateFormat;
                break;
            }
        updateUserData();
        res.send({"response":"changed successfully~ :3"});
    } else {
        res.send({"response":"could not verify api key >_<"});
    }
});

app.get('/readPath', async (req, res) => {
    let apiKey = req.headers["authorization"];
    let user = req.headers["x-user"];
    let isValid = verifyApiRequest(user, apiKey);
    if (isValid) {
        let userIndex = findUserIndex(user);
        if (!userInfo[userIndex].filePath) {
          userInfo[userIndex].filePath = `/home/sydney/Server/flanstore/files/${user}/`;
          updateUserData();
        }
      res.send({ "path": userInfo[userIndex].filePath });
    }
});

app.post('/ls', async (req, res) => {
  let apiKey = req.headers["authorization"];
  let user = req.headers["x-user"];
  let isValid = verifyApiRequest(user, apiKey);
  if (isValid) {
    let userIndex = findUserIndex(user);
    if (userInfo[userIndex].isPrivileged) { //because these require extra permissions to do, we have to check for that too!! :3
      let searchContent = req.body.searchContent;
      if (searchContent === "default") {
        searchContent = `/home/sydney/Server/flanstore/files/${user}/`;
      }
      userInfo[userIndex].filePath = searchContent;
      updateUserData(); //whenever we read the user path again, it'll be updated :3
      if (searchContent.includes('~')) { //fs doesn't play nicely with tilda, so we have to fucking kill him (sorry oomfie)
        searchContent = searchContent.replace('~', '/home/sydney'); //should work on flandre, since the home folder is /home/sydney
      }

      fs.readdir(searchContent, (err, list) => {
        if (err) {
          res.send({ "response": "no such directory!! >_<;;" });
        } else {
          list = list.filter(item => !(/^\.\/|\.([^.\n\/])/g).test(item)); //removes items if they're .something or something.ext, but not just a plain string :3
          res.send(list);
        }
      });
    }
  }
});

app.get('/privilegeCheck', (req, res) => {
  //doesn't really need to be secure, so i'm not bothering checking here
  let user = req.headers["x-user"];
  if (userInfo[findUserIndex(user)].isPrivileged) {
    res.send({ "response": true });
  } else {
    res.send({ "response": false });
  }
});
