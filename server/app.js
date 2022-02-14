const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const lightwallet = require('eth-lightwallet');
const dbService = require('./dbService');

dotenv.config();

const keystoreModule = lightwallet.keystore;
const db = dbService.getDbServiceInstance();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended : false }));

// create a new user
app.post('/user', async (request, response) => {
  console.log("/user POST is called");
  const { username, password } = request.body;

  if (!username || !password) throw "Please pass both username and password";
  
  // TODO @lkim | HOW DO YOU KNOW THE DUPLICATE USER IS FOUND?
  const foundUser = await db.searchByName(username);
    
  if (foundUser.length) {
    return response.json({ data: foundUser[0]});
  }

  // Create a new user
  try {
    // 1. Generate a random mnemonic
    const seedPhrase = keystoreModule.generateRandomSeed();

    // 2. Generate password and crypto address by using KeyStore Module
    keystoreModule.createVault({
      password, 
      seedPhrase,
      hdPathString: "m/44'/60'/0'/0",
    }, (err, ks) => {
      if (err) throw err;

      ks.keyFromPassword(password, async (err, pwDerivedKey) => {
        if (err) throw err;

        ks.generateNewAddress(pwDerivedKey);
        
        const targetIndex = 0;
        const address = ks.getAddresses()[targetIndex];
        const privateKey = ks.encPrivKeys[address.split('0x')[1]].key;

        let newUser = {};
        Object.assign(newUser, {
          name: username,
          password, 
          address,
          privateKey
        });

        const result = await db.insertNewUser(newUser);
        
        return response.json({ data: result });
      })
    });
  } catch (err) {
    console.log(err);
  }
});

// create
app.post('/', (request, response) => {
    const { name } = request.body;
    const db = dbService.getDbServiceInstance();
    
    const result = db.insertNewName(name);

    result
    .then(data => response.json({ data: data}))
    .catch(err => console.log(err));
});

// read
app.get('/getAll', (request, response) => {
    const db = dbService.getDbServiceInstance();

    const result = db.getAllData();
    
    result
    .then(data => response.json({data : data}))
    .catch(err => console.log(err));
})

// update
app.patch('/update', (request, response) => {
    const { id, name } = request.body;
    const db = dbService.getDbServiceInstance();

    const result = db.updateNameById(id, name);
    
    result
    .then(data => response.json({success : data}))
    .catch(err => console.log(err));
});

// delete
app.delete('/delete/:id', (request, response) => {
    const { id } = request.params;
    const db = dbService.getDbServiceInstance();

    const result = db.deleteRowById(id);
    
    result
    .then(data => response.json({success : data}))
    .catch(err => console.log(err));
});

app.get('/search/:name', (request, response) => {
    const { name } = request.params;
    const db = dbService.getDbServiceInstance();

    const result = db.searchByName(name);
    
    result
    .then(data => response.json({data : data}))
    .catch(err => console.log(err));
})

app.listen(process.env.PORT, () => console.log(`app is running at ${process.env.PORT}`));
