// server.js
// where node app starts

// init project
const express = require("express")
const app = express()

//require the required modules
const bodyParser = require("body-parser")
const fs = require("fs")
const path = require("path")

//critical module for the ftp to work seamlessly
const ftp = require("zos-node-accessor")
const ftpClient = new ftp()

const port = process.env.PORT || 9001

//mount static middleware
app.use(express.static(`${__dirname}/public`))

//mount body-parser middleware
app.use(bodyParser.urlencoded({ extended: false }))

//set the view engine to ejs
app.set('views', `${__dirname}/views`)
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'ejs')

//create event emitter objects
const events = require("events")
var emiter = new events.EventEmitter()
var host
var user
var pwd
var outrsfers = []
var totalEvents = 0
var failure

//routes
app.route("/")
    .get((req, resp) => {
        //resp.sendFile(`${__dirname}/views/index.html`)

        if (!failure) {
            host = ""
            user = ""
            pwd = ""
        }
    
        resp.render("index.html", 
            {   
                machine: host, 
                userid: user,
                pswd: pwd,
                outrsfers: outrsfers,
                failure: failure
            }
        )
        
        //resp.end()
    })
app.route("/zftp")
    .post((req, resp) => {
       
        let [machine, userid, pswd, transfers] = parseParser(req.body)

        host = machine
        user = userid
        pwd = pswd

        //remove all event listeners if exists
        if (emiter === null || emiter === undefined)  {
            //do nothing
        } else {
            emiter = emiter.removeAllListeners(`transfer`)
            emiter = emiter.removeAllListeners(`done`)
        }

        //initialize var/global variables
        outrsfers = []
        totalEvents = 0
        failure = false

        //call performFTP function to execute the transfers
        performFTP(machine, userid, pswd, transfers) 

        //render the html after completion or failure of all the initiated transfers
        emiter.on("done", (outrsfers) => {
            //resp.redirect("/zftpstats")
            resp.render("zftpstatus.html", {
                outrsfers: outrsfers,
                failure: failure
            })
            //resp.end()
        })


    })

app.route("/zftpstats")
    .get((req, resp) => {
        resp.render("zftpstatus.html", {outrsfers: outrsfers, failure: failure})
        //resp.end()

    })
    .post((req, resp) => {
        resp.redirect("/")
        //resp.end()

    })

//function to create required objects based on the posted form
var parseParser = (form) => {

    let machine = form["machine-input"]
    let userid = form["userid"]
    let pswd = form["pswd"]

    let tkeys = Object.keys(form).filter((elem) => elem.startsWith("trsfrno"))
    let noOfTrsfrs = tkeys.map((elem) => parseInt(elem.replace("trsfrno","")))

    let transfers = []

    noOfTrsfrs.forEach((idx) => {

        let transferObj = {}
        let trsfrno = "trsfrno" + idx.toString()
        let ftpverb = "ftpverb-radio" + idx.toString()
        let ftpfmt = "ftpformat-radio" + idx.toString()
        let dsn = "dsn" + idx.toString()
        let filename = "filename" + idx.toString()
        let lrecl = "lrecl" + idx.toString()
        transferObj["trsfrno"] = form[trsfrno]
        transferObj["ftpverb"] = form[ftpverb]
        transferObj["ftpfmt"] = form[ftpfmt]
        transferObj["dsn"] = form[dsn]
        transferObj["filename"] = form[filename]
        transferObj["lrecl"] = form[lrecl]
        transfers.push(transferObj)
    }) 
    return [machine, userid, pswd, transfers]
}

//function to execute when there are no connection failures
var branch1 = (trsfr, connection) => {

    switch (trsfr["ftpverb"]) {
        case "receive":
            getStream(connection, trsfr)
            break
        case "send":
            putStream(connection, trsfr)
            break
    }

    return
        
}

//function to execute when there are any connection failures
let branch2 = (trsfr) => {
    
    let source, dest
    if (trsfr.ftpverb === "receive") {
        source = trsfr.dsn
        dest = trsfr.filename
    } else if (trsfr.ftpverb === "send") {
        source = trsfr.filename
        dest = trsfr.dsn
    }
    let outobj = {
        "trsfrno": trsfr.trsfrno,
        "verb": trsfr.ftpverb,
        "fmt": trsfr.ftpfmt,
        "source": source,
        "dest": dest,
        "lrecl": trsfr.lrecl,
        "status": "failure",
        "message": `Incorrect user credentials`
    }
    outrsfers.push(outobj)
    failure = true
    emiter.emit(`transfer`, 1)

    return

}

