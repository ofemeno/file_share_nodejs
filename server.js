require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const File = require("./models/File");
const bcrypt = require("bcrypt");

const PORT = process.env.PORT;

const app = express();

// makeMiddleware
app.use(express.urlencoded({ extended: true }));

// multer
const upload = multer({ dest: "uploads" });

mongoose.connect(process.env.DATABASE_URL);

// view engine
app.set("view engine", "ejs");

// upload routes
app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
  };

  if (req.body.password != null && req.body.password != "") {
    fileData.password = await bcrypt.hash(req.body.password, 10);
  }
  const file = await File.create(fileData);
  console.log(file);
  res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` });
});

app.route("/file/:id").get(handleDownload).post(handleDownload);

// home routes
app.get("/", (req, res) => {
  res.render("index");
});

// functions
//@ download function
async function handleDownload(req, res) {
  try {
    const file = await File.findById(req.params.id);

    // check for file
    if (!file) {
      throw new Error();
    }

    // check for protected download
    if (file.password != null) {
      // check if user entered a password
      if (req.body.password == null) {

        res.render("password");

        return;
      }
      console.log("compare password to file password");

      // compare password to file password
      if (!(await bcrypt.compare(req.body.password, file.password))) {

        // render error page
        res.render("password", { error: true });

        return;
      }

      // add download count
      file.downloadCount++;

      // save download count state
      await file.save();

      // download file
      res.download(file.path, file.originalName);
    }

    // add download count
    file.downloadCount++;

    // save download count state
    await file.save();

    // download file
    res.download(file.path, file.originalName);
  } catch (error) {
    res.status(404).send("File Not Found");
  }
}

app.listen(PORT, () => {
  console.log("upload server started " + PORT);
});
