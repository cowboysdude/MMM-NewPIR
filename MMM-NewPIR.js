/******************
*  MMM_NewPIR v2  *
*  Bugsounet      *
******************/

Module.register("MMM-NewPIR", {
    defaults: {
      useSensor: true,
      sensorPin: 21,
      delay: 60 * 1000,
      turnOffDisplay: true,
      ecoMode: true,
      governor: "",
      eventWakeup: ["ASSISTANT_ACTIVATE" , "ASSISTANT_STANDBY"],
      debug: false
    },

    start: function () {
      this.counter = 0
      this.interval = null
      console.log("[NewPIR] is now started")
      this.config = this.configAssignment({}, this.defaults, this.config)
      this.helperConfig = {
          "sensor" : this.config.useSensor,
          "pin": this.config.sensorPin,
          "display": this.config.turnOffDisplay,
          "governor": this.config.governor,
          "debug": this.config.debug
      }
      this.sendSocketNotification("INIT", this.helperConfig)
    },

    socketNotificationReceived: function (notification, payload) {
      switch(notification) {
        case "RESET_COUNTER":
          this.resetCountdown()
          break
        case "PRESENCE":
          if (this.config.ecoMode) {
            if (payload) this.Showing()
            else this.Hiding()
          }
          this.sendNotification("USER_PRESENCE", payload)
          break
      }
    },

    notificationReceived: function (notification, payload) {
      switch(notification) {
        case "DOM_OBJECTS_CREATED":
          this.resetCountdown()
          this.sendSocketNotification("START")
          break
        case "USER_PRESENCE":
          if (payload == true) {
            this.resetCountdown()
            this.sendSocketNotification("WAKEUP")
          } else ForceExpire()
          break
        case "MODULE_DOM_CREATED":
        case "ALL_MODULES_STARTED":
        case "SHOW_ALERT":
        case "SHOW_ALERT":
        case "HIDE_ALERT":
        case "CLOCK_SECOND":
        case "CLOCK_MINUTE":
        case "CALENDAR_EVENTS":
        case "CURRENTWEATHER_DATA":
        case "ADD_FEED":
        case "NEWS_FEED_UPDATE":
        case "NEWS_FEED":
          // just ignore all standard notification
          break
        default :
          this.scanOtherNotification(notification)
          break
      }
    },

    scanOtherNotification: function (notification) {
      for (let [item, value] of Object.entries(this.config.eventWakeup)) {
        if (value == notification) {
		this.notificationReceived("USER_PRESENCE", true, this.name)
		console.log("[NewPIR] Event Wakeup: " + notification)
        }
      }
    },

    resetCountdown: function () {
      var self = this
      clearInterval(this.interval)
      this.counter = this.config.delay

      this.interval = setInterval(function () {
        self.counter -= 1000
        var counter = document.querySelector("#NEWPIR.counter")
	counter.textContent = new Date(self.counter).toUTCString().match(/\d{2}:\d{2}:\d{2}/)[0]

        if (self.counter <= 0) {
          self.sendSocketNotification("TIMER_EXPIRED")
          clearInterval(self.interval)
        }
      }, 1000)
    },

    ForceExpire: function(){
      clearInterval(this.interval)
      var counter = document.querySelector("#NEWPIR.counter")
      counter.textContent = "00:00:00"
      this.counter = 0
      this.sendSocketNotification("TIMER_EXPIRED")
    },

    Hiding: function() {
      var self = this
      MM.getModules().enumerate(function(module) {
        module.hide(1000, {lockString: self.identifier})
      })
      console.log("[NewPIR] Hide All modules.")
    },

    Showing: function(payload) {
      var self = this
      MM.getModules().enumerate(function(module) {
        module.show(1000, {lockString: self.identifier})
      })
      console.log("[NewPIR] Show All modules.")
    },

    getDom: function () {
      var wrapper = document.createElement("div")
      wrapper.id = "NEWPIR"
      if (!this.config.debug) wrapper.className = "hidden"
      wrapper.classList.add("counter")
      wrapper.textContent = "--:--:--"
      return wrapper
    },

    getStyles: function () {
      return ["MMM-NewPIR.css"]
    },

    getScripts: function () {
      return ["moment.js"]
    },

    configAssignment : function (result) {
    var stack = Array.prototype.slice.call(arguments, 1)
    var item
    var key
    while (stack.length) {
      item = stack.shift()
      for (key in item) {
        if (item.hasOwnProperty(key)) {
          if (typeof result[key] === "object" && result[key] && Object.prototype.toString.call(result[key]) !== "[object Array]" ) {
              if (typeof item[key] === "object" && item[key] !== null) {
                  result[key] = this.configAssignment({}, result[key], item[key])
              } else {
                result[key] = item[key]
              }
          } else {
            result[key] = item[key]
          }
        }
      }
    }
    return result
  },

});
