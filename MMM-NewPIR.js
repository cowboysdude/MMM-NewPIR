/******************
*  MMM_NewPIR v3  *
*  Bugsounet      *
******************/

Module.register("MMM-NewPIR", {
    requiresVersion: "2.13.0",
    defaults: {
      debug: false,
      notification: {
        userPresence: true,
        screenStatus: true
      },
      screen: {
        delay: 2 * 60 * 1000,
        turnOffDisplay: true,
        mode: 1,
        ecoMode: true,
        displayCounter: true,
        text: "Auto Turn Off Screen:",
        displayBar: true,
        displayStyle: "Text",
        governorSleeping: false,
        displayLastPresence: true,
        LastPresenceText: "Last Presence:",
        delayed: 0
      },
      touch: {
        useTouch: false,
        mode: 3
      },
      pir: {
        usePir: true,
        gpio: 21,
        reverseValue: false
      },
      governor: {
        useGovernor: false,
        sleeping: "powersave",
        working: "ondemand"
      },
      NPMCheck: {
        useChecker: true,
        delay: 10 * 60 * 1000,
        useAlert: true
      }
    },

    start: function () {
      mylog_ = function() {
        var context = "[NewPIR]"
        return Function.prototype.bind.call(console.log, console, context)
      }()

      mylog = function() {
        //do nothing
      }

      if (this.config.debug) mylog = mylog_
      this.sendSocketNotification("INIT", this.config)
      this.userPrensece = null
      this.lastPresence = null
      mylog("is now started!")
    },

    socketNotificationReceived: function (notification, payload) {
      switch(notification) {
      case "SCREEN_SHOWING":
        this.screenShowing()
        break
      case "SCREEN_HIDING":
        this.screenHiding()
        break
      case "SCREEN_TIMER":
        if (this.config.screen.displayStyle == "Text") {
          let counter = document.getElementById("NEWPIR_SCREEN_COUNTER")
          counter.textContent = payload
        }
        break
      case "SCREEN_BAR":
        if (this.config.screen.displayStyle == "Bar") {
          let bar = document.getElementById("NEWPIR_SCREEN_BAR")
          bar.value= this.config.screen.delay - payload
        }
        else if (this.config.screen.displayStyle != "Text") {
          let value = (100 - ((payload * 100) / this.config.screen.delay))/100
          let timeOut = moment(new Date(this.config.screen.delay-payload)).format("m:ss")
          this.bar.animate(value, {
            step: (state, bar) => {
              bar.path.setAttribute('stroke', state.color)
              bar.setText(this.config.screen.displayCounter ? timeOut : "")
              bar.text.style.color = state.color
            }
          })
        }
        break
      case "SCREEN_PRESENCE":
        if (this.config.notification.userPresence) this.sendNotification("USER_PRESENCE", payload ? true : false)
        if (payload) this.lastPresence = moment().format("LL H:mm")
        else this.userPresence = this.lastPresence
        if (this.userPresence && this.config.screen.displayLastPresence) {
          let presence= document.getElementById("NEWPIR_PRESENCE")
          presence.classList.remove("hidden")
		  presence.classList.add("bright")
          let userPresence= document.getElementById("NEWPIR_PRESENCE_DATE")
          userPresence.textContent= this.userPresence
        }
        break
      case "SCREEN_POWER":
        if (this.config.notification.screenStatus) {
          if (payload) this.sendNotification("SCREEN_ON")
          else this.sendNotification("SCREEN_OFF")
        }
        break
      case "NPM_UPDATE":
        if (payload && payload.length > 0) {
          if (this.config.NPMCheck.useAlert) {
            payload.forEach(npm => {
              this.sendNotification("SHOW_ALERT", {
                type: "notification" ,
                message: "[NPM] " + npm.library + " v" + npm.installed +" -> v" + npm.latest,
                title: this.translate("UPDATE_NOTIFICATION_MODULE", { MODULE_NAME: npm.module }),
                timer: this.config.NPMCheck.delay-2000
              })
            })
          }
          this.sendNotification("NPM_UPDATE", payload)
        }
        break
      }
    },

    notificationReceived: function (notification, payload) {
      switch(notification) {
        case "DOM_OBJECTS_CREATED":
          if (this.config.touch.useTouch) this.touchScreen(this.config.touch.mode)
          this.prepareBar()
          break
        case "USER_PRESENCE":
          if (payload == true) this.sendSocketNotification("WAKEUP")
          else this.sendSocketNotification("FORCE_END")
          break
        case "SCREEN_END":
          this.sendSocketNotification("FORCE_END")
          break
        case "SCREEN_WAKEUP":
          this.sendSocketNotification("WAKEUP")
          break
        case "SCREEN_LOCK":
          this.sendSocketNotification("LOCK")
          break
        case "SCREEN_UNLOCK":
          this.sendSocketNotification("UNLOCK")
          break
      }
    },

    getDom: function () {
      var dom = document.createElement("div")
      dom.id = "NEWPIR"

      if (this.config.screen.displayCounter || this.config.screen.displayBar) {
        /** Screen TimeOut Text **/
        var screen = document.createElement("div")
        screen.id = "NEWPIR_SCREEN"
        if (this.config.screen.displayStyle != "Text") screen.className = "hidden"
        var screenText = document.createElement("div")
        screenText.id = "NEWPIR_SCREEN_TEXT"
        screenText.textContent = this.config.screen.text
		screenText.classList.add("bright")
        screen.appendChild(screenText)
        var screenCounter = document.createElement("div")
        screenCounter.id = "NEWPIR_SCREEN_COUNTER"
        screenCounter.classList.add("bright")
        screenCounter.textContent = "--:--"
        screen.appendChild(screenCounter)

        /** Screen TimeOut Bar **/
        var bar = document.createElement("div")
        bar.id = "NEWPIR_BAR"
        if ((this.config.screen.displayStyle == "Text") || !this.config.screen.displayBar) bar.className = "hidden"
        var screenBar = document.createElement(this.config.screen.displayStyle == "Bar" ? "meter" : "div")
        screenBar.id = "NEWPIR_SCREEN_BAR"
        screenBar.classList.add(this.config.screen.displayStyle)
        if (this.config.screen.displayStyle == "Bar") {
          screenBar.value = 0
          screenBar.max= this.config.screen.delay
        }
        bar.appendChild(screenBar)
        dom.appendChild(screen)
        dom.appendChild(bar)
      }

      if (this.config.screen.displayLastPresence) {
        /** Last user Presence **/
        var presence = document.createElement("div")
        presence.id = "NEWPIR_PRESENCE"
        presence.className = "hidden"
        var presenceText = document.createElement("div")
        presenceText.id = "NEWPIR_PRESENCE_TEXT"
        presenceText.textContent = this.config.screen.LastPresenceText
        presence.appendChild(presenceText)
        var presenceDate = document.createElement("div")
        presenceDate.id = "NEWPIR_PRESENCE_DATE"
        presenceDate.classList.add("presence")
        presenceDate.textContent = "Loading ..."
        presence.appendChild(presenceDate)
        dom.appendChild(presence)
      }

      return dom
    },

    getStyles: function () {
      return ["MMM-NewPIR.css"]
    },

    getScripts: function () {
      return [
        "/modules/MMM-NewPIR/scripts/progressbar.js",
        "/modules/MMM-NewPIR/scripts/long-press-event.js"
      ]
    },

    prepareBar: function () {
      /** Prepare TimeOut Bar **/
      if ((this.config.screen.displayStyle == "Text") || (this.config.screen.displayStyle == "Bar") || (!this.config.screen.displayBar)) return
      this.bar = new ProgressBar[this.config.screen.displayStyle](document.getElementById('NEWPIR_SCREEN_BAR'), {
        strokeWidth: this.config.screen.displayStyle == "Line" ? 2 : 5,
        trailColor: '#1B1B1B',
        trailWidth: 1,
        easing: 'easeInOut',
        duration: 500,
        svgStyle: null,
        from: {color: '#FF0000'},
        to: {color: '#00FF00'},
        text: {
          style: {
            position: 'absolute',
            left: '50%',
            top: this.config.screen.displayStyle == "Line" ? "0" : "50%",
            padding: 0,
            margin: 0,
            transform: {
                prefix: true,
                value: 'translate(-50%, -50%)'
            }
          }
        }
      })
    },

    screenShowing: function() {
      MM.getModules().enumerate((module)=> {
        module.show(1000, {lockString: "NEWPIR_LOCK"})
      })
      mylog("Show All modules.")
    },

    screenHiding: function() {
      MM.getModules().enumerate((module)=> {
        module.hide(1000, {lockString: "NEWPIR_LOCK"})
      })
      mylog("Hide All modules.")
    },

    touchScreen: function (mode) {
      let clickCount = 0
      let clickTimer = null
      let NewPIR = document.getElementById("NEWPIR")

      switch (mode) {
        case 1:
          /** mode 1 **/
          window.addEventListener('click', () => {
            clickCount++
            if (clickCount === 1) {
              clickTimer = setTimeout(() => {
                clickCount = 0
                this.sendSocketNotification("WAKEUP")
              }, 400)
            } else if (clickCount === 2) {
              clearTimeout(clickTimer)
              clickCount = 0
              this.sendSocketNotification("FORCE_END")
            }
          }, false)
          break
        case 2:
          /** mode 2 **/
          NewPIR.addEventListener('click', () => {
            if (clickCount) return clickCount = 0
            if (!this.hidden) this.sendSocketNotification("WAKEUP")
          }, false)

          window.addEventListener('long-press', () => {
            clickCount = 1
            if (this.hidden) this.sendSocketNotification("WAKEUP")
            else this.sendSocketNotification("FORCE_END")
            clickTimer = setTimeout(() => { clickCount = 0 }, 400)
          }, false)
          break
        case 3:
          /** mode 3 **/
          NewPIR.addEventListener('click', () => {
            clickCount++
            if (clickCount === 1) {
              clickTimer = setTimeout(() => {
                clickCount = 0
                this.sendSocketNotification("WAKEUP")
              }, 400)
            } else if (clickCount === 2) {
              clearTimeout(clickTimer)
              clickCount = 0
              this.sendSocketNotification("FORCE_END")
            }
          }, false)

          window.addEventListener('click', () => {
            if (!this.hidden) return
            clickCount = 3
            this.sendSocketNotification("WAKEUP")
            clickTimer = setTimeout(() => { clickCount = 0 }, 400)
          }, false)
          break
      }
      if (!mode) mylog("Touch Screen Function disabled.")
      else mylog("Touch Screen Function added. [mode " + mode +"]")
    }
});
