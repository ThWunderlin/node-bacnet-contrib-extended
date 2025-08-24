module.exports = function(RED) {



  

  function ChangeOfValue(config) {
      RED.nodes.createNode(this,config);


      const Bacnet = require('node-bacnet')





      this.name = config.name;

      this.address = config.address;

      this.inputType = config.inputType;

      this.bacnetId = config.bacnetId;
      
      this.COVtimeout = config.COVtimeout;



      const node = this;
      
      var activeSubscriptions = [];
      var subscriptionTimeout = null;
      var bacnetClient = null;

      node.status({ fill: 'green', shape: 'dot', text: 'ready' })


      





      node.on('input', function(msg) {

        if(msg.action === "unsubscribe" || msg.action === "stop"){
          console.log("Stopping all COV subscriptions...");
          
          if(subscriptionTimeout){
            clearTimeout(subscriptionTimeout);
            subscriptionTimeout = null;
          }
          
          if(bacnetClient && activeSubscriptions.length > 0){
            activeSubscriptions.forEach((subscription, index) => {
              setTimeout(() => {
                bacnetClient.unsubscribeCov(subscription.address, {type: subscription.type, instance: subscription.instance}, (err) => {
                  if(err){
                    console.log('unsubscribeCOV error for object ' + subscription.type + ':' + subscription.instance + ' -> ', err);
                  }
                  else{
                    console.log('Successfully unsubscribed from COV for object ' + subscription.type + ':' + subscription.instance);
                  }
                });
              }, index * 100);
            });
          }
          
          activeSubscriptions = [];
          
          if(bacnetClient){
            try{
              bacnetClient.close();
            } catch(e){
              console.log("Error closing bacnet client: ", e);
            }
            bacnetClient = null;
          }
          
          node.status({ fill: 'red', shape: 'dot', text: 'stopped' });
          
          msg.payload = "COV subscriptions stopped";
          node.send(msg);
          return;
        }

        var address = msg.address || node.address;
        var COVtimeout = Number(msg.COVtimeout || node.COVtimeout);
        
        var covArray = msg.covArray;
        
        if(!covArray || !Array.isArray(covArray) || covArray.length === 0){
          var inputType = Number(msg.inputType || node.inputType);
          var bacnetId = Number(msg.bacnetId || node.bacnetId);
          covArray = [{type: inputType, instance: bacnetId}];
        }

        if(msg.communicationPort == "" || msg.communicationPort == null){
          var randNum = Math.floor(Math.random() * 7100);
          msg.communicationPort = 47808 + randNum;
        }

        if(msg.interface == "" || msg.interface == null){
          msg.interface = "0.0.0.0";
        }

        if(msg.broadcastAddress == "" || msg.broadcastAddress == null){
          msg.broadcastAddress = "255.255.255.255";
        }

        if(msg.apduTimeout == "" || msg.apduTimeout == null){
          msg.apduTimeout = 7000;
        }

        if(msg.reuseAddr == "" || msg.reuseAddr == null){
          msg.reuseAddr = true;
        }

        if(address == "" || address == null){
          msg.payload = "address is invalid";
          node.send(msg);
          return;
        }

        if(bacnetClient){
          try{
            bacnetClient.close();
          } catch(e){
            console.log("Error closing existing bacnet client: ", e);
          }
        }

        console.log("address ---> " + address);
        console.log("covArray ---> ", covArray);

        bacnetClient = new Bacnet({ 
          port: msg.communicationPort,
          interface: msg.interface,
          broadcastAddress: msg.broadcastAddress,
          apduTimeout: msg.apduTimeout,
          reuseAddr: msg.reuseAddr                     
         });

        bacnetClient.on('covNotifyUnconfirmed', (data) => {
          console.log('000 Received COV: ' + data);
          var str = JSON.stringify(data)
          console.log('111 Received COV: ' + str);
          var str2 = data.payload.values;
          console.log('333 Received COV: ' + str2);
          node.send(data);
        });

        function SubcribeCOVArray(address, covArray, COVtimeout){
          covArray.forEach((covObject, index) => {
            setTimeout(() => {
              bacnetClient.subscribeCov(address, {type: covObject.type, instance: covObject.instance}, 85, false, false, 0, (err) => {
                if(err){
                  console.log('subscribeCOV error for object ' + covObject.type + ':' + covObject.instance + ' -> ', err);
                }
                else{
                  console.log('Successfully subscribed to COV for object ' + covObject.type + ':' + covObject.instance);
                  activeSubscriptions.push({address: address, type: covObject.type, instance: covObject.instance});
                }
              });
            }, index * 100);
          });
          
          subscriptionTimeout = setTimeout(() => {
            SubcribeCOVArray(address, covArray, COVtimeout);
          }, COVtimeout);
        }

        activeSubscriptions = [];
        SubcribeCOVArray(address, covArray, COVtimeout);
        node.status({ fill: 'green', shape: 'dot', text: 'subscribed' });

      });




      



      



   

















      


      node.on('close', function() {
        console.log("Node closing, cleaning up subscriptions...");
        
        if(subscriptionTimeout){
          clearTimeout(subscriptionTimeout);
        }
        
        if(bacnetClient){
          try{
            bacnetClient.close();
          } catch(e){
            console.log("Error closing bacnet client on node close: ", e);
          }
        }
      });

  }
  RED.nodes.registerType("change-of-value", ChangeOfValue);











    



}

