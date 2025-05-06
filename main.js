const endpoint = 'https://api.flanstore.yuru.ca';

//logic to control login functionality, we check if we're logged in below :3
var loginButton = document.getElementById('login-button');
async function attemptLogin() {
  let subdomainInput = document.getElementById('subdomain').value;
  let passwordInput = document.getElementById('password').value;

  let passwordAttempt = await fetch(`${endpoint}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subdomain: subdomainInput, password: passwordInput }),
  });
  passwordAttempt = await passwordAttempt.json();

  if (passwordAttempt.loginStatus == true) {
      localStorage.setItem("key", passwordAttempt.key); //i fucking love cross site scripting ^.^
      localStorage.setItem("user", subdomainInput);
      window.location.href = "./index.html"; //goes to the main page, now with your key stored :3
  } else {
      try {
          document.getElementById("login-fail").textContent = "incorrect login, please try again >_<;;"; //if the failed login text already exists, let's not write over it~
      } catch {
          loginButton.insertAdjacentHTML("afterend", `<br><span id="login-fail">incorrect login, please try again >_<;;</span>`);
      }
  }
}
loginButton.addEventListener("click", async() => { await attemptLogin(); });
document.getElementById('password').addEventListener("keypress", async function (event) {
  if (event.key === 'Enter') {
    await attemptLogin();
  }
});

let appliedForAccount = false;
let applyButton = document.getElementById('apply-button');
async function applyForAccount() {
  if (!appliedForAccount) {
    let subdomainInput = document.getElementById('application-subdomain').value;
    let passwordInput = document.getElementById('application-password').value;
    let discord = document.getElementById('application-discord').value;
  
    let response = await fetch(`${endpoint}/accountapply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subdomain: subdomainInput, password: passwordInput, discord: discord }),
    });
    response = await response.json();
  
    applyButton.insertAdjacentHTML("afterend", `<br><span>${response.response}</span>`);
    appliedForAccount = true; //if you've already applied, you can't spam the button~
  }
}

function sortTable(table, type) {
  if (descending) {
    switch (type) {
      case "text":
        table.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case "date":
        table.sort((a, b) => a.timestampAdded - b.timestampAdded);
        break;
      case "size":
        table.sort((a, b) => a.rawFileSize - b.rawFileSize);
        break;
    }
  } else {
    switch (type) {
      case "text":
        table.sort((a, b) => b.filename.localeCompare(a.filename));
        break;
      case "date":
        table.sort((a, b) => b.timestampAdded - a.timestampAdded);
        break;
      case "size":
        table.sort((a, b) => b.rawFileSize - a.rawFileSize);
        break;
    }
  }
  return table;
}

var loginArea = document.getElementById('log-in-area');
var accountApplyArea = document.getElementById('account-apply-area');
document.getElementById('account-apply-text').addEventListener("click", () => {
  loginArea.style.display = "none";
  accountApplyArea.style.display = "grid";
});
document.getElementById('back-to-login').addEventListener("click", () => {
  loginArea.style.display = "grid";
  accountApplyArea.style.display = "none";
})

applyButton.addEventListener("click", async() => { await applyForAccount(); });
document.getElementById('application-discord').addEventListener("keypress", async function (event) {
  if (event.key === 'Enter') {
    await applyForAccount();
  }
});

