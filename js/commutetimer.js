function supportLocalStorage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}
function now () {
  var d = new Date();
  return d.getTime();
}
function zero_pad_digit(val) {
  if (val < 10) {
    return "0" + val;
  } else {
    return "" + val;
  }
}
function format_time(date_obj) {
  return zero_pad_digit(date_obj.getHours()) + ":" +
         zero_pad_digit(date_obj.getMinutes()) + ":" +
         zero_pad_digit(date_obj.getSeconds());
}

function format_difference(msec_ts1, msec_ts2) {
  var sec = Math.floor((msec_ts2 - msec_ts1) / 1000);
  var hours = Math.floor(sec / 3600);
  sec = sec % 3600;
  var minutes = Math.floor(sec / 60);
  sec = sec % 60;
  output = "";
  if (hours > 0) {
    output = output + zero_pad_digit(hours) + ":"
  }
  if (hours > 0 || minutes > 0) {
    output = output + zero_pad_digit(minutes) + ":"
  }
  output = output + zero_pad_digit(sec);
  if (hours == 0 && minutes == 0) {
    output = output + " sec";
  }
  return output;
}
function update_current_time () {
  var p_current_time = document.getElementById('current-time');
  p_current_time.innerHTML = format_time(new Date());
  window.setTimeout(update_current_time, 1000);
}
function CommuteTimer()
{
  var commutetimer = {
    support_data_version: 0,
    data: {},
    timer_handle: -1,
    div_main_status: document.getElementById('main-status'),
    div_main_subtext: document.getElementById('main-subtext'),
    div_commute_status: document.getElementById('commute-status'),
    span_start_time: document.getElementById('start-time'),
    span_elapsed_time: document.getElementById('elapsed-time'),
    div_transit_mode_buttons: document.getElementById('transit-mode-buttons'),
    div_commute_tools: document.getElementById('commute-tools'),
    btn_arrive: document.getElementById('btn-arrive'),
    btn_abandon: document.getElementById('btn-abandon'),

    timer: function () {},

    update_start_time: function () {
      if (this.data.commute_started) {
        var start_time = this.data.legs[0].start;
        var date_obj = new Date(start_time);
        this.span_start_time.innerHTML = format_time(date_obj);
      }
    },

    update_elapsed_time: function () {
      if (this.data.commute_started) {
        var start_time = this.data.legs[0].start;
        this.span_elapsed_time.innerHTML = format_difference(start_time, now());
      }
    },

    update_leg_mode: function () {
      if (this.data.commute_started) {
        var mode = this.data.legs[this.data.legs.length-1].mode;
        if (mode == "wait") {
          this.set_status("Just waiting...");
        } else {
          this.set_status("En route via " + mode);
        }
      }
    },

    update_leg_elapsed_time: function () {
      if (this.data.commute_started) {
        var leg_start_time = this.data.legs[this.data.legs.length-1].start;
        this.set_subtext("for " + format_difference(leg_start_time, now()));
      }
    },

    set_status: function (status) {
      if (status) {
        this.data.status_message = status;
      }
      this.div_main_status.innerHTML = this.data.status_message;
    },

    set_subtext: function (subtext) {
      if (subtext) {
        this.data.subtext = subtext;
      }
      this.div_main_subtext.innerHTML = this.data.subtext;
    },

    start_commute: function () {
      this.data.commute_started = true;
      this.update_start_time();
      this.show_status();
    },
    arrive_commute: function () {
      this.data.commute_started = false;
      window.clearTimeout(this.timer_handle);
      this.set_status("You are arrived");
      this.set_subtext("Remember to Have a nice Day");
      this.btn_arrive.value = "Reset";
      var parent = this;
      this.btn_arrive.onclick = function () {
        parent.abandon_commute();
      };
      this.btn_abandon.disabled = true;
    },

    transit_mode_click_handler: function (mode) {
      console.log("click handler for " + mode);
      window.clearTimeout(this.timer_handle);

      this.data.legs.push({
        mode : mode,
        start : now()
      });

      if (!this.data.commute_started) {
        this.start_commute();
      }
      this.timer();
      this.freeze_state();
    },

    establish_transit_mode_click_handlers: function () {
      var parent = this;
      var mode_elems = this.div_transit_mode_buttons.children;
      for (var i=0;i<mode_elems.length;i++)
      {
        mode_elems[i].onclick = function (ev) {
          parent.transit_mode_click_handler(this.value);
        };
      }
    },

    show_status: function() {
      this.div_commute_status.hidden = false;
      this.div_commute_tools.hidden = false;
    },

    hide_status: function () {
      this.div_commute_status.hidden = true;
      this.div_commute_tools.hidden = true;
    },
    reset_state: function () {
      this.data = {
        data_version: 0,
        commute_started: false,
        status_message: "Haven't started yet",
        subtext: "Press one of the transit mode buttons below to start timing your commute",
        legs: [],
      };
      window.clearTimeout(this.timer_handle);
      var parent = this;
      this.btn_abandon.disabled = false;
      this.btn_abandon.onclick = function () {
        parent.abandon_commute();
      };
      this.btn_arrive.value = "Arrival";
      this.btn_arrive.onclick = function () {
        parent.arrive_commute();
      };
      this.hide_status();
    },
    thaw_state: function () {
      if (supportLocalStorage())
      {
        try {
          var fdata = JSON.parse(window.localStorage["commutetimer_data"]);
          if (fdata && 'data_version' in fdata && this.support_data_version == fdata['data_version'])
          {
            console.log("Found data in localStorage, thawing state");
            // copy the state in, this may be a bad idea
            if (fdata["commute_started"])
            {
              this.data = fdata;
              this.start_commute();
              this.timer();
            }
          }
        } catch (e) {
          console.log("thaw_state error thrown: "  + e);
        }
      }
    },

    freeze_state: function () {
      if (supportLocalStorage())
      {
        window.localStorage["commutetimer_data"] = JSON.stringify(this.data);
      }
    },

    abandon_commute: function () {
      console.log("abandoning current commute");
      if (supportLocalStorage())
      {
        window.localStorage.removeItem("commutetimer_data");
      }

      this.reset_state();
      this.set_status();
      this.set_subtext();
    }
  };
  commutetimer.timer = function () {
    commutetimer.update_elapsed_time();
    commutetimer.update_leg_mode();
    commutetimer.update_leg_elapsed_time();
    commutetimer.timer_handle = window.setTimeout(commutetimer.timer, 1000);
  };
  commutetimer.reset_state();
  commutetimer.establish_transit_mode_click_handlers();
  commutetimer.thaw_state();
  return commutetimer;
}
window.onload = function () {
  var timer_tab_controller = CommuteTimer();
  update_current_time();
}
