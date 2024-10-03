const ngrok = require("@ngrok/ngrok");
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const port = process.env.PORT;

// Daraja API CREDENTIALS
const username = process.env.USER;
const password = process.env.PASSWORD;
const authUrl = process.env.AUTHENTICATION_URL;
const processRequest = process.env.PROCESS_REQUEST;
const queryStatusUrl = process.env.QUERY_STATUS;
const transactionStatusUrl = process.env.TRANSACTION_STATUS;

const phone = Number(process.env.PHONE);

const credentials = btoa(`${username}:${password}`);

// (async function ngrockEndpoint() {
//   try {
//     console.log("Initializing ngrock endpoint");

//     const url = await ngrok.connect({
//       proto: "http",
//       authtoken: process.env.AUTHTOKEN_NGROCK,
//       hostname: "",
//       addr: port,
//     });

//     console.log(`Running on port ${port}`);
//     console.log("Ngrock tunnel initialized");
//   } catch (err) {
//     console.log(err);
//   }
// })();

// Create webserver
const app = express();

app.use("/static", express.static(path.join(__dirname, "public")));
// Generate a timestamp with the following function (format: YYYYMMDDHHmmss)
const generateTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

// Async function for generating AauthToken
const getToken = async function () {
  return await fetch(`${authUrl}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
  });
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let checkoutRequestID = "";

app.post("/initiatepush", async (req, res) => {
  try {
    const tokenData = await getToken();
    const tokenObject = await tokenData.json();
    const token = tokenObject.access_token;

    const initiateDaraja = async function () {
      return await fetch(`${processRequest}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          BusinessShortCode: 174379,
          Password:
            "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMTYwMjE2MTY1NjI3",
          Timestamp: "20160216165627",
          TransactionType: "CustomerPayBillOnline",
          Amount: 1,
          PartyA: phone,
          PartyB: 174379,
          PhoneNumber: phone,
          CallBackURL: "https://mydomain.com/pat",
          AccountReference: "Test",
          TransactionDesc: "Test",
        }),
      });
    };

    const paymentData = await initiateDaraja();
    const paymentObj = await paymentData.json();

    if (paymentObj.errorCode === "400.002.02")
      throw new Error(`${paymentObj.errorMessage}`);

    checkoutRequestID = paymentObj.CheckoutRequestID;
    res.json({ message: "Success", data: paymentObj });
  } catch (err) {
    console.error(err.message);
    res.status(404).send(err.message);
  }
});

app.post("/confirmpayment", async (req, res) => {
  try {
    // Generate token for auth
    const tokenData = await getToken();
    const tokenObject = await tokenData.json();
    const token = tokenObject.access_token;

    const getTransactionStatus = async function () {
      return await fetch(`${queryStatusUrl}`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          BusinessShortCode: 174379,
          Password:
            "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjQxMDAzMTgyMzQ0",
          Timestamp: "20241003182344",
          CheckoutRequestID: checkoutRequestID,
        }),
      });
    };

    const confirmData = await getTransactionStatus();
    const confirmObject = await confirmData.json();

    res.json({ message: "Success", data: confirmObject });
  } catch (err) {
    res.status(404).send("Failed performing API fetch");
  }
});

// app.post("/transaction-status", async (req, res) => {
//   try {
//     // Generate token for auth
//     const tokenData = await getToken();
//     const tokenObject = await tokenData.json();
//     const token = tokenObject.access_token;

//     const fetchTransactionStatus = async function () {
//       return await fetch(`${transactionStatusUrl}`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           Initiator: "testapiuser",
//           SecurityCredential:
//             "ClONZiMYBpc65lmpJ7nvnrDmUe0WvHvA5QbOsPjEo92B6IGFwDdvdeJIFL0kgwsEKWu6SQKG4ZZUxjC",
//           "Command ID": "TransactionStatusQuery",
//           "Transaction ID": "SJ33SR2RUR",
//           OriginatorConversationID: "AG_20190826_0000777ab7d848b9e721",
//           PartyA: 174379,
//           IdentifierType: "4",
//           ResultURL: "http://myservice:8080/transactionstatus/result",
//           QueueTimeOutURL: "http://myservice:8080/timeout",
//           Remarks: "OK",
//           Occasion: "OK",
//         }),
//       });
//     };

//     const statusData = await fetchTransactionStatus();
//     const statusObj = await statusData.json();

//     res.json({ message: "Success", data: statusObj });
//   } catch (err) {
//     res.status(404).send("Failed to fetch transaction status!");
//   }
// });

app.listen(port, "127.0.0.1", () => {
  console.log(`App listening on port ${port} `);
});