if (!localStorage.getItem("key")) { //if we don't have a key yet, then we wanna log in~
  document.getElementById('not-logged-in').style.display = "flex";
} else { //if we do have a key, then everything else can run!!
  const currentDomain = `${localStorage.getItem("user")}.yuru.ca`;
  document.getElementById('page-url').innerText = currentDomain;
  
  //document.getElementById('url-area').insertAdjacentHTML('beforeend', `<span>uploaded file ${e.dataTransfer.files[0].name} to <a href=https://${currentDomain}/${fileName}>https://${currentDomain}/${fileName}</a></span><br>`);
  var uploadArea = document.getElementById('upload-area');
  
  document.getElementById('cancel-upload').addEventListener("click", () => {
    uploadArea.style.display = 'none';
  });
  document.getElementById('upload-button').addEventListener("click", () => {
    uploadArea.style.display = 'flex';
  });

  var fileMap;
  async function fillTable(isSearchMap, searchMap) {
    let tableFileMap
    if (!isSearchMap) {
      try {
        fileMap = await fetch(`${endpoint}/readFilemap`, {
          method: 'GET',
          headers: {
            'Authorization': localStorage.getItem("key"),
            'X-User': localStorage.getItem("user")
          },
        });
      } catch (err) {
        console.log(`something went wrong when fetching from our endpoint >.<: ${err.message}`);
      }
      fileMap = await fileMap.json(); //this puts it in the global fileMap, but for what we want to do, we need to put this in a temp filemap to work with as well
      tableFileMap = fileMap;
    } else {
      tableFileMap = searchMap;
    }
    
    let tableHtml = '';
    for (let i = 0; i < tableFileMap.length; i++) {
      let tableClass;
      if (i%2 == 0) {
        tableClass = 'table-element-odd';
      } else {
        tableClass = 'table-element-even';
      }

      tableHtml = tableHtml+`<tr>
              <td class="${tableClass}">
                  <span class="filename">${tableFileMap[i].filename}</span>
              </td>
              <td class="${tableClass}">${tableFileMap[i].dateAdded}</td>
              <td class="${tableClass}">${tableFileMap[i].fileSize}</td>
              <td style="border-right: none; display: flex; justify-content: space-between" class="${tableClass}">
                <a href=http://${currentDomain}/${tableFileMap[i].serverPath}>${tableFileMap[i].serverPath}</a>
                <div>
                  <i class="fa fa-copy" id="copy-${i}" style="margin-right: 2px; cursor: pointer;"></i>
                  <i class="fa fa-trash-o" id="trash-can-${i}" style="margin-right: 2px; cursor: pointer;"></i>
                </div>
              </td>
            </tr>`
    }
    document.getElementById('table-fill').innerHTML = '';
    document.getElementById('table-fill').innerHTML = tableHtml;
  
    for (let i = 0; i < tableFileMap.length; i++) {
      document.getElementById('trash-can-'+i).addEventListener("click", async() => {
        await fetch(`${endpoint}/deleteFile`, {
          method: 'POST',
          headers: {
            'Authorization': localStorage.getItem("key"),
            'X-User': localStorage.getItem("user"),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileToDelete: i }),
        });
        location.reload(); //get reloaded idiot
      });

      document.getElementById('copy-'+i).addEventListener("click", async() => {
        navigator.clipboard.writeText(`https://${currentDomain}/${tableFileMap[i].serverPath}`); //copies the whole link to clipboard
        document.getElementById('alert-area').innerHTML = `<div class="copy-alert"><h3>copied <a href="https://${currentDomain}/${tableFileMap[i].serverPath}">https://${currentDomain}/${tableFileMap[i].serverPath}</a> to clipboard! >w<</h3></div>`;
      });
    }
  }
  
  window.addEventListener('dragover', () => {
    uploadArea.style.display = 'flex';
  });
  
  document.getElementById('logout').addEventListener("click", () => {
    localStorage.clear(); //clears local storage, wiping the user and key :3
    location.reload(); //get reloaded idiot
  });

  var searchBar = document.getElementById('search-input');
  searchBar.addEventListener("keydown", () => {
    let searchQuery = searchBar.value;
    let searchFileMap = [];
    fileMap.forEach(file => {
      if (file.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
        searchFileMap.push(file); //adds it to the temp filemap that we use for searches
      }
    });
    fillTable(true, searchFileMap); //fills the table, but uses this temp filemap
  });

  var settingsIcon = document.getElementById('settings');
  var newSettingsIcon = document.getElementById('new-settings');
  var settingsOverlay = document.getElementById('settings-section');
  var dateCheckBox = document.getElementById('date-check');
  settingsIcon.addEventListener("click", () => {
    settingsIcon.style.display = "none"; //getting rid of the original settings icon in the background (unfortunately this is the best way i thought to do this >.<)
    settingsOverlay.style.display = "block";
  });
  newSettingsIcon.addEventListener("click", () => {
    settingsOverlay.style.display = "none"; //just closes out of the settings menu :3
    settingsIcon.style.display = "block"; //don't forget to bring the old guy back~
  });
  dateCheckBox.addEventListener("change", async() => {
    console.log(dateCheckBox.checked);
    await fetch(`${endpoint}/changeSettings`, { //first, let's change the settings - then we can refil the table with that function :3
      method: 'POST',
      headers: {
        'Authorization': localStorage.getItem("key"),
        'X-User': localStorage.getItem("user"),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "changeSetting":"dateFormat", "dateFormat":dateCheckBox.checked }) //will change this for each setting later, but for now we just have this~
    });
    fillTable(false); //if we have something searched and we check this box, won't work for now, but oh well :p
  });

  let tableElements = [ "file-name", "date-added", "size", "file-url" ];
  let sortCategories = [ "text", "date", "size", "text" ];
  var descending = true;
  for (let i = 0; i < tableElements.length; i++) {
    let curElement = document.getElementById(tableElements[i]);
    let arrow = document.getElementById(`${tableElements[i]}-arrow`);
    curElement.addEventListener("mouseover", () => {
      arrow.style.display = "contents";
    });
    curElement.addEventListener("mouseleave", () => {
      arrow.style.display = "none";
    });
    
    curElement.addEventListener("click", () => { 
      if (descending) {
        arrow.textContent = "▼";
        descending = false; 
      } else {
        arrow.textContent = "▲";
        descending = true;
      }
      let sortedTable = sortTable(fileMap, sortCategories[i]); 
      fillTable(true, sortedTable);
    });
  }
  
  /* preventing default drop actions */
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { //i hate this but it works for now
      uploadArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
  });
  
  //handles drag/drop uploads, still reloads for now but i'll fix that later~
  uploadArea.addEventListener("drop", async (e) => {
      let file = e.dataTransfer.files[0];
      let imageForm = new FormData();
      imageForm.append('file', file);
  
      await fetch(`${endpoint}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': localStorage.getItem("key"),
          'X-User': localStorage.getItem("user")
        },
        body: imageForm,
      });
      location.reload(); //forcefully reloads eheehe
  });
  
  //handles uploads with the file picker (formSubmit), reloads no matter what happens
  document.getElementById('file-submit-form').addEventListener('submit', async (e) => {
    let image = new FormData(e.target);
    await fetch(`${endpoint}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': localStorage.getItem("key"),
        'X-User': localStorage.getItem("user")
      },
      body: image,
    });
    /* page will reload after this, due to how forms and html and browser shenanagins interact. 
    * i tried everything to try to prevent this, but it seems like it's MURI */
    location.reload(); //actually nvm. it doesn't reload in prod, but i actually do like this functionality :3
  });
  
  (async () => {
    var userPfp = document.getElementById('user-pfp');
    var pfpLink = await fetch(`${endpoint}/userPfp?user=${localStorage.getItem("user")}`);
    pfpLink = await pfpLink.json();
    userPfp.src = pfpLink.profileLink;
    userPfp.alt = `${localStorage.getItem("user")}'s pfp`;

    fillTable(false);
  })();
}
