// Express Server
const express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const path = require("path");
var multer = require("multer");
var upload = multer();
const app = express();
let _ = require("lodash");

// CRYPTO and CERTS
var fs = require("fs");
var https = require("https");
const crypto = require("crypto");
let servObj = {
  key: fs.readFileSync("./certs/server-key.pem").toString("ascii"),
};
let off1Obj = {
  key: fs.readFileSync("./certs/client/off1-crt.pem").toString("ascii"),
};
let dev1Obj = {
  key: fs.readFileSync("./certs/client/dev1-crt.pem").toString("ascii"),
};
let off2Obj = {
  key: fs.readFileSync("./certs/client/off2-crt.pem").toString("ascii"),
};
let dev2Obj = {
  key: fs.readFileSync("./certs/client/dev2-crt.pem").toString("ascii"),
};
let certBase = {
  "DD5529B2-992C-499A-B261-CCDE1E7174E8": {
    offCert: off1Obj,
    devCert: dev1Obj,
  },
  "FD497658-5F7F-4334-808D-63F2BA3B1242": {
    offCert: off2Obj,
    devCert: dev2Obj,
  },
};
// DB
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
const db = low(adapter);
const shortid = require("shortid");
const HASHTYPE = "sha256";

db.defaults({ devices: [], metadata: [] }).write();

// Express Middleware
app.use(express.static(path.join(__dirname, "build")));
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(upload.array());
// app.use(
//   fileUpload({
//     createParentPath: true,
//   })
// );
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
// Server API Routes
app.get("/ping", (req, res) => {
  return res.send("pong!");
});

app.post("/uploadVideo", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      //   res.json({
      //     status: false,
      //     message: "no hash. is this metadata",
      //   });
      res.json("NO FILES");
    } else {
      let body = JSON.parse(JSON.stringify(req.body));
      let { offCert, devCert } = certBase[body.deviceID];
      if (body && "offSig" in body && "devSig" in body) {
        let { offSig, devSig } = body;
        delete body["offSig"];
        delete body["devSig"];
        if (
          checkSig(body, offSig, offCert) &&
          checkSig(body, devSig, devCert)
        ) {
          console.log("SIGS MATCHED");
        }
      }
      //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
      let video = req.file;
      //check hash
      let newHash = crypto
        .createHash(HASHTYPE)
        .update(video.buffer)
        .digest("hex");
      //DEBUG prints
      if (
        crypto.timingSafeEqual(Buffer.from(newHash), Buffer.from(body.hash))
      ) {
        console.log("they are equal");
        body.hashMatch = true;
      } else {
        console.log("not equal");
        body.hashMatch = false;
      }
      //Use the mv() method to place the file in upload directory (i.e. "uploads")

      const sign = crypto.createSign("RSA-SHA256");
      sign.write(JSON.stringify(body));
      sign.end();
      const signature = sign.sign(servObj, "hex");

      res.json({ status: true, signature });

      body.recieveTime = Date();
      body.path = "file:///" + __dirname + "/uploads/" + video.originalname;
      fs.writeFile("./uploads/" + video.originalname, video.buffer, (err) => {
        if (err) throw err;
        console.log("data saved successfuly");
      });
      db.get("metadata").push(body).write();
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

let checkSig = (data, sig, pub) => {
  const verify = crypto.createVerify("RSA-SHA256");
  verify.write(JSON.stringify(data));
  verify.end();
  return verify.verify(pub, sig, "hex");
};
app.post("/uploadMetaData", async (req, res) => {
  try {
    let body = req.body;
    let { offCert, devCert } = certBase[body.metadata.deviceID];
    console.log("this pub key", offCert);
    if (body && "offSig" in body && "devSig" in body) {
      if (
        checkSig(body.metadata, body.offSig, offCert) &&
        checkSig(body.metadata, body.devSig, devCert)
      ) {
        console.log("SIGS MATCHED");
        const sign = crypto.createSign("RSA-SHA256");
        sign.write(JSON.stringify(body.metadata));
        sign.end();
        const signature = sign.sign(servObj, "hex");

        res.json({ status: true, signature });
        body.metadata.recieveTime = Date();
        body.metadata.hashMatch = null;
        body.metadata.path = "";
        db.get("metadata").push(body.metadata).write();
      } else {
        console.log("HASHES FAILED TO MATCH");
        console.log(body);
      }
    }
  } catch (err) {
    res.status(500).send(err);
  }
});
app.get("/data", async (req, res) => {
  res.send({
    metadata: db.get("metadata"),
  });
});

app.get("/offdev1", async (req, res) => {
  res.send({});
});
app.get("/offdev2", async (req, res) => {
  res.send({});
});
app.listen(process.env.PORT || 8080);
/**
 * Enable the code below for client certificates
 * make sure that the two bools are true
 */

// var options = {
//   key: fs.readFileSync("./certs/server-key.pem"),
//   cert: fs.readFileSync("./certs/server-crt.pem"),
//   ca: fs.readFileSync("./certs/ca-crt.pem"),
//   requestCert: false,
//   rejectUnauthorized: false
// };

// https.createServer(options, app).listen(process.env.PORT || 8080);
// .listen(4433);

const folder = "./uploads";
const moveTo = "/tmp/moveto";

// Make an async function that gets executed immediately
setInterval(() => {
  (async () => {
    // Our starting point
    try {
      // Get the files as an array
      const files = await fs.promises.readdir(folder);

      // Loop them all with the new for...of
      for (const file of files) {
        // Get the full paths
        const fromPath = path.join(folder, file);

        const hash = crypto.createHash("sha256");
        const input = fs.createReadStream(fromPath);
        // eslint-disable-next-line no-loop-func
        input.on("readable", () => {
          const data = input.read();
          if (data) hash.update(data);
          else {
            let h = hash.digest("hex");
            // console.log("the hash is ");
            // console.log(h);
            // console.log(
            //   "updating hash",
            //   db.get("metadata").find({ hash: h, hashMatch: false }).value()
            // );
            db.get("metadata")
              .find({ hash: h, hashMatch: null })
              .assign({
                hashMatch: true,
                path: "file:///" + path.resolve(fromPath),
              })
              .write();
            // console.log("file:///" + path.resolve(fromPath));
          }
        });
      }
    } catch (e) {
      console.error("We've thrown! Whoops!", e);
    }
  })();
}, 5000);
