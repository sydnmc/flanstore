const fs = require("fs");
const express = require('express');

const app = express();
const port = 1414; //not as bouba lovey >_< but we need a different port,,

app.listen(port, () => {
    console.log(`flanstore file server - port ${port}~`);
});

app.get('/:fileid', (req, res) => {
  let fileId = req.params.fileid;
  let subdomain = req.hostname.split('.')[0];
  let fileMap = JSON.parse(fs.readFileSync(`./files/${subdomain}/filemap.json`, {encoding: 'utf8'}));
  let originalFileIndex = fileMap.findIndex(file => file.serverPath === fileId);

  if (originalFileIndex === -1) {
    res.status(500).send(`couldn't find file on server >_<;; `);
  }

  res.setHeader('Content-Disposition', `inline; filename="${fileMap[originalFileIndex].filename}"`);
  res.sendFile(`./files/${subdomain}/${fileId}`, { root: '.' });
});
