/** @jsx React.DOM */

var LIFE_IN_YEARS = 120;

function $(s) { return document.querySelector(s); }

// Returns ISO 8601 week number and year
Date.prototype.getFullWeek = function() {
  var d = new Date(this), y = d.getFullYear(), wday = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - wday); // set to nearest Thursday
  var jan1 = new Date(y, 0, 1), w, day = 864e5; // one day in milliseconds
  w = Math.ceil((((d - jan1) / day) + 1) / 7); // full weeks to nearest Thursday
  if (!w) w = getWeeksInYear(y -= 1); // 1999-01-01 is 1998W53, for instance
  return { y: y, w: w, toISOWeek: function() { return y + 'W' + w; } };
};

// Returns ISO 8601 week number
Date.prototype.getWeek = function() {
  return this.getFullWeek().w;
};

function getWeeksInYear(y) {
  return new Date(y, 11, 28).getFullWeek().w;
}

// 2000-01-01 = 1999W52 => 1999W52
// 2003-12-31 = 2003W53 => 2004W1, since 2003 technically only has 52 full weeks
function normalizeToWeek(date) {
  if (typeof date == 'string') {
    var d = getLocalDate(date);
    if (isNaN(d)) // given a yearless relative date like 'W2', for instance
      return d;
    else
      date = d;
  }
  var week = date.getFullWeek();
  var year = week.y;
  var maxw = getWeeksInYear(year);
  return week.w > maxw ? (year + 1) + 'W1' : week.toISOWeek();
}

function getLocalDate(date) {
  var tz = (new Date + '').split(' ').pop();
  return new Date(date + ' ' + tz);
}

var WeekCal = React.createClass({
  render: function() {
    var bday = getLocalDate(this.props.from);
    var week = bday.getFullWeek();
    var y = week.y, w = week.w;
    var now = (new Date).getFullWeek();

    var wpy = getWeeksInYear(y), age = 0, weeks = 0;
    var trs = [], tds = [getAgeHeader(0)];
    if (w > 1) tds.push(<td colSpan={ w - 1 }/>);

    function getAgeHeader(age) {
      var id = 'age-' + age;
      return <th id={ id }><a href={ '#' + id }>{ age }</a></th>;
    }

    // same-closure bookkeeping utility destructive on y, w, age, wpy, trs & tds
    function addYear() {
      var id = 'year-' + y;
      if (!trs.length || y % 5 === 0) {
        if (wpy !== 53) tds.push(<td/>); // pad out non-existent week 53
        tds.push(<th><a href={ '#' + id }>{ y }</a></th>);
      }
      trs.push(<tr id={ id }>{ tds }</tr>);
      w = 1;
      y += 1;
      tds = [getAgeHeader(age += 1)];
      wpy = getWeeksInYear(y);
    }

    var lastBG, lastTitle = '';
    while (age <= this.props.lifespan) {
      weeks += 1;
      var id = 'week-' + y + '-' + w;
      var checked = y < now.y || y == now.y && w <= now.w;

      var style = null;
      var event = events[y + 'W' + w] || dates['W' + weeks];
      var title = event;

      var color = /^([\d-]{10}: )?(#[\da-f]{3,6}): (.*)/i.exec(event || '');
      if (color) {
        var p = color[1];
        title = lastTitle = color[3];
        color = lastBG = color[2];
        if (p) {
          lastTitle = '';
          title = p + title;
        }
      } else if (event)
        color = 'red'
      else
        color = lastBG;
      var style = color && { background: color, outline: '1px solid ' + color};

      title = title || (lastTitle ? lastTitle + ': ' : '') + 'Week ' + weeks;

      tds.push(<td id={ id } style={ style }>
        <input type="checkbox" checked={ checked } title={ title }/>
      </td>);
      if (y === now.y && w === now.w) {
        console.log('This is week ' + weeks);
      }
      if (w === wpy)
        addYear();
      else
        w += 1;
    }

    return <table id={ 'cal' || this.props.id }>{ trs }</table>;
  }
});

function isURL(u) {
  return /^https?:\/\//i.test(u);
}

function isYYYYMMDD(date) {
  return /^\d{4}-\d\d-\d\d$/.test(date || '');
}

// inits from the global window.dates, or an url hash override JSON blob, or url
function init() {
  var hash = location.hash.slice(1);

  // if we set a #YYYY-MM-DD date in the URL hash, let it win
  var yyyymmdd = isYYYYMMDD(hash) && hash;

  try {
    var json = JSON.parse(hash);
    dates = json;
  } catch(e) {
    try {
      var decoded = decodeURIComponent(hash);
      json = JSON.parse(decoded);
      dates = json;
    } catch(e) {
      window.dates = window.dates || {};
    }
  }

  var url = isURL(hash) ? hash : isURL(decoded) ? decoded : false;
  if (url) // drop your json at http://myjson.com/ or anywhere with CORS headers
    fetch(url).then(function(xhr) {
      xhr.json().then(function(data) {
        render(window.dates = data);
      })
    });
  else
    render(window.dates, yyyymmdd);
}

function render(dates, yyyymmdd) {
  // otherwise, start at the first event or today
  var today = (new Date).toISOString().split('T')[0];
  var first = today; for (first in dates) break;

  date.value = yyyymmdd || first;

  events = {};
  for (var d in dates) {
    if (isYYYYMMDD(d))
      events[normalizeToWeek(d)] = d +': '+ dates[d];
  }

  // just draw next ten years, if today
  var life = date.value === today ? 10 : LIFE_IN_YEARS;

  cal = React.render(
    <WeekCal id="cal" lifespan={ life } from={ date.value }/>, parent
  );

  date.addEventListener('change', function() {
    cal.setProps({ from: date.value, lifespan: LIFE_IN_YEARS });
    location.hash = '#' + date.value;
  });
}

var parent = $('#calendar'), date = $('#bday'), cal;
var hash = location.hash.slice(1), events;

init();
