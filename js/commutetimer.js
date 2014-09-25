function Localism(key, locale) {
  /* base_strings fallback when there is no specific
   * translation, use these for the basis of translation */
  base_strings = {
    app_name: "CommuteTimer",
    arrival_text: "You are arrived",
    arrival_subtext: "Remember to have a nice day",
    been_commuting: "Been commuting for",
    btn_abandon: "Abandon",
    btn_arrive: "Arrival",
    btn_reset: "Reset",
    data_tab: "Datar",
    en_route: "En route via",
    prestart_text: "Haven't started yet",
    prestart_subtext: "Press one of the transit mode buttons below to start timing your commute",
    default_modes: [
      ['walk', 'walking', 'on foot'],
      ['bike', 'biking', 'pedaling'],
      ['bus', 'riding', 'on the bus'],
      ['rail', 'riding', 'on the train'],
      ['light rail', 'riding', 'light railing'],
      ['drive', 'driving', 'en route via automobile'],
      ['skate', 'skating', 'shreading'],
      ['wait', 'waiting', 'counting the seconds']
    ],
    settings_tab: "Settings",
    setting_str_label: "label",
    setting_str_verb: "verb",
    setting_str_phrase: "phrase",
    setting_str_up: "up",
    setting_str_down: "down",
    started_at: "Started at",
    str_for: "for",
    timer_tab: "Timer"
  };
  return base_strings[key];
}
function static_localize() {
  /* called once the DOM is constructed to replace
   * span elements prefixed with loc_ with their localized
   * equivalents */
  var spans = document.getElementsByTagName("span");
  for(var i=0; i<spans.length; i++) {
    if(spans[i].id && spans[i].id.indexOf('loc_') == 0) {
        var key = spans[i].id.slice(4);
        console.log("localizing " + key);
        spans[i].innerHTML = Localism(key);
    }
  }
}
function supportLocalStorage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}
function now () {
  /* return the unix timestamp (in millis) corresponding to right now (browser time) */
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
  /* format a human readable time (H:M:S) given a js date object */
  return zero_pad_digit(date_obj.getHours()) + ":" +
         zero_pad_digit(date_obj.getMinutes()) + ":" +
         zero_pad_digit(date_obj.getSeconds());
}

