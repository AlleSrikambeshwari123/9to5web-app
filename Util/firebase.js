var admin = require("firebase-admin")
var firebaseConfig = require("../Res/firebase-config.json");

var firebase = admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: "https://imports-8f957.firebaseio.com"
});

exports.sendNotification = (customer, title, body) => {
  console.log("Sending Notification...\n" + title + '\n' + body);
  if (customer.fcmToken) {
    var payload = {
      token: customer.fcmToken.toString(),
      notification: {
        title: title,
        body: body
      }
    };
    console.log('payload',payload)
    var messaging = firebase.messaging();
    messaging.send(payload).then(result => {
      console.log("Notification Sent");
    }).catch(function (err) {
      console.log(err);
    });
  }
}