//function to perform the data transfer
let performFTP = (machine, userid, pswd, transfers) =>  {

    emiter.on(`transfer`, (count) => {
        totalEvents = totalEvents + count
        if (totalEvents == transfers.length) {
            emiter.emit("done", outrsfers)
        }
    })

    ftpClient.connect({ host: machine, user: userid, password: pswd })
        .then((connection) => {
            console.log("connection to host successful")
            transfers.forEach((trsfr) => {
                branch1(trsfr, connection)
            })
        })
        .catch((err) => {
            console.log(err)
            transfers.forEach((trsfr) => {
                branch2(trsfr)
            })

        })

    return
}

//function to get data from mainframe
var getStream = (connection, trsfr) => {

    let dsn = `'${trsfr["dsn"]}'`
    let dataType
    if (trsfr["ftpfmt"] === "text") {
        dataType = "ascii"
    } else  {
        dataType = "binary"
    }

    connection.getDataset(dsn, dataType, true)
        .then((readStream) => {

            //create write stream and then pipe it to readstream
            let writeStream = fs.createWriteStream(trsfr["filename"])
            readStream.pipe(writeStream)

            readStream.on("close", () => {
                let fsize = readStream.bytesRead
                let outobj = {
                    "trsfrno": trsfr.trsfrno,
                    "verb": trsfr.ftpverb,
                    "fmt": trsfr.ftpfmt,
                    "source": trsfr.dsn,
                    "dest": trsfr.filename,
                    "lrecl": trsfr.lrecl,
                    "status": "success",
                    "message": `${(fsize / 1024).toFixed(2)} KB transferred`
                }
                outrsfers.push(outobj)
                emiter.emit(`transfer`, 1)
                readStream.destroy()
                writeStream.end()
            })
            
            
        })
        .catch((err) => {
            console.log(err)
            let outobj = {
                "trsfrno": trsfr.trsfrno,
                "verb": trsfr.ftpverb,
                "fmt": trsfr.ftpfmt,
                "source": trsfr.dsn,
                "dest": trsfr.filename,
                "lrecl": trsfr.lrecl,
                "status": "failure",
                "message": `${err}`
            }
            outrsfers.push(outobj)
            failure = true
            emiter.emit(`transfer`, 1)
            readStream.destroy()
            writeStream.end()
        })

 
    return
}

//function to put data into mainframe
var putStream = (connection, trsfr) => {

    let dsn = `'${trsfr["dsn"]}'`
    let dataType
    if (trsfr["ftpfmt"] === "text") {
        dataType = "ascii"
    } else {
        dataType = "binary"
    }

    //create a readstream and then pass it to connection object
    var readStream = fs.createReadStream(trsfr["filename"])
    readStream.on("close", () => {
        let fsize = readStream.bytesRead
        let outobj = {
            "trsfrno": trsfr.trsfrno,
            "verb": trsfr.ftpverb,
            "fmt": trsfr.ftpfmt,
            "source": trsfr.filename,
            "dest": trsfr.dsn,
            "lrecl": trsfr.lrecl,
            "status": "success",
            "message": `${(fsize / 1024).toFixed(2)} KB transferred`
        }
        outrsfers.push(outobj)
        emiter.emit(`transfer`, 1)
        readStream.destroy()
    })
        .on("error", () => {
        let outobj = {
            "trsfrno": trsfr.trsfrno,
            "verb": trsfr.ftpverb,
            "fmt": trsfr.ftpfmt,
            "source": trsfr.filename,
            "dest": trsfr.dsn,
            "lrecl": trsfr.lrecl,
            "status": "failure",
            "message": `Source file missing`
        }
        outrsfers.push(outobj)
        failure = true
        emiter.emit(`transfer`, 1)
        readStream.destroy()
     })
     
    connection.uploadDataset(readStream, dsn, dataType)
        .then(() => {
            //do nothing
        })
        .catch((err) => {
            console.log(err)
            let outobj = {
                "trsfrno": trsfr.trsfrno,
                "verb": trsfr.ftpverb,
                "fmt": trsfr.ftpfmt,
                "source": trsfr.filename,
                "dest": trsfr.dsn,
                "lrecl": trsfr.lrecl,
                "status": "failure",
                "message": `${err}`
            }
            outrsfers.push(outobj)
            failure = true
            emiter.emit(`transfer`, 1)
            readStream.destroy()
        })


    /*
    fs.readFile(trsfr["filename"], (err, data) => {

        if (err) {
            throw err
        } else {
            connection.uploadDataset(data, dsn, dataType)
                .then(() => {
                    console.log("successfully transferred the data to mainframe")
                })
                .catch((err) => console.log(err))
        }

    })
    */

    return
}

// listen for requests :)
const listener = app.listen(port, () => {
    console.log(`Your app is listening on port ${port}`)
})