function format_difference(msec_ts1, msec_ts2) {
  /* format a human readable time interval (H:M:S) from 2 millisecond timestamps */
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
  /* 'recursively' called function to update the current-time span each second to 
   * simulate a ticking clock */
  var p_current_time = document.getElementById('current-time');
  p_current_time.innerHTML = format_time(new Date());
  window.setTimeout(update_current_time, 1000);
}
function CommuteTimer(settings)
{
  /* CommuteTimer constructor, given a settings object, return the main controller for the 
   * timer portion of the app */
  var commutetimer = {
    support_data_version: 0,
    data: {},
    timer_handle: -1,       // for canceling the loop
    div_main_status: document.getElementById('main-status'),
    div_main_subtext: document.getElementById('main-subtext'),
    div_commute_status: document.getElementById('commute-status'),
    span_start_time: document.getElementById('start-time'),
    span_elapsed_time: document.getElementById('elapsed-time'),
    div_transit_mode_buttons: document.getElementById('transit-mode-buttons'),
    div_commute_tools: document.getElementById('commute-tools'),
    table_commute_legs: document.getElementById('commute-legs'),
    btn_arrive: document.getElementById('btn-arrive'),
    btn_abandon: document.getElementById('btn-abandon'),

    timer: function () {},

    /* The following update_* functions take information from this.data
     * and update the associated DOM element
     * These functions are usually called on timer update, but
     * can be triggered by user events */

    update_start_time: function () {            // called once per commute to update the start time
      if (this.data.commute_started) {
        var start_time = this.data.legs[0].start;
        var date_obj = new Date(start_time);
        this.span_start_time.innerHTML = format_time(date_obj);
      }
    },

    update_elapsed_time: function () {          // called each second or so to simulate ticking
      if (this.data.commute_started) {
        var start_time = this.data.legs[0].start;
        this.span_elapsed_time.innerHTML = format_difference(start_time, now());
      }
    },

    update_leg_mode: function () {              // called when the mode of transportation is changed
      if (this.data.commute_started) {
        var mode = this.data.legs[this.data.legs.length-1].mode;
        var modeline = this.settings.mode_map[mode];
        if (modeline) {
          this.set_status(modeline[2]);
        } else {
          this.set_status(Localism("en_route") + " " + mode);
        }
      }
    },

    update_leg_elapsed_time: function () {      // called each second or so to simulate ticking
      if (this.data.commute_started) {
        var leg_start_time = this.data.legs[this.data.legs.length-1].start;
        var mode = this.data.legs[this.data.legs.length-1].mode;
        var modeline = this.settings.mode_map[mode];
        var subtext = "";
        if (modeline) {
          subtext = subtext + modeline[1] + " ";
        }
        subtext = subtext +
                  Localism("str_for") + " " +
                  format_difference(leg_start_time, now());
        this.set_subtext(subtext);
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

    set_status: function (status) {             // update the main bold message
      if (status) {
        this.data.status_message = status;
      }
      this.div_main_status.innerHTML = this.data.status_message;
    },

    set_subtext: function (subtext) {           // update the smaller info message
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
      /* called to graciously end the commute, save data and update text 
       * to indicate arrival.
       * also updates the button labels to reflect the options to the user
       * after 'arriving' */
      this.transit_mode_click_handler("arrive");
      this.data.commute_started = false;
      this.freeze_state();      // make sure we don't keep the commute going 
      window.clearTimeout(this.timer_handle);
      this.set_status(Localism("arrival_text"));
      this.set_subtext(Localism("arrival_subtext"));
      //
      // after arriving, the arrive button becomes a reset
      this.btn_arrive.value = Localism("btn_reset");
      var parent = this;
      this.btn_arrive.onclick = function () {
        parent.abandon_commute();       // the data is already saved, so abandon == reset
      };
      this.btn_abandon.disabled = true;
    },

    transit_mode_click_handler: function (mode) {
      /* onclick handler for all transit mode buttons.
       *  - start the commute if not started
       *  - save time of click
       *  - update table of previous legs
       *  - persist state
       *  - (re)start timer */
      console.log("click handler for " + mode);
      window.clearTimeout(this.timer_handle);

      this.data.legs.push({
        mode : mode,
        start : now()
      });

      if (!this.data.commute_started) {
        this.start_commute();
      } else {
        // add the previous leg to the table
        this.append_prev_leg();
      }

      this.timer();
      this.freeze_state();
    },

    reset_state: function () {
      /* initialize app to default state / clear data */
      this.data = {
        data_version: 0,
        commute_started: false,
        status_message: Localism("prestart_text"),
        subtext: Localism("prestart_subtext"),
        legs: [],
      };
      window.clearTimeout(this.timer_handle);
      var parent = this;
      this.btn_abandon.disabled = false;
      this.btn_abandon.value = Localism("btn_abandon");
      this.btn_abandon.onclick = function () {
        parent.abandon_commute();
      };
      this.btn_arrive.value = Localism("btn_arrive");
      this.btn_arrive.onclick = function () {
        parent.arrive_commute();
      };
      this.table_commute_legs.innerHTML = "";
      this.hide_status();
    },

    /* the following three functions build the leg table, which shows
     * all prior modes of transportation used in this commute */
    append_prev_leg: function ()
    {
      var prev_leg = this.data.legs[this.data.legs.length-2]
      this.append_table_leg(prev_leg.mode,
                            format_time(new Date(prev_leg.start)),
                            format_difference(prev_leg.start, now()));
    },
    append_table_leg: function (mode, start_time, duration)
    {
      var row = this.table_commute_legs.insertRow(this.table_commute_legs.rows.length);
      var mode_cell = row.insertCell(0);
      mode_cell.innerHTML = mode;
      var start_time_cell = row.insertCell(1);
      start_time_cell.innerHTML = start_time;
      var duration_cell = row.insertCell(2);
      duration_cell.innerHTML = duration;
    },
    thaw_rebuild_leg_table: function ()
    {
      for (var i=0;i<this.data.legs.length-1;i++)
      {
        var leg = this.data.legs[i];
        var next_leg = this.data.legs[i+1];
        this.append_table_leg(leg.mode,
                              format_time(new Date(leg.start)),
                              format_difference(leg.start, next_leg.start));
      }
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
              this.thaw_rebuild_leg_table();
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
    /* function is defined outside of the instance to avoid circular dep.
     * problems */
    commutetimer.update_elapsed_time();
    commutetimer.update_leg_mode();
    commutetimer.update_leg_elapsed_time();
    commutetimer.timer_handle = window.setTimeout(commutetimer.timer, 1000);
  };
  commutetimer.settings = settings;
  commutetimer.reset_state();
  // set up click handlers for transit mode buttons
  for (var i=0;i<settings.modes.length;i++)
  {
    var elem = document.createElement("input");
    elem.type = "button";
    elem.value = settings.modes[i][0];
    elem.className = "btn btn-mode";
    elem.onclick = function (ev) {
      commutetimer.transit_mode_click_handler(this.value);
    };
    commutetimer.div_transit_mode_buttons.appendChild(elem);
  }
  // restore potential state from localStorage
  commutetimer.thaw_state();
  return commutetimer;
}
function SettingsHandler() {
  var settingshandler = {
    settings_version: 0,
    modes: Localism("default_modes"),
    mode_map: {},
    table_mode_table: document.getElementById("mode-table"),
    populate_mode_table: function () {
      var table = this.table_mode_table;
      table.innerHTML = "";
      for (var i=0;i<this.modes.length;i++)
      {
        var row = table.insertRow(table.rows.length)
        var label = document.createElement("input");
        label.type = "text";
        label.value = this.modes[i][0];
        var verb = document.createElement("input");
        verb.type = "text";
        verb.value = this.modes[i][1];
        var phrase = document.createElement("input");
        phrase.type = "text";
        phrase.value = this.modes[i][2];
        var up = document.createElement("a");
        up.innerHTML = "&#x25B2;";
        up.onclick = function () {
          var row = this.parentNode.parentNode,
              sibling = row.previousElementSibling,
              parent = row.parentNode;

          parent.insertBefore(row, sibling);
        }
        var down = document.createElement("a");
        down.innerHTML = "&#x25BC;"
        down.onclick = function () {
          var row = this.parentNode.parentNode,
              sibling = row.nextElementSibling,
              parent = row.parentNode;
          if (sibling) {
            if (!sibling.nextElementSibling) {
              // why doesn't javascript have an insertAfter?
              parent.appendChild(row);
              return;
            } else {
              sibling = sibling.nextElementSibling;
            }
          } else {
            // wraparound on last row
            sibling = parent.children[0];
          }
          parent.insertBefore(row, sibling);
        }
        var cell = row.insertCell(0);
        cell.appendChild(label);
        cell = row.insertCell(1);
        cell.appendChild(verb);
        cell = row.insertCell(2);
        cell.appendChild(phrase);
        cell = row.insertCell(3);
        cell.appendChild(up);
        cell = row.insertCell(4);
        cell.appendChild(down);
      }
    },
    thaw_settings: function () {
      if (supportLocalStorage())
      {
        try {
          var fsettings = JSON.parse(window.localStorage["commutetimer_settings"]);
          if (fsettings && 'settings_version' in fsettings && this.settings_version >= settings['settings_version'])
          {
            console.log("Found settings in localStorage, thawing");
            // copy the state in, this may be a bad idea
            for (var key in fsettings)
            {
              this[key] = fsettings[key];
            }
          }
        } catch (e) {
          console.log("thaw_settings error thrown: "  + e);
        }
      }
    },
    freeze_settings: function () {
      if (supportLocalStorage())
      {
        window.localStorage["commutetimer_settings"] = JSON.stringify(this);
      }
    },
  };
  settingshandler.thaw_settings();
  settingshandler.populate_mode_table();
  // create a lookup map keyed on mode name
  for (var i=0;i<settingshandler.modes.length;i++) {
    settingshandler.mode_map[settingshandler.modes[i][0]] = settingshandler.modes[i];
  }
  return settingshandler;
}
function Navigator() {
  var nav = {
    pages : {
      timer: document.getElementById('timer-page'),
      data: document.getElementById('data-page'),
      settings: document.getElementById('settings-page')
    },
    links : {
      timer: document.getElementById('timer-link'),
      data: document.getElementById('data-link'),
      settings: document.getElementById('settings-link')
    },
    current_tab: undefined,
    change_tab: function (to) {
      if (to == this.current_tab) {
        return;
      }
      var prev_page = document.getElementById(this.current_tab + "-page");
      var prev_link = document.getElementById(this.current_tab + "-link");
      var next_page = document.getElementById(to + "-page");
      var next_link = document.getElementById(to + "-link");
      if (prev_page) {
          prev_page.hidden = true;
      }
      if (prev_link) {
          prev_link.classList.remove("active");
      }
      if (next_page) {
          next_page.hidden = false;
      }
      if (next_link) {
          next_link.classList.add("active");
      }
      this.current_tab = to;
      window.location.hash = "#" + to;
    }
  };

  // hide all pages at the start
  for (var page in nav.pages) {
      nav.pages[page].hidden = true;
  }

  // set hash change listener for navigation links
  window.onhashchange = function () {
    var target = window.location.hash.substr(1);
    nav.change_tab(target);
  };

  return nav;
}
window.onload = function () {
  var settings_controller = SettingsHandler();
  var timer_tab_controller = CommuteTimer(settings_controller);
  nav = Navigator()
  // resume to the proper location
  if (window.location.hash) {
      nav.change_tab(window.location.hash.substr(1));
  } else {
      // default to timer tab
      nav.change_tab("timer");
  }
  update_current_time();
  static_localize();
}
