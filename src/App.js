
import React from 'react';
import PropTypes from 'prop-types';
import texasStateGeoJSON from './cb_2019_us/cb_2019_us_state_20m.geojson';
import texasCountyGeoJSON from './cb_2019_us/cb_2019_us_county_20m.geojson';
import electionStyle from './light-google-map-style.json';
import Tabletop from 'tabletop';
import {isMobile} from 'react-device-detect';

console.log(process.env);

var earlyVoteDict = null;

const formStyle = {
  width: '100%',
  textAlign: 'center',
};

const mapStyle = {
  height: isMobile ? '480px' : '640px',
  width: '100%',
};



class Map extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      map: null,
      googleData: null,
      buildDictNotDone: true,
      selectUpdate: true,
      selectedOption: 'votes',
    }
  }

  getGoogleMaps() {
    // If we haven't already defined the promise, define it
    if (!this.googleMapsPromise) {
      this.googleMapsPromise = new Promise((resolve) => {
        // Add a global handler for when the API finishes loading
        window.resolveGoogleMapsPromise = () => {
          // Resolve the promise
          const google = window.google;
          resolve(google);
          // Tidy up
          delete window.resolveGoogleMapsPromise;
        };

        // Load the Google Maps API
        var script = document.createElement("script");
        console.log("API", process.env.REACT_APP_GOOGLE_API_KEY); 
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&callback=resolveGoogleMapsPromise`;
        script.async = true;
        document.body.appendChild(script);
      });
    }

    // Return a promise for the Google Maps API
    return this.googleMapsPromise;
  }

  componentWillMount() {
    Tabletop.init({
      key: process.env.REACT_APP_GOOGLE_SHEETS_KEY,
      wanted: ['Sheet1'],
      callback: googleData => {
        this.setState({ googleData: googleData }); 
      },
      simpleSheet: true,
    });
    this.getGoogleMaps();
  }

  componentDidMount() {
    this.getGoogleMaps().then((google) => {

      var location = {lat: 30.9686, lng:-99.9018};

      let map: google.maps.Map;

      var electionStyledMapType = new google.maps.StyledMapType (electionStyle, {name: 'Texas County Map'});

      var zoom = isMobile ? 5 : 6;

      var mapOptions = {
        zoom: zoom, 
        minZoom: zoom,
        maxZoom: zoom,
        center: location,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        draggable: false,
        gestureHandling: 'none',
        mapTypeControl: false,
        styled: electionStyle,
      };

      map = new google.maps.Map(document.getElementById('map'), mapOptions);
      map.mapTypes.set('texas_county_map', electionStyledMapType);
      map.setMapTypeId('texas_county_map');

      map.data.loadGeoJson(texasCountyGeoJSON);

      this.setState({ map: map });
    });
  }

  buildDictionary() {
    const { map, googleData } = this.state;
    earlyVoteDict = {}; 
    googleData.map(function(row) {
      earlyVoteDict[row.County.toLowerCase()] = { votes: row['Cumulative In-Person And Mail Voters'], registered: row['Registered Voters'], turnout2016: row['2016 Total Turnout'] };
    });
    this.setState({ buildDictNotDone: false }); 
  }

  fillInMap() {
    const { map, selectedOption } = this.state;

    map.data.setStyle(function(feature) {
      var name = feature.getProperty('NAME');
      var denominator;
      if(selectedOption === 'votes') {
        denominator = 500000;
      } else if(selectedOption === 'registered') {
        denominator = Number(earlyVoteDict[name.toLowerCase()].registered.replace(',',''));
      } else if(selectedOption === 'turnout2016') {
        denominator = Number(earlyVoteDict[name.toLowerCase()].turnout2016.replace(',',''));
      }
      var numerator = Number(earlyVoteDict[name.toLowerCase()].votes.replace(',',''));
      var percentage = parseFloat(100 - (parseFloat(numerator/denominator)*50)).toFixed(0)+"%";
      var color = "hsl(240, 100%," + percentage + ")";
      return {
        fillColor: color,
        strokeWeight: 1.5,  
        fillOpacity: 1.0,
      }
    });

    const infowindow = new google.maps.InfoWindow();
   
    google.maps.event.clearListeners(map.data, 'click'); 
    google.maps.event.clearListeners(map.data, 'mouseover'); 
    google.maps.event.clearListeners(map.data, 'mouseout'); 

    map.data.addListener("click", (event) => {
      var name = event.feature.getProperty("NAME");
      infowindow.close();
      infowindow.setPosition(event.latLng);
      var displayValue = "";
      var numerator = Number(earlyVoteDict[name.toLowerCase()].votes.replace(',',''));
      var denominator; 
      var votesStr = earlyVoteDict[name.toLowerCase()].votes + ' votes';
      if(selectedOption === 'votes') {
      } else if(selectedOption === 'registered') {
        denominator = Number(earlyVoteDict[name.toLowerCase()].registered.replace(',',''));
        displayValue += parseFloat((parseFloat(numerator/denominator)*100)).toFixed(0)+"%";
        displayValue += ', ';
      } else if(selectedOption === 'turnout2016') {
        denominator = Number(earlyVoteDict[name.toLowerCase()].turnout2016.replace(',',''));
        displayValue += parseFloat((parseFloat(numerator/denominator)*100)).toFixed(0)+"%";
        displayValue += ', ';
      }
      displayValue += votesStr;
      infowindow.setContent(name.bold() + ": " + displayValue);
      infowindow.open(map); 
    });

    map.data.addListener("mouseover", (event) => {
      var name = event.feature.getProperty("NAME");
      infowindow.close();
      infowindow.setPosition(event.latLng);
      var displayValue = "";
      var numerator = Number(earlyVoteDict[name.toLowerCase()].votes.replace(',',''));
      var denominator; 
      var votesStr = earlyVoteDict[name.toLowerCase()].votes + ' votes';
      if(selectedOption === 'votes') {
      } else if(selectedOption === 'registered') {
        denominator = Number(earlyVoteDict[name.toLowerCase()].registered.replace(',',''));
        displayValue += parseFloat((parseFloat(numerator/denominator)*100)).toFixed(0)+"%";
        displayValue += ', ';
      } else if(selectedOption === 'turnout2016') {
        denominator = Number(earlyVoteDict[name.toLowerCase()].turnout2016.replace(',',''));
        displayValue += parseFloat((parseFloat(numerator/denominator)*100)).toFixed(0)+"%";
        displayValue += ', ';
      }
      displayValue += votesStr;
      infowindow.setContent(name.bold() + ": " + displayValue);
      infowindow.open(map); 
    });

    map.data.addListener("mouseout", (event) => {
      map.data.revertStyle();
      infowindow.close();
    });

  }

  handleOptionChange(event) {
    const selectedOption = event.target.value;
    this.setState({ selectedOption: selectedOption });
  }
  componentDidUpdate() {
    const { googleData, buildDictNotDone } = this.state;
    if(googleData) {
      if (googleData.length === 255) {
        if(buildDictNotDone) {
          this.buildDictionary(); 
        }
        this.fillInMap();
      }
    }
  }

 calculateCountdown(endDate) {
    let diff = (Date.parse(new Date(endDate)) - Date.parse(new Date())) / 1000;

    // clear countdown when date is reached
    if (diff <= 0) return false;

    const timeLeft = {
      years: 0,
      days: 0,
      hours: 0,
      min: 0,
      sec: 0,
      millisec: 0,
    };

    // calculate time difference between now and expected date
    if (diff >= (365.25 * 86400)) { // 365.25 * 24 * 60 * 60
      timeLeft.years = Math.floor(diff / (365.25 * 86400));
      diff -= timeLeft.years * 365.25 * 86400;
    }
    if (diff >= 86400) { // 24 * 60 * 60
      timeLeft.days = Math.floor(diff / 86400);
      diff -= timeLeft.days * 86400;
    }
    if (diff >= 3600) { // 60 * 60
      timeLeft.hours = Math.floor(diff / 3600);
      diff -= timeLeft.hours * 3600;
    }
    if (diff >= 60) {
      timeLeft.min = Math.floor(diff / 60);
      diff -= timeLeft.min * 60;
    }
    timeLeft.sec = diff;

    return timeLeft;
  }

  render () {
    const { map, selectedOption } = this.state;
    var electionDay = new Date(2020, 10, 2); 
    var timeLeft = this.calculateCountdown(electionDay); 
    return (
      <div id="map-container">
        <h1 style={formStyle} >Early Voting Data by Texas County</h1>
        <h4 style={formStyle} >There are {timeLeft.days} days left until Election Day</h4>
        <div id="form" style={formStyle} className="form">
          <form>
            <div onChange={this.handleOptionChange.bind(this)} className="form-check">
              <label htmlFor="totalVotes">
                <input
                  id="totalVotes"
                  type="radio"
                  name="totalVotes"
                  value="votes"
                  checked={selectedOption === 'votes'}
                  onChange={this.handleOptionChange.bind(this)}
                  className="form-check-input"
                />
                Total mail-in and in-person votes
              </label>
            </div>
            <div onChange={this.handleOptionChange.bind(this)} className="form-check">
              <label htmlFor="percentageRegistered">
                <input
                  id="facility-label"
                  type="radio"
                  name="percentageRegistered"
                  value="registered"
                  checked={selectedOption === 'registered'}
                  onChange={this.handleOptionChange.bind(this)}
                  className="form-check-input"
                />
                Votes as percentage of registered voters
              </label>
            </div>
            <div></div>
            <div onChange={this.handleOptionChange.bind(this)} className="form-check">
              <label htmlFor="percentage2016">
                <input
                  id="percentage2016"
                  type="radio"
                  name="percentage2016"
                  value="turnout2016"
                  checked={selectedOption === 'turnout2016'}
                  onChange={this.handleOptionChange.bind(this)}
                  className="form-check-input"
                />
                Votes as percentatge of 2016 turnout
              </label>
            </div>
          </form>
        </div>
        <div id="map" style={mapStyle} className="map"></div>
        <div id="data" style={formStyle} className="data">
          <p>The data used for this project was made available by the Texas Secretary of State:</p>
          <p><a href="https://earlyvoting.texas-election.com/Elections/getElectionDetails.do">https://earlyvoting.texas-election.com/Elections/getElectionDetails.do</a></p>
        </div>
      </div>
    );
  }
}

export default Map;